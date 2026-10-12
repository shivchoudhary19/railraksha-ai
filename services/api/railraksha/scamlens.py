import re
import uuid
from datetime import UTC, datetime
from typing import Annotated, Literal
from urllib.parse import urlsplit

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from railraksha.auth import Principal, current_user
from railraksha.dependencies import database
from railraksha.normalization import redact
from railraksha.registry_models import Indicator, OfficialAsset
from railraksha.scamlens_models import ScamAnalysis

Database = Annotated[AsyncSession, Depends(database)]
router = APIRouter(prefix="/v1", tags=["scamlens"])

URL_PATTERN = re.compile(r"https?://[^\s<>\"]+", re.IGNORECASE)
PHONE_PATTERN = re.compile(r"(?:\+91[\-\s]?|91[\-\s]?|0)?[6-9]\d{9}\b")
UPI_PATTERN = re.compile(r"\b[a-zA-Z0-9.\-_]{2,64}@[a-zA-Z]{2,32}\b")
OTP_KEYWORDS = [
    "otp",
    "one time password",
    "pin",
    "upi pin",
    "verification code",
    "ओटीपी",
    "पिन",
    "पासवर्ड",
    "कोड",
]
REMOTE_ACCESS_APPS = [
    "anydesk",
    "teamviewer",
    "rustdesk",
    "quicksupport",
    "any desk",
    "टीमव्यूअर",
    "एनीडेस्क",
]
URGENCY_KEYWORDS = [
    "urgent",
    "immediately",
    "within 24 hours",
    "suspended",
    "blocked",
    "cancelled",
    "last chance",
    "act now",
    "तुरंत",
    "अंतिम मौका",
    "ब्लॉक",
    "निलंबित",
]
REFUND_KEYWORDS = [
    "refund",
    "ticket refund",
    "cancelled ticket",
    "fare return",
    "रिफंड",
    "पैसे वापस",
]
JOB_KEYWORDS = [
    "railway job",
    "rrb recruitment",
    "appointment letter",
    "vacancy",
    "joining fee",
    "रेलवे नौकरी",
    "भर्ती",
    "नियुक्ति",
]
UPI_COLLECT_KEYWORDS = [
    "enter pin to receive",
    "receive money",
    "collect request",
    "approve payment to get",
    "पैसे पाने के लिए पिन",
]


class RedFlag(BaseModel):
    snippet: str
    reason_en: str
    reason_hi: str
    severity: Literal["critical", "high", "medium", "low"]


class ExtractedEntities(BaseModel):
    urls: list[str] = Field(default_factory=list)
    phones: list[str] = Field(default_factory=list)
    upis: list[str] = Field(default_factory=list)


class MessageAnalysisResult(BaseModel):
    id: uuid.UUID
    category: str
    category_title_en: str
    category_title_hi: str
    risk_score: int
    verdict: Literal["safe", "suspicious", "dangerous"]
    entities: ExtractedEntities
    red_flags: list[RedFlag]
    ai_generated_hint: bool
    explanation_en: str
    explanation_hi: str
    safe_steps_en: list[str]
    safe_steps_hi: list[str]
    redacted_preview: str
    created_at: datetime


class MessageAnalysisInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    text: str = Field(min_length=5, max_length=10000)
    save_report: bool = False


class EmailAnalysisInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    from_header: str = Field(min_length=3, max_length=255)
    reply_to: str | None = Field(default=None, max_length=255)
    subject: str = Field(min_length=1, max_length=500)
    body: str = Field(min_length=5, max_length=20000)
    spf_result: Literal["pass", "fail", "softfail", "none"] | None = None
    dkim_result: Literal["pass", "fail", "none"] | None = None
    dmarc_result: Literal["pass", "fail", "none"] | None = None


class EmailAnalysisResult(BaseModel):
    verdict: Literal["safe", "suspicious", "dangerous"]
    risk_score: int
    display_name_spoofed: bool
    domain_mismatch: bool
    auth_failures: list[str]
    red_flags: list[RedFlag]
    explanation_en: str
    explanation_hi: str


class EmergencyStep(BaseModel):
    order: int
    title_en: str
    title_hi: str
    action_en: str
    action_hi: str
    contact: str | None = None
    urgent: bool = True


def extract_entities(text: str) -> ExtractedEntities:
    urls = [m.group(0).rstrip(".,)") for m in URL_PATTERN.finditer(text)]
    phones = [m.group(0) for m in PHONE_PATTERN.finditer(text)]
    upis = [m.group(0) for m in UPI_PATTERN.finditer(text)]
    return ExtractedEntities(urls=urls, phones=phones, upis=upis)


async def analyze_message_content(
    db: AsyncSession, raw_text: str
) -> tuple[
    str,
    str,
    str,
    int,
    Literal["safe", "suspicious", "dangerous"],
    list[RedFlag],
    bool,
    str,
    str,
    list[str],
    list[str],
]:
    lower_text = raw_text.lower()
    entities = extract_entities(raw_text)
    red_flags: list[RedFlag] = []
    score = 0
    category = "general_inquiry"
    cat_en = "General Communication"
    cat_hi = "सामान्य संदेश"

    # Check OTP theft
    has_otp = any(kw in lower_text for kw in OTP_KEYWORDS)
    if has_otp:
        score += 65
        category = "otp_theft"
        cat_en = "Credential / OTP Theft"
        cat_hi = "OTP / पासवर्ड चोरी"
        red_flags.append(
            RedFlag(
                snippet="OTP / PIN requested",
                reason_en=(
                    "Genuine railway systems and banks never ask passengers for their OTP or PIN."
                ),
                reason_hi="रेलवे या बैंक कभी भी यात्रियों से उनका OTP या पिन नहीं मांगते।",
                severity="critical",
            )
        )

    # Check Remote Access application prompt
    has_remote = any(kw in lower_text for kw in REMOTE_ACCESS_APPS)
    if has_remote:
        score += 70
        category = "remote_access"
        cat_en = "Remote Access Tool Scam"
        cat_hi = "रिमोट एक्सेस ऐप धोखा"
        red_flags.append(
            RedFlag(
                snippet="Remote software prompted (AnyDesk/TeamViewer)",
                reason_en=(
                    "Scammers trick victims into installing screen-sharing tools "
                    "to drain bank accounts."
                ),
                reason_hi="धोखेबाज स्क्रीन-शेयरिंग ऐप डाउनलोड करवाकर बैंक खाते खाली करते हैं।",
                severity="critical",
            )
        )

    # Check UPI collect deception
    has_upi_collect = any(kw in lower_text for kw in UPI_COLLECT_KEYWORDS)
    if has_upi_collect:
        score += 70
        category = "upi_collect"
        cat_en = "UPI Collect Request Fraud"
        cat_hi = "UPI कलेक्ट रिक्वेस्ट फ्रॉड"
        red_flags.append(
            RedFlag(
                snippet="UPI PIN needed to receive funds",
                reason_en=(
                    "You never need to enter your UPI PIN to receive money. "
                    "PIN is only for sending money."
                ),
                reason_hi="पैसे प्राप्त करने के लिए कभी UPI पिन नहीं डालना होता।",
                severity="critical",
            )
        )

    # Check Refund bait
    has_refund = any(kw in lower_text for kw in REFUND_KEYWORDS)
    if has_refund and (has_otp or entities.urls or entities.phones or has_upi_collect):
        score += 35
        if category == "general_inquiry":
            category = "refund_scam"
            cat_en = "Fake Railway Ticket Refund"
            cat_hi = "जाली टिकट रिफंड फ्रॉड"
        red_flags.append(
            RedFlag(
                snippet="Refund link or claim",
                reason_en=(
                    "IRCTC refunds are automatically credited to the original source "
                    "account without extra links."
                ),
                reason_hi="IRCTC रिफंड बिना किसी बाहरी लिंक के अपने आप मूल खाते में जमा होता है।",
                severity="high",
            )
        )

    # Check Job recruitment bait
    has_job = any(kw in lower_text for kw in JOB_KEYWORDS)
    if has_job:
        score += 45
        if category == "general_inquiry":
            category = "job_recruitment"
            cat_en = "Fake Railway Job Offer"
            cat_hi = "रेलवे भर्ती / नौकरी झांसा"
        red_flags.append(
            RedFlag(
                snippet="Direct appointment / fee demand",
                reason_en=(
                    "Railway recruitment happens strictly through official RRB/RRC "
                    "websites and national exams."
                ),
                reason_hi="रेलवे भर्ती केवल आधिकारिक RRB/RRC वेबसाइटों और परीक्षाओं द्वारा होती है।",
                severity="high",
            )
        )

    # Check artificial urgency
    has_urgency = any(kw in lower_text for kw in URGENCY_KEYWORDS)
    if has_urgency:
        score += 25
        red_flags.append(
            RedFlag(
                snippet="Urgent deadline or account block threat",
                reason_en="Artificial urgency is used to force victims into hurried decisions.",
                reason_hi="जल्दबाजी करवाकर गलती कराने के लिए दबाव बनाया जा रहा है।",
                severity="medium",
            )
        )

    # Cross-reference extracted URLs with Registry and Indicators
    for u in entities.urls:
        parts = urlsplit(u)
        host = parts.hostname or ""
        scam_ind = await db.scalar(
            select(Indicator).where(
                Indicator.normalized_value.in_([u, host]),
                Indicator.verdict == "known_scam",
            )
        )
        if scam_ind:
            score += 60
            red_flags.append(
                RedFlag(
                    snippet=u,
                    reason_en="Embedded link matches a confirmed scam indicator.",
                    reason_hi="संदेश में दिया गया लिंक धोखाधड़ी डेटाबेस में दर्ज है।",
                    severity="critical",
                )
            )

        asset = await db.scalar(
            select(OfficialAsset).where(
                OfficialAsset.normalized_value.in_([u, host]),
                OfficialAsset.status == "verified",
            )
        )
        if asset:
            score = max(0, score - 30)

    # AI-generated stylometry heuristic (overly polite, formulaic structure)
    ai_hint = False
    if len(raw_text) > 80 and (
        "dear valued" in lower_text
        or "kindly note" in lower_text
        or "regards, support team" in lower_text
    ):
        ai_hint = True

    final_score = min(100, max(0, score))
    if final_score >= 65:
        verdict: Literal["safe", "suspicious", "dangerous"] = "dangerous"
        exp_en = (
            "Critical fraud indicators detected. High probability of phishing or financial theft."
        )
        exp_hi = "गंभीर धोखाधड़ी के संकेत मिले। वित्तीय नुकसान का भारी जोखिम है।"
        steps_en = [
            "Do NOT click any links in this message.",
            "Do NOT share OTP, UPI PIN, or bank credentials.",
            "Block and report the sender on WhatsApp/SMS.",
            "If you already sent money, call helpline 1930 immediately.",
        ]
        steps_hi = [
            "इस संदेश में दिए गए किसी भी लिंक पर क्लिक न करें।",
            "OTP, UPI पिन या बैंक विवरण कभी साझा न करें।",
            "प्रेषक को तुरंत ब्लॉक और रिपोर्ट करें।",
            "पैसे कटने पर तुरंत 1930 पर कॉल करें।",
        ]
    elif final_score >= 30:
        verdict = "suspicious"
        exp_en = "Suspicious signals present. Proceed with extreme caution."
        exp_hi = "संदिग्ध संकेत मिले हैं। अत्यधिक सतर्कता बरतें।"
        steps_en = [
            "Verify claims independently through the official IRCTC app or 139.",
            "Check the sender's authentic number in the RailRaksha Registry.",
        ]
        steps_hi = [
            "आधिकारिक IRCTC ऐप या 139 डायल करके पुष्टि करें।",
            "प्रेषक के नंबर की RailRaksha रजिस्ट्री में जाँच करें।",
        ]
    else:
        verdict = "safe"
        cat_en = "Standard Message"
        cat_hi = "सामान्य संदेश"
        exp_en = "No immediate scam or phishing indicators identified."
        exp_hi = "कोई तत्काल धोखाधड़ी संकेत नहीं मिला।"
        steps_en = [
            "Remember to keep passwords and UPI PINs private at all times.",
        ]
        steps_hi = [
            "पासवर्ड और UPI पिन हमेशा सुरक्षित रखें।",
        ]

    return (
        category,
        cat_en,
        cat_hi,
        final_score,
        verdict,
        red_flags,
        ai_hint,
        exp_en,
        exp_hi,
        steps_en,
        steps_hi,
    )


# --- Endpoints ---


@router.post("/scamlens/analyze", response_model=MessageAnalysisResult)
async def analyze_message_endpoint(
    payload: MessageAnalysisInput,
    db: Database,
    user: Annotated[Principal | None, Depends(current_user)] = None,
) -> MessageAnalysisResult:
    entities = extract_entities(payload.text)
    (
        category,
        cat_en,
        cat_hi,
        score,
        verdict,
        red_flags,
        ai_hint,
        exp_en,
        exp_hi,
        steps_en,
        steps_hi,
    ) = await analyze_message_content(db, payload.text)

    analysis_id = uuid.uuid4()
    if payload.save_report:
        record = ScamAnalysis(
            id=analysis_id,
            category=category,
            risk_score=score,
            verdict=verdict,
            extracted_urls=entities.urls,
            extracted_entities=entities.model_dump(),
            red_flags=[f.model_dump() for f in red_flags],
            language="hi" if any("\u0900" <= c <= "\u097f" for c in payload.text) else "en",
            owner=user.subject if user else None,
        )
        db.add(record)
        await db.commit()

    return MessageAnalysisResult(
        id=analysis_id,
        category=category,
        category_title_en=cat_en,
        category_title_hi=cat_hi,
        risk_score=score,
        verdict=verdict,
        entities=entities,
        red_flags=red_flags,
        ai_generated_hint=ai_hint,
        explanation_en=exp_en,
        explanation_hi=exp_hi,
        safe_steps_en=steps_en,
        safe_steps_hi=steps_hi,
        redacted_preview=redact(payload.text[:300]),
        created_at=datetime.now(UTC),
    )


@router.post("/scamlens/analyze-email", response_model=EmailAnalysisResult)
async def analyze_email_endpoint(
    payload: EmailAnalysisInput,
) -> EmailAnalysisResult:
    score = 0
    red_flags: list[RedFlag] = []
    auth_failures: list[str] = []
    spoofed = False
    mismatch = False

    # Check SPF / DKIM / DMARC
    if payload.spf_result in {"fail", "softfail"}:
        score += 30
        auth_failures.append(f"SPF {payload.spf_result}")
    if payload.dkim_result == "fail":
        score += 30
        auth_failures.append("DKIM fail")
    if payload.dmarc_result == "fail":
        score += 40
        auth_failures.append("DMARC fail")

    # Check display name spoofing
    from_header = payload.from_header.lower()
    email_match = re.search(r"<([^>]+)>", from_header)
    email_addr = email_match.group(1).strip() if email_match else from_header.strip()
    is_official_domain = (
        email_addr.endswith("@irctc.co.in")
        or email_addr.endswith(".gov.in")
        or email_addr.endswith("@indianrailways.gov.in")
        or email_addr.endswith("@cris.org.in")
    )
    if ("irctc" in from_header or "railway" in from_header) and not is_official_domain:
        spoofed = True
        score += 55
        red_flags.append(
            RedFlag(
                snippet=payload.from_header,
                reason_en=(
                    "Sender uses 'IRCTC' or 'Railway' display name but does not "
                    "send from official domain."
                ),
                reason_hi="ईमेल में रेलवे नाम का उपयोग किया गया है लेकिन यह आधिकारिक डोमेन से नहीं भेजा गया।",
                severity="critical",
            )
        )

    # Reply-to mismatch
    if payload.reply_to:
        reply_to_clean = payload.reply_to.lower().strip()
        reply_match = re.search(r"<([^>]+)>", reply_to_clean)
        reply_addr = reply_match.group(1).strip() if reply_match else reply_to_clean
        if reply_addr not in from_header and reply_addr != email_addr:
            mismatch = True
            score += 25
            red_flags.append(
                RedFlag(
                    snippet=payload.reply_to,
                    reason_en="Reply-To header diverts replies away from the apparent sender.",
                    reason_hi="उत्तर (Reply-To) अलग पते पर भेजा जा रहा है।",
                    severity="high",
                )
            )

    final_score = min(100, max(0, score))
    if final_score >= 65:
        verdict: Literal["safe", "suspicious", "dangerous"] = "dangerous"
        exp_en = "High probability of spoofed email impersonating railway administration."
        exp_hi = "रेलवे प्रशासन के नाम पर जाली ईमेल होने का भारी जोखिम है।"
    elif final_score >= 30:
        verdict = "suspicious"
        exp_en = "Authentication or header discrepancies detected."
        exp_hi = "ईमेल प्रमाणीकरण या हेडर में विसंगतियां पाई गईं।"
    else:
        verdict = "safe"
        exp_en = "Sender authentication parameters consistent."
        exp_hi = "प्रेषक प्रमाणीकरण सामान्य पाया गया।"

    return EmailAnalysisResult(
        verdict=verdict,
        risk_score=final_score,
        display_name_spoofed=spoofed,
        domain_mismatch=mismatch,
        auth_failures=auth_failures,
        red_flags=red_flags,
        explanation_en=exp_en,
        explanation_hi=exp_hi,
    )


@router.get("/scamlens/emergency-checklist", response_model=list[EmergencyStep])
async def emergency_checklist_endpoint() -> list[EmergencyStep]:
    return [
        EmergencyStep(
            order=1,
            title_en="Golden Hour: Call National Cybercrime Helpline 1930",
            title_hi="गोल्डन ऑवर: राष्ट्रीय साइबर हेल्पलाइन 1930 पर तुरंत कॉल करें",
            action_en=(
                "Call 1930 within the first 1–2 hours. The police nodal officer can "
                "freeze fraudulent transactions before money is withdrawn."
            ),
            action_hi=(
                "धोखाधड़ी के तुरंत 1–2 घंटे में 1930 पर डायल करें। पुलिस नोडल अधिकारी "
                "पैसे निकाले जाने से पहले लेन-देन फ्रीज करवा सकते हैं।"
            ),
            contact="1930",
            urgent=True,
        ),
        EmergencyStep(
            order=2,
            title_en="Freeze UPI & Block Debit/Credit Cards",
            title_hi="UPI ब्लॉक करें और बैंक कार्ड तुरंत बंद करें",
            action_en=(
                "Open your mobile banking app or call customer support to immediately "
                "block card transactions and disable UPI."
            ),
            action_hi="अपने बैंक ऐप या हेल्पलाइन द्वारा कार्ड ब्लॉक करें और UPI लेन-देन रोकें।",
            urgent=True,
        ),
        EmergencyStep(
            order=3,
            title_en="Lodge Formal Complaint on National Portal",
            title_hi="राष्ट्रीय पोर्टल पर औपचारिक शिकायत दर्ज करें",
            action_en=(
                "Visit cybercrime.gov.in and submit transaction IDs, screenshots, "
                "and bank statements."
            ),
            action_hi="cybercrime.gov.in पर जाएँ और लेन-देन संदर्भ, स्क्रीनशॉट व बैंक स्टेटमेंट जमा करें।",
            contact="https://cybercrime.gov.in",
            urgent=True,
        ),
        EmergencyStep(
            order=4,
            title_en="Report Suspicious Mobile Number to Sanchar Saathi",
            title_hi="संदिग्ध मोबाइल नंबर की संचार साथी (चक्षु) पर रिपोर्ट करें",
            action_en=(
                "Report fraudulent calls or SMS messages on the official Chakshu "
                "portal to initiate telecom suspension."
            ),
            action_hi="फ़ोन नंबर को ब्लॉक कराने के लिए आधिकारिक चक्षु (Chakshu) पोर्टल पर रिपोर्ट करें।",
            contact="https://sancharsaathi.gov.in/sfc/",
            urgent=False,
        ),
        EmergencyStep(
            order=5,
            title_en="Change Online Banking & Email Passwords",
            title_hi="नेट बैंकिंग और ईमेल पासवर्ड बदलें",
            action_en=(
                "Update all passwords from a known secure device and enable "
                "Two-Factor Authentication (2FA)."
            ),
            action_hi="सुरक्षित डिवाइस से नेट बैंकिंग और ईमेल के पासवर्ड बदलें और टू-फैक्टर प्रमाणीकरण चालू करें।",
            urgent=False,
        ),
    ]
