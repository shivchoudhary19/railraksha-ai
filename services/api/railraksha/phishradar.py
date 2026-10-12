import unicodedata
import uuid
from datetime import UTC, datetime
from typing import Annotated, Literal
from urllib.parse import urlsplit

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from railraksha.auth import Principal, current_user, operator_user
from railraksha.dependencies import database
from railraksha.normalization import canonical_url
from railraksha.phishradar_models import DomainMonitor, TakedownCase, UrlScan
from railraksha.registry import audit
from railraksha.registry_models import Indicator, OfficialAsset
from railraksha.ssrf import validate_url_for_scan

Database = Annotated[AsyncSession, Depends(database)]
router = APIRouter(prefix="/v1", tags=["phishradar"])

OFFICIAL_BRANDS = [
    "irctc",
    "indianrailways",
    "railmadad",
    "cris",
    "tatkal",
    "railwire",
    "uts",
    "ntes",
    "rrb",
    "rrc",
]

RISKY_TLDS = {
    "xyz",
    "top",
    "icu",
    "click",
    "work",
    "rest",
    "buzz",
    "gq",
    "cf",
    "ga",
    "ml",
    "tk",
    "zip",
    "mov",
    "cam",
    "fit",
    "surf",
}

SUSPICIOUS_KEYWORDS = [
    "tatkal",
    "refund",
    "ticket",
    "booking",
    "agent",
    "pnr",
    "cancel",
    "login",
    "otp",
    "pass",
    "quota",
    "irctc",
    "discount",
]

URL_SHORTENERS = {
    "bit.ly",
    "tinyurl.com",
    "t.co",
    "is.gd",
    "cutt.ly",
    "rb.gy",
    "shorturl.at",
}

HOMOGLYPH_MAP = {
    "а": "a",
    "с": "c",
    "е": "e",
    "о": "o",
    "р": "p",
    "х": "x",
    "у": "y",
    "і": "i",
    "ј": "j",
    "ѕ": "s",
    "ԁ": "d",
    "ԛ": "q",
    "ԝ": "w",
    "ו": "l",
}


def levenshtein_distance(s1: str, s2: str) -> int:
    if len(s1) < len(s2):
        return levenshtein_distance(s2, s1)
    if len(s2) == 0:
        return len(s1)
    previous_row = list(range(len(s2) + 1))
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row
    return previous_row[-1]


def detect_homoglyphs(text: str) -> tuple[bool, str]:
    has_homoglyphs = False
    cleaned_chars = []
    for char in text:
        if ord(char) > 127:
            normalized = unicodedata.normalize("NFKD", char)
            replacement = HOMOGLYPH_MAP.get(char, normalized)
            cleaned_chars.append(replacement)
            has_homoglyphs = True
        else:
            cleaned_chars.append(char)
    return has_homoglyphs, "".join(cleaned_chars)


class ScanFactor(BaseModel):
    code: str
    severity: Literal["critical", "high", "medium", "low", "info"]
    title_en: str
    title_hi: str
    detail_en: str
    detail_hi: str


class ScanResult(BaseModel):
    id: uuid.UUID
    target_url: str
    normalized_url: str
    domain: str
    risk_score: int
    verdict: Literal["safe", "suspicious", "dangerous"]
    factors: list[ScanFactor]
    explanation_en: str
    explanation_hi: str
    actions_en: list[str]
    actions_hi: list[str]
    created_at: datetime


class ScanInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    url: str = Field(min_length=4, max_length=2048)


class TakedownCreateInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    target_domain: str = Field(min_length=3, max_length=255)
    scan_id: uuid.UUID | None = None
    registrar: str | None = Field(default=None, max_length=255)
    evidence_summary: str = Field(min_length=10, max_length=5000)


class TakedownStatusUpdateInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    status: Literal["draft", "reported", "in_progress", "resolved"]
    note: str | None = Field(default=None, max_length=500)


class TakedownCaseOutput(BaseModel):
    id: uuid.UUID
    target_domain: str
    scan_id: uuid.UUID | None
    status: str
    registrar: str | None
    evidence_summary: str
    created_by: uuid.UUID
    created_at: datetime
    updated_at: datetime


class DomainMonitorOutput(BaseModel):
    id: uuid.UUID
    monitored_domain: str
    detected_lookalike: str
    similarity_score: float
    status: str
    source: str
    detected_at: datetime


async def analyze_url(
    db: AsyncSession, raw_url: str, user_id: uuid.UUID | None = None
) -> ScanResult:
    validate_url_for_scan(raw_url)
    normalized = canonical_url(raw_url)
    parts = urlsplit(normalized)
    host = parts.hostname or ""
    tld = host.split(".")[-1].lower() if "." in host else ""
    subdomains = host.split(".")[:-2] if len(host.split(".")) > 2 else []

    # 1. Check known indicators (reviewed scam)
    known_indicator = await db.scalar(
        select(Indicator).where(
            Indicator.normalized_value.in_([normalized, host]),
            Indicator.verdict == "known_scam",
        )
    )

    # 2. Check official asset registry
    official_asset = await db.scalar(
        select(OfficialAsset).where(
            OfficialAsset.normalized_value.in_([normalized, host]),
            OfficialAsset.status == "verified",
        )
    )

    factors: list[ScanFactor] = []
    score = 0

    if official_asset:
        factors.append(
            ScanFactor(
                code="OFFICIAL_REGISTRY",
                severity="info",
                title_en="Verified Official Asset",
                title_hi="सत्यापित आधिकारिक पहचान",
                detail_en=(
                    f"Officially registered in railway safety directory ({official_asset.label})."
                ),
                detail_hi=(f"आधिकारिक रेलवे सुरक्षा डायरेक्टरी में दर्ज है ({official_asset.label})।"),
            )
        )
        verdict: Literal["safe", "suspicious", "dangerous"] = "safe"
        risk_score = 0
    elif known_indicator:
        factors.append(
            ScanFactor(
                code="KNOWN_SCAM_INDICATOR",
                severity="critical",
                title_en="Confirmed Malicious Indicator",
                title_hi="पुष्ट धोखाधड़ी पहचान",
                detail_en="Matches a confirmed phishing/scam entry verified by analysts.",
                detail_hi="विश्लेषकों द्वारा पुष्ट किए गए धोखाधड़ी डेटाबेस में दर्ज है।",
            )
        )
        verdict = "dangerous"
        risk_score = 100
    else:
        # Heuristic & Lexical Analysis
        has_homoglyphs, deconfused = detect_homoglyphs(host)
        if has_homoglyphs:
            score += 35
            factors.append(
                ScanFactor(
                    code="HOMOGLYPH_DECEPTION",
                    severity="high",
                    title_en="IDN Homoglyph / Confusable Characters",
                    title_hi="भ्रामक वर्ण (होमोग्लिफ़)",
                    detail_en=f"Domain contains characters imitating '{deconfused}'.",
                    detail_hi=f"डोमेन में वर्ण हैं जो '{deconfused}' की नकल करते हैं।",
                )
            )

        clean_host_base = host.replace("-", "").replace(".", "").lower()
        for brand in OFFICIAL_BRANDS:
            if brand in clean_host_base:
                if host not in {"irctc.co.in", "indianrailways.gov.in", "cris.org.in"}:
                    score += 45
                    factors.append(
                        ScanFactor(
                            code="BRAND_TYPOSQUAT",
                            severity="high",
                            title_en=f"Brand Impersonation ({brand.upper()})",
                            title_hi=f"ब्रांड नकल ({brand.upper()})",
                            detail_en=(
                                f"Domain targets railway brand '{brand}' without verification."
                            ),
                            detail_hi=(f"डोमेन बिना सत्यापन के रेलवे ब्रांड '{brand}' की नकल करता है।"),
                        )
                    )
                break
            else:
                dist = levenshtein_distance(clean_host_base, brand)
                if 1 <= dist <= 2 and len(clean_host_base) >= 4:
                    score += 40
                    factors.append(
                        ScanFactor(
                            code="CLOSE_TYPOSQUAT",
                            severity="high",
                            title_en=f"Close Typosquat ({brand.upper()})",
                            title_hi=f"मिलता-जुलता नाम ({brand.upper()})",
                            detail_en=f"Domain closely resembles '{brand}' (distance {dist}).",
                            detail_hi=f"डोमेन नाम '{brand}' से बहुत अधिक मिलता-जुलता है।",
                        )
                    )
                    break

        if tld in RISKY_TLDS:
            score += 25
            factors.append(
                ScanFactor(
                    code="RISKY_TLD",
                    severity="medium",
                    title_en=f"High-Abuse Top Level Domain (.{tld})",
                    title_hi=f"जोखिम भरा डोमेन एक्सटेंशन (.{tld})",
                    detail_en=(f"Domain uses .{tld}, often associated with temporary scam setups."),
                    detail_hi=f"डोमेन .{tld} का उपयोग करता है जो अक्सर धोखाधड़ी में देखा जाता है।",
                )
            )

        if host in URL_SHORTENERS:
            score += 25
            factors.append(
                ScanFactor(
                    code="URL_SHORTENER",
                    severity="medium",
                    title_en="URL Shortener Masking",
                    title_hi="छुपा हुआ लिंक (URL Shortener)",
                    detail_en="Uses a URL shortener concealing its destination.",
                    detail_hi="लिंक शॉर्टनर का उपयोग करके गंतव्य को छुपाया गया है।",
                )
            )

        path_query = (parts.path + "?" + parts.query).lower()
        matched_keywords = [kw for kw in SUSPICIOUS_KEYWORDS if kw in path_query]
        if matched_keywords:
            score += min(30, len(matched_keywords) * 15)
            factors.append(
                ScanFactor(
                    code="SUSPICIOUS_KEYWORDS",
                    severity="medium",
                    title_en="High-Risk Keywords in URL",
                    title_hi="URL में संवेदनशील शब्द",
                    detail_en=f"Contains keywords: {', '.join(matched_keywords[:3])}.",
                    detail_hi=f"संवेदनशील शब्द शामिल हैं: {', '.join(matched_keywords[:3])}।",
                )
            )

        if len(subdomains) >= 3:
            score += 20
            factors.append(
                ScanFactor(
                    code="DEEP_SUBDOMAINS",
                    severity="low",
                    title_en="Excessive Subdomain Layering",
                    title_hi="अत्यधिक सब-डोमेन",
                    detail_en="Uses deep subdomains mimicking railway paths.",
                    detail_hi="अत्यधिक सब-डोमेन हैं जो असली रेलवे संरचना का भ्रम पैदा करते हैं।",
                )
            )

        risk_score = min(100, max(0, score))
        if risk_score >= 70:
            verdict = "dangerous"
        elif risk_score >= 30:
            verdict = "suspicious"
        else:
            verdict = "safe"

    if verdict == "dangerous":
        exp_en = "High risk of credential theft, fake ticket scam, or fraud."
        exp_hi = "पहचान चोरी, जाली टिकट या अनधिकृत भुगतान का गंभीर जोखिम है।"
        acts_en = [
            "Do NOT enter passwords, UPI PINs, OTPs, or bank details.",
            "Do NOT download software or APKs prompted by this page.",
            "Report this URL to RailRaksha and national cybercrime helpline 1930.",
        ]
        acts_hi = [
            "पासवर्ड, UPI पिन, OTP या बैंक जानकारी दर्ज न करें।",
            "इस पृष्ठ से कोई सॉफ़्टवेयर या APK डाउनलोड न करें।",
            "इस लिंक की शिकायत RailRaksha और 1930 पर करें।",
        ]
    elif verdict == "suspicious":
        exp_en = "Features characteristics frequently seen in look-alikes. Exercise caution."
        exp_hi = "संदिग्ध विशेषताएं पाई गईं। सावधानी बरतें।"
        acts_en = [
            "Verify the link on official railway apps before proceeding.",
            "Look for official gov.in or co.in authentic domain suffixes.",
            "Never share payment details on third-party links.",
        ]
        acts_hi = [
            "आगे बढ़ने से पहले आधिकारिक IRCTC ऐप पर जाँच करें।",
            "gov.in या co.in आधिकारिक डोमेन की पुष्टि करें।",
            "तीसरे पक्ष के लिंक पर कभी भुगतान न करें।",
        ]
    else:
        exp_en = "No immediate deceptive or phishing indicators detected."
        exp_hi = "कोई तत्काल भ्रामक या धोखाधड़ी संकेत नहीं मिला।"
        acts_en = [
            "Always check that the address bar displays official railway domains.",
            "Remember that genuine railway staff will never ask for your UPI PIN.",
        ]
        acts_hi = [
            "हमेशा जांचें कि एड्रेस बार में सही डोमेन है।",
            "रेलवे कर्मचारी कभी भी आपका UPI पिन नहीं मांगते।",
        ]

    scan_row = UrlScan(
        target_url=raw_url,
        normalized_url=normalized,
        domain=host,
        risk_score=risk_score,
        verdict=verdict,
        factors=[f.model_dump() for f in factors],
        scanned_by=user_id,
    )
    db.add(scan_row)
    await db.commit()
    await db.refresh(scan_row)

    return ScanResult(
        id=scan_row.id,
        target_url=scan_row.target_url,
        normalized_url=scan_row.normalized_url,
        domain=scan_row.domain,
        risk_score=scan_row.risk_score,
        verdict=verdict,
        factors=factors,
        explanation_en=exp_en,
        explanation_hi=exp_hi,
        actions_en=acts_en,
        actions_hi=acts_hi,
        created_at=scan_row.created_at,
    )


# --- Endpoints ---


@router.post("/phishradar/scan", response_model=ScanResult)
async def scan_url_endpoint(
    payload: ScanInput,
    request: Request,
    db: Database,
    user: Annotated[Principal | None, Depends(current_user)],
) -> ScanResult:
    result = await analyze_url(db, payload.url, user.subject if user else None)
    if user:
        audit(db, request, user, "phishradar.scan")
        await db.commit()
    return result


@router.get("/phishradar/scans", response_model=list[ScanResult])
async def list_recent_scans(
    db: Database,
    _user: Annotated[Principal, Depends(current_user)],
    limit: Annotated[int, Query(ge=1, le=50)] = 20,
) -> list[ScanResult]:
    rows = (await db.scalars(select(UrlScan).order_by(desc(UrlScan.created_at)).limit(limit))).all()
    results = []
    for r in rows:
        results.append(
            ScanResult(
                id=r.id,
                target_url=r.target_url,
                normalized_url=r.normalized_url,
                domain=r.domain,
                risk_score=r.risk_score,
                verdict=r.verdict,  # type: ignore[arg-type]
                factors=[ScanFactor.model_validate(f) for f in r.factors],
                explanation_en="Analysis completed.",
                explanation_hi="विश्लेषण पूर्ण हुआ।",
                actions_en=[],
                actions_hi=[],
                created_at=r.created_at,
            )
        )
    return results


@router.get("/phishradar/monitor", response_model=list[DomainMonitorOutput])
async def list_domain_monitor_alerts(
    db: Database,
    _user: Annotated[Principal, Depends(current_user)],
    limit: Annotated[int, Query(ge=1, le=50)] = 20,
) -> list[DomainMonitor]:
    return list(
        (
            await db.scalars(
                select(DomainMonitor).order_by(desc(DomainMonitor.detected_at)).limit(limit)
            )
        ).all()
    )


@router.post("/phishradar/monitor/simulate", response_model=DomainMonitorOutput)
async def simulate_ct_log_detection(
    request: Request,
    db: Database,
    user: Annotated[Principal, Depends(operator_user)],
) -> DomainMonitor:
    sample_domain = f"irctc-tatkal-express-{uuid.uuid4().hex[:6]}.example.test"
    entry = DomainMonitor(
        monitored_domain="irctc.co.in",
        detected_lookalike=sample_domain,
        similarity_score=0.92,
        status="flagged",
        source="ct_log",
    )
    db.add(entry)
    audit(db, request, user, "phishradar.monitor_simulate")
    await db.commit()
    await db.refresh(entry)
    return entry


@router.get("/takedowns", response_model=list[TakedownCaseOutput])
async def list_takedowns(
    db: Database,
    _user: Annotated[Principal, Depends(operator_user)],
    limit: Annotated[int, Query(ge=1, le=50)] = 50,
) -> list[TakedownCase]:
    return list(
        (
            await db.scalars(
                select(TakedownCase).order_by(desc(TakedownCase.created_at)).limit(limit)
            )
        ).all()
    )


@router.post("/takedowns", response_model=TakedownCaseOutput, status_code=201)
async def create_takedown(
    payload: TakedownCreateInput,
    request: Request,
    db: Database,
    user: Annotated[Principal, Depends(operator_user)],
) -> TakedownCase:
    case = TakedownCase(
        target_domain=payload.target_domain,
        scan_id=payload.scan_id,
        registrar=payload.registrar,
        evidence_summary=payload.evidence_summary,
        created_by=user.subject,
        status="draft",
    )
    db.add(case)
    audit(db, request, user, "takedown.create")
    await db.commit()
    await db.refresh(case)
    return case


@router.post("/takedowns/{case_id}/status", response_model=TakedownCaseOutput)
async def update_takedown_status(
    case_id: uuid.UUID,
    payload: TakedownStatusUpdateInput,
    request: Request,
    db: Database,
    user: Annotated[Principal, Depends(operator_user)],
) -> TakedownCase:
    case = await db.get(TakedownCase, case_id)
    if not case:
        raise HTTPException(404, "Takedown case not found")
    case.status = payload.status
    if payload.note:
        timestamp = datetime.now(UTC).isoformat()
        case.evidence_summary = (
            f"{case.evidence_summary}\n\n[{timestamp}] Status update: {payload.note}"
        )
    audit(db, request, user, f"takedown.update_{payload.status}")
    await db.commit()
    await db.refresh(case)
    return case
