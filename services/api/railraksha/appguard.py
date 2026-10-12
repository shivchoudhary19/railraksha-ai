import hashlib
import io
import re
import uuid
import zipfile
from datetime import UTC, datetime
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from railraksha.auth import Principal, current_user
from railraksha.dependencies import database
from railraksha.registry_models import Indicator, OfficialAsset

Database = Annotated[AsyncSession, Depends(database)]
router = APIRouter(prefix="/v1", tags=["appguard"])

MAX_APK_SIZE = 150 * 1024 * 1024  # 150 MB
MAX_ZIP_ENTRIES = 50000

OFFICIAL_RAILWAY_PACKAGES: dict[str, dict[str, str]] = {
    "cris.org.in.prs.ima": {
        "name": "IRCTC Rail Connect",
        "publisher": "IRCTC Official (CRIS)",
        "play_url": "https://play.google.com/store/apps/details?id=cris.org.in.prs.ima",
    },
    "com.cris.uts": {
        "name": "UTS on Mobile",
        "publisher": "Centre for Railway Information Systems (CRIS)",
        "play_url": "https://play.google.com/store/apps/details?id=com.cris.uts",
    },
    "cris.org.in.ntes": {
        "name": "NTES (National Train Enquiry System)",
        "publisher": "Centre for Railway Information Systems (CRIS)",
        "play_url": "https://play.google.com/store/apps/details?id=cris.org.in.ntes",
    },
    "com.railmadad": {
        "name": "RailMadad",
        "publisher": "Indian Railways (CRIS)",
        "play_url": "https://play.google.com/store/apps/details?id=com.railmadad",
    },
}

DANGEROUS_PERMISSIONS: dict[str, dict[str, str]] = {
    "android.permission.READ_SMS": {
        "severity": "critical",
        "title_en": "Reads Incoming SMS / OTP",
        "title_hi": "इनकमिंग SMS और OTP पढ़ सकता है",
        "reason_en": "Used by banking trojans to silently intercept bank and railway OTPs.",
        "reason_hi": "बैंकिंग ट्रोजन द्वारा गुप्त रूप से बैंक व रेलवे OTP चुराने के लिए उपयोग किया जाता है।",
    },
    "android.permission.RECEIVE_SMS": {
        "severity": "critical",
        "title_en": "Intercepts SMS Broadcasts",
        "title_hi": "SMS प्रसारण को इंटरसेप्ट करता है",
        "reason_en": "Allows the app to hide incoming transaction SMS alerts from the victim.",
        "reason_hi": "उपयोगकर्ता को बैंक लेन-देन का संदेश दिखाई देने से पहले छुपा सकता है।",
    },
    "android.permission.SEND_SMS": {
        "severity": "high",
        "title_en": "Sends Background SMS",
        "title_hi": "बैकग्राउंड में SMS भेज सकता है",
        "reason_en": (
            "Can send premium rate SMS or initiate unauthorized mobile banking registrations."
        ),
        "reason_hi": "प्रीमियम दर पर संदेश भेजकर मोबाइल बैंकिंग रजिस्टर कर नुकसान पहुँचा सकता है।",
    },
    "android.permission.BIND_ACCESSIBILITY_SERVICE": {
        "severity": "critical",
        "title_en": "Full Accessibility Service Hijacking",
        "title_hi": "पूरी एक्सेसिबिलिटी सेवा का नियंत्रण",
        "reason_en": (
            "Enables screen scraping, keylogging, and automatic approval of fund transfers."
        ),
        "reason_hi": "स्क्रीन गतिविधि देखना, कीस्ट्रोक रिकॉर्ड करना और ऑटो-ट्रांसफर संभव बनाता है।",
    },
    "android.permission.SYSTEM_ALERT_WINDOW": {
        "severity": "high",
        "title_en": "Overlay Display Window (Draw Over Other Apps)",
        "title_hi": "अन्य ऐप्स के ऊपर ओवरले स्क्रीन दिखाना",
        "reason_en": (
            "Creates fake login overlays on top of genuine banking and IRCTC apps to steal "
            "credentials."
        ),
        "reason_hi": "असली IRCTC या बैंक ऐप के ऊपर जाली लॉगिन स्क्रीन बनाकर क्रेडेंशियल चुराता है।",
    },
    "android.permission.BIND_DEVICE_ADMIN": {
        "severity": "high",
        "title_en": "Device Administrator Rights",
        "title_hi": "डिवाइस एडमिनिस्ट्रेटर अधिकार",
        "reason_en": "Prevents normal uninstallation and allows remote locking or factory reset.",
        "reason_hi": "ऐप को सामान्य रूप से अनइंस्टॉल होने से रोकता है।",
    },
    "android.permission.RECORD_AUDIO": {
        "severity": "medium",
        "title_en": "Microphone Audio Recording",
        "title_hi": "ऑडियो रिकॉर्डिंग",
        "reason_en": (
            "Can capture private conversations and ambient audio without visual indicator."
        ),
        "reason_hi": "बिना स्पष्ट सूचना के आस-पास की आवाज़ें रिकॉर्ड कर सकता है।",
    },
    "android.permission.READ_CONTACTS": {
        "severity": "medium",
        "title_en": "Contact Book Harvesting",
        "title_hi": "संपर्क सूची पढ़ना",
        "reason_en": (
            "Harvester for blackmail or secondary phishing campaigns against family and friends."
        ),
        "reason_hi": "परिजनों व मित्रों को फ़िशिंग संदेश भेजने के लिए संपर्क चुरा सकता है।",
    },
}


# --- Schemas ---


class PermissionIndicator(BaseModel):
    permission: str
    severity: Literal["critical", "high", "medium", "low"]
    title_en: str
    title_hi: str
    reason_en: str
    reason_hi: str


class SuspiciousIndicator(BaseModel):
    category: str
    title_en: str
    title_hi: str
    detail_en: str
    detail_hi: str
    severity: Literal["critical", "high", "medium", "low"]


class AppScanResult(BaseModel):
    id: uuid.UUID
    app_name: str
    package_name: str
    version_name: str | None = None
    file_sha256: str | None = None
    file_size_bytes: int | None = None
    cert_fingerprint_sha256: str | None = None
    risk_score: int
    verdict: Literal["safe", "suspicious", "dangerous"]
    is_official_match: bool
    dangerous_permissions: list[PermissionIndicator]
    suspicious_indicators: list[SuspiciousIndicator]
    explanation_en: str
    explanation_hi: str
    safe_steps_en: list[str]
    safe_steps_hi: list[str]
    created_at: datetime


class PackageCheckInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    identifier: str = Field(min_length=3, max_length=500)


class DeviceCheckupInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    platform: Literal["android", "ios", "windows", "macos"]
    screen_lock: bool
    sideloading_disabled: bool
    play_protect_active: bool
    os_updated: bool
    dangerous_permissions_checked: bool
    remote_access_absent: bool
    backup_enabled: bool


class DeviceRemediationStep(BaseModel):
    order: int
    severity: Literal["critical", "high", "medium", "info"]
    title_en: str
    title_hi: str
    action_en: str
    action_hi: str


class DeviceCheckupResult(BaseModel):
    safety_score: int
    status: Literal["optimal", "moderate_risk", "critical_risk"]
    summary_en: str
    summary_hi: str
    remediation_steps: list[DeviceRemediationStep]


class OfficialAppInfo(BaseModel):
    name: str
    package_name: str
    publisher: str
    play_url: str
    verified: bool = True


# --- Helper Logic ---


def extract_package_from_identifier(identifier: str) -> str:
    cleaned = identifier.strip()
    if "id=" in cleaned:
        m = re.search(r"[?&]id=([a-zA-Z0-9_\.]+)", cleaned)
        if m:
            return m.group(1)
    return cleaned.lower()


def parse_manifest_strings(manifest_bytes: bytes) -> tuple[str, list[str]]:
    """Extract ASCII/UTF-8 strings from binary AndroidManifest.xml string pool."""
    text_content = re.sub(rb"[^\x20-\x7E]", b" ", manifest_bytes).decode("latin1", errors="ignore")
    found_permissions: list[str] = []
    for perm in DANGEROUS_PERMISSIONS:
        if perm in text_content or perm.split(".")[-1] in text_content:
            found_permissions.append(perm)

    pkg_match = re.search(r"package\s*=\s*[\"']([a-zA-Z0-9_\.]+)[\"']", text_content)
    if not pkg_match:
        words = [w for w in text_content.split() if "." in w and len(w) > 6]
        for w in words:
            if re.match(r"^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z0-9_]+)+$", w):
                if not w.startswith("android.") and not w.startswith("schemas."):
                    return w, found_permissions

    pkg_name = pkg_match.group(1) if pkg_match else "unknown.package"
    return pkg_name, found_permissions


async def evaluate_app_safety(
    db: AsyncSession,
    package_name: str,
    app_name: str,
    permissions: list[str],
    cert_sha256: str | None = None,
    file_bytes: bytes | None = None,
) -> tuple[
    int,
    Literal["safe", "suspicious", "dangerous"],
    bool,
    list[PermissionIndicator],
    list[SuspiciousIndicator],
    str,
    str,
    list[str],
    list[str],
]:
    score = 0
    perm_indicators: list[PermissionIndicator] = []
    susp_indicators: list[SuspiciousIndicator] = []
    is_official = False

    # 1. Check Official Registry
    official_asset = await db.scalar(
        select(OfficialAsset).where(
            OfficialAsset.kind == "app",
            OfficialAsset.normalized_value == package_name,
            OfficialAsset.status == "verified",
        )
    )
    if official_asset or package_name in OFFICIAL_RAILWAY_PACKAGES:
        is_official = True
        return (
            0,
            "safe",
            True,
            [],
            [],
            "Verified official railway application publisher.",
            "सत्यापित आधिकारिक रेलवे एप्लिकेशन।",
            ["Safe to use. Always update via official Google Play / App Store."],
            ["उपयोग के लिए सुरक्षित। हमेशा आधिकारिक ऐप स्टोर से अपडेट करें।"],
        )

    # 2. Check Known Scam Indicators
    scam_ind = await db.scalar(
        select(Indicator).where(
            Indicator.kind == "app",
            Indicator.normalized_value == package_name,
            Indicator.verdict == "known_scam",
        )
    )
    if scam_ind:
        score += 80
        susp_indicators.append(
            SuspiciousIndicator(
                category="blocklist_match",
                title_en="Known Fraudulent App Indicator",
                title_hi="धोखाधड़ी डेटाबेस में दर्ज ऐप",
                detail_en="This package is recorded in the RailRaksha cybercrime scam database.",
                detail_hi="यह ऐप पैकेज रेलरक्षा साइबर अपराध डेटाबेस में दर्ज है।",
                severity="critical",
            )
        )

    # 3. Typosquatting / Brand impersonation in Package or App Name
    lower_pkg = package_name.lower()
    lower_app = app_name.lower()
    brand_keywords = ["irctc", "tatkal", "cris", "railway", "uts", "ntes", "railmadad"]
    has_brand = any(k in lower_pkg or k in lower_app for k in brand_keywords)

    if has_brand and not is_official:
        score += 45
        susp_indicators.append(
            SuspiciousIndicator(
                category="brand_impersonation",
                title_en="Unverified Railway Brand Impersonation",
                title_hi="अनाधिकृत रेलवे ब्रांड नकल",
                detail_en=(
                    f"App references railway trademarks ('{package_name}') but does not originate "
                    "from official Centre for Railway Information Systems (CRIS) signatures."
                ),
                detail_hi="ऐप में रेलवे नाम का उपयोग है लेकिन यह अधिकृत CRIS द्वारा जारी नहीं है।",
                severity="critical",
            )
        )

    # 4. Dangerous Permissions Evaluation
    for perm in permissions:
        info = DANGEROUS_PERMISSIONS.get(perm)
        if info:
            if info["severity"] == "critical":
                score += 35
            elif info["severity"] == "high":
                score += 20
            else:
                score += 10
            perm_indicators.append(
                PermissionIndicator(
                    permission=perm,
                    severity=info["severity"],  # type: ignore[arg-type]
                    title_en=info["title_en"],
                    title_hi=info["title_hi"],
                    reason_en=info["reason_en"],
                    reason_hi=info["reason_hi"],
                )
            )

    # 5. Tatkal Auto-Booker / Bot Strings inspection if bytes provided
    if file_bytes:
        raw_text = file_bytes.lower()
        if b"tatkal" in raw_text and (b"autofill" in raw_text or b"autoclick" in raw_text):
            score += 40
            susp_indicators.append(
                SuspiciousIndicator(
                    category="tatkal_bot",
                    title_en="Illegal Tatkal Automation Bot Script",
                    title_hi="अवैध तत्काल ऑटोमेशन बॉट स्क्रिप्ट",
                    detail_en=(
                        "Contains automated Tatkal booking scripts in violation of Railway Acts "
                        "and IRCTC Terms of Service."
                    ),
                    detail_hi="रेलवे अधिनियम व IRCTC सेवा शर्तों का उल्लंघन करने वाली बॉट स्क्रिप्ट मौजूद है।",
                    severity="high",
                )
            )

    final_score = min(100, max(0, score))
    if final_score >= 65:
        verdict: Literal["safe", "suspicious", "dangerous"] = "dangerous"
        exp_en = (
            "Critical threat detected. High likelihood of fake banking trojan, SMS OTP stealer, "
            "or malicious railway look-alike application."
        )
        exp_hi = "अति संवेदनशील ख़तरा मिला। जाली बैंकिंग ट्रोजन या OTP चुराने वाले ऐप का भारी जोखिम है।"
        steps_en = [
            "Immediately uninstall this application from your device.",
            "Do NOT grant Accessibility, Overlay, or SMS permissions.",
            "Change mobile banking passwords and UPI PINs from another secure device.",
            "File a formal report on cybercrime.gov.in and Sanchar Saathi.",
        ]
        steps_hi = [
            "इस ऐप को तुरंत अपने फोन से अनइंस्टॉल करें।",
            "एक्सेसिबिलिटी या SMS अनुमति कभी न दें।",
            "दूसरे सुरक्षित फोन से तुरंत अपने नेट बैंकिंग और UPI पिन बदलें।",
            "cybercrime.gov.in पर रिपोर्ट दर्ज करें।",
        ]
    elif final_score >= 30:
        verdict = "suspicious"
        exp_en = "Suspicious signals found. Unverified railway app with excessive permissions."
        exp_hi = "संदिग्ध संकेत मिले। अनावश्यक अनुमतियों वाला गैर-सत्यापित ऐप।"
        steps_en = [
            "Verify the application publisher on Google Play Store before using.",
            "Never grant SMS or Accessibility permissions to third-party travel tools.",
        ]
        steps_hi = [
            "उपयोग से पहले गूगल प्ले स्टोर पर प्रकाशक की प्रामाणिकता जाँचें।",
            "किसी भी बाहरी यात्रा ऐप को SMS या एक्सेसिबिलिटी अनुमति न दें।",
        ]
    else:
        verdict = "safe"
        exp_en = "No immediate malware or aggressive permissions detected."
        exp_hi = "कोई आक्रामक अनुमति या ट्रोजन संकेत नहीं मिला।"
        steps_en = ["Always download apps only from verified app stores."]
        steps_hi = ["हमेशा केवल अधिकृत ऐप स्टोर से ही ऐप डाउनलोड करें।"]

    return (
        final_score,
        verdict,
        is_official,
        perm_indicators,
        susp_indicators,
        exp_en,
        exp_hi,
        steps_en,
        steps_hi,
    )


# --- Endpoints ---


@router.post("/appguard/check-package", response_model=AppScanResult)
async def check_package_endpoint(
    payload: PackageCheckInput,
    db: Database,
    user: Annotated[Principal | None, Depends(current_user)] = None,
) -> AppScanResult:
    pkg = extract_package_from_identifier(payload.identifier)
    app_name = OFFICIAL_RAILWAY_PACKAGES.get(pkg, {}).get("name", pkg)

    (
        score,
        verdict,
        is_official,
        perms,
        susp,
        exp_en,
        exp_hi,
        steps_en,
        steps_hi,
    ) = await evaluate_app_safety(db, pkg, app_name, [])

    return AppScanResult(
        id=uuid.uuid4(),
        app_name=app_name,
        package_name=pkg,
        version_name="1.0.0",
        risk_score=score,
        verdict=verdict,
        is_official_match=is_official,
        dangerous_permissions=perms,
        suspicious_indicators=susp,
        explanation_en=exp_en,
        explanation_hi=exp_hi,
        safe_steps_en=steps_en,
        safe_steps_hi=steps_hi,
        created_at=datetime.now(UTC),
    )


@router.post("/appguard/scan-apk", response_model=AppScanResult)
async def scan_apk_endpoint(
    file: Annotated[UploadFile, File(...)],
    db: Database,
    user: Annotated[Principal | None, Depends(current_user)] = None,
) -> AppScanResult:
    content = await file.read()
    if len(content) > MAX_APK_SIZE:
        raise HTTPException(status_code=413, detail="APK exceeds maximum size limit (150 MB).")

    file_sha256 = hashlib.sha256(content).hexdigest()
    app_name = file.filename or "uploaded.apk"
    package_name = "unknown.application"
    found_permissions: list[str] = []

    try:
        with zipfile.ZipFile(io.BytesIO(content)) as z:
            if len(z.infolist()) > MAX_ZIP_ENTRIES:
                raise HTTPException(status_code=400, detail="Excessive archive entries detected.")

            if "AndroidManifest.xml" in z.namelist():
                manifest_bytes = z.read("AndroidManifest.xml")
                pkg, perms = parse_manifest_strings(manifest_bytes)
                if pkg != "unknown.package":
                    package_name = pkg
                found_permissions.extend(perms)
    except zipfile.BadZipFile:
        # Not a valid zip/apk
        raise HTTPException(
            status_code=400, detail="Uploaded file is not a valid APK archive format."
        ) from None

    (
        score,
        verdict,
        is_official,
        perm_indicators,
        susp_indicators,
        exp_en,
        exp_hi,
        steps_en,
        steps_hi,
    ) = await evaluate_app_safety(
        db, package_name, app_name, found_permissions, file_bytes=content[:500000]
    )

    return AppScanResult(
        id=uuid.uuid4(),
        app_name=app_name,
        package_name=package_name,
        version_name="APK Upload",
        file_sha256=file_sha256,
        file_size_bytes=len(content),
        risk_score=score,
        verdict=verdict,
        is_official_match=is_official,
        dangerous_permissions=perm_indicators,
        suspicious_indicators=susp_indicators,
        explanation_en=exp_en,
        explanation_hi=exp_hi,
        safe_steps_en=steps_en,
        safe_steps_hi=steps_hi,
        created_at=datetime.now(UTC),
    )


@router.get("/appguard/official-apps", response_model=list[OfficialAppInfo])
async def list_official_apps_endpoint() -> list[OfficialAppInfo]:
    return [
        OfficialAppInfo(
            name=data["name"],
            package_name=pkg,
            publisher=data["publisher"],
            play_url=data["play_url"],
            verified=True,
        )
        for pkg, data in OFFICIAL_RAILWAY_PACKAGES.items()
    ]


@router.post("/appguard/device-checkup", response_model=DeviceCheckupResult)
async def device_checkup_endpoint(
    payload: DeviceCheckupInput,
) -> DeviceCheckupResult:
    score = 100
    steps: list[DeviceRemediationStep] = []
    order = 1

    if not payload.screen_lock:
        score -= 25
        steps.append(
            DeviceRemediationStep(
                order=order,
                severity="critical",
                title_en="Enable Device Screen Lock (PIN / Fingerprint)",
                title_hi="स्क्रीन लॉक (पिन / फ़िंगरप्रिंट) सक्षम करें",
                action_en=(
                    "Go to Settings → Security → Screen Lock. Without a screen lock, "
                    "anyone can open your banking and railway apps if device is lost."
                ),
                action_hi=(
                    "सेटिंग्स → सुरक्षा → स्क्रीन लॉक पर जाएँ। बिना लॉक के खो जाने पर "
                    "कोई भी आपके बैंक या टिकट ऐप खोल सकता है।"
                ),
            )
        )
        order += 1

    if not payload.sideloading_disabled:
        score -= 25
        steps.append(
            DeviceRemediationStep(
                order=order,
                severity="critical",
                title_en="Disable 'Install from Unknown Sources'",
                title_hi="'अज्ञात स्रोत से इंस्टॉल' बंद करें",
                action_en=(
                    "Go to Settings → Apps → Special app access → Install unknown apps, "
                    "and turn off permission for Chrome, WhatsApp, and Telegram."
                ),
                action_hi=("सेटिंग्स → ऐप्स → विशेष ऐप एक्सेस में जाकर अज्ञात ऐप्स इंस्टॉल करने की अनुमति बंद करें।"),
            )
        )
        order += 1

    if not payload.play_protect_active:
        score -= 15
        steps.append(
            DeviceRemediationStep(
                order=order,
                severity="high",
                title_en="Activate Google Play Protect / App Verification",
                title_hi="Google Play Protect सुरक्षा चालू करें",
                action_en="Open Google Play Store → Profile → Play Protect → Turn on Scan apps.",
                action_hi="गूगल प्ले स्टोर → प्रोफ़ाइल → Play Protect खोलें और स्कैनिंग चालू करें।",
            )
        )
        order += 1

    if not payload.remote_access_absent:
        score -= 25
        steps.append(
            DeviceRemediationStep(
                order=order,
                severity="critical",
                title_en="Review & Uninstall Unneeded Screen-Sharing Tools",
                title_hi="अनावश्यक स्क्रीन-शेयरिंग ऐप्स हटाएं",
                action_en=(
                    "Check if AnyDesk, TeamViewer, or RustDesk are installed. If prompted "
                    "by a caller to install these, uninstall immediately."
                ),
                action_hi=(
                    "यदि किसी कॉल पर AnyDesk या TeamViewer डाउनलोड किया था, तो तुरंत अनइंस्टॉल करें।"
                ),
            )
        )
        order += 1

    if not payload.os_updated:
        score -= 10
        steps.append(
            DeviceRemediationStep(
                order=order,
                severity="medium",
                title_en="Install Latest System & Security Updates",
                title_hi="सिस्टम और सुरक्षा अपडेट इंस्टॉल करें",
                action_en="Go to Settings → System Update and download all pending patches.",
                action_hi="सेटिंग्स → सिस्टम अपडेट में जाकर सभी लंबित पैच अपडेट करें।",
            )
        )
        order += 1

    final_score = max(0, min(100, score))
    if final_score >= 80:
        status: Literal["optimal", "moderate_risk", "critical_risk"] = "optimal"
        sum_en = "Your device security posture is strong and meets digital hygiene standards."
        sum_hi = "आपकी डिवाइस सुरक्षा स्थिति मजबूत है और सुरक्षा मानकों के अनुरूप है।"
    elif final_score >= 50:
        status = "moderate_risk"
        sum_en = "Moderate risk: Several security settings require your attention."
        sum_hi = "मध्यम जोखिम: कई सुरक्षा सेटिंग्स पर ध्यान देने की आवश्यकता है।"
    else:
        status = "critical_risk"
        sum_en = "Critical risk: High vulnerability to banking trojans and unauthorized access."
        sum_hi = "गंभीर जोखिम: बैंकिंग ट्रोजन और अनधिकृत पहुंच का भारी ख़तरा है।"

    return DeviceCheckupResult(
        safety_score=final_score,
        status=status,
        summary_en=sum_en,
        summary_hi=sum_hi,
        remediation_steps=steps,
    )
