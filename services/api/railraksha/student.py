import hashlib
import hmac
import re
from datetime import UTC, datetime
from typing import Annotated, Any, Literal
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from railraksha.auth import Principal, current_user
from railraksha.dependencies import database
from railraksha.student_models import RecruitmentScamAudit, StudentCertificate

Database = Annotated[AsyncSession, Depends(database)]
CurrentUser = Annotated[Principal, Depends(current_user)]

router = APIRouter(prefix="/v1/student", tags=["student"])

SIGNING_SECRET = "railraksha_student_academy_cert_hmac_secret_2026_x9q"

# Known official government railway recruitment portals
OFFICIAL_RECRUITMENT_DOMAINS = [
    "rrbapply.gov.in",
    "rrbcdg.gov.in",
    "rrbmumbai.gov.in",
    "rrbchennai.gov.in",
    "rrbkolkata.gov.in",
    "rrbsecunderabad.gov.in",
    "rrc-wr.com",
    "rrcecr.gov.in",
    "indianrailways.gov.in",
    "irctc.co.in",
]

# Simulated k-anonymity breach dictionary (SHA-1 prefix -> list of (suffix, count))
# E.g. "password" -> SHA-1 5BAA6 1E4C9B93F3F0682250B6CF8331B7EE68FD8
# "password123" -> SHA-1 CBFD multi-suffix
BREACHED_HASH_LOOKUP: dict[str, list[dict[str, Any]]] = {
    "5BAA6": [
        {"suffix": "1E4C9B93F3F0682250B6CF8331B7EE68FD8", "count": 3861493},
    ],
    "CBFDA": [  # password123
        {"suffix": "C6008F9CAB4083784CBD1874F76618D2A97", "count": 281490},
    ],
    "7C4A8": [  # 123456
        {"suffix": "D09CA3762AF61E59520943DC26494F8941B", "count": 24201940},
    ],
    "8C261": [  # railway@2026 test hash
        {"suffix": "93DB378209312F325CEA3F0E3F1E5A0DD9E", "count": 1420},
    ],
    "E38AD": [  # admin123
        {"suffix": "214943DA1D0FE3E4728222CECCC4C40D7AA", "count": 94102},
    ],
}

# Academy Course Lessons & Quizzes
ACADEMY_MODULES: list[dict[str, Any]] = [
    {
        "module_id": "rrb_recruitment_safety",
        "title": "RRB Job Recruitment & Appointment Letter Fraud Defense",
        "title_hi": "आरआरबी नौकरी भर्ती एवं नियुक्ति पत्र धोखाधड़ी सुरक्षा",
        "description": (
            "Learn how to distinguish genuine Indian Railways Centralized Employment "
            "Notifications (CEN) from fraudulent appointment letters and upfront fee scams."
        ),
        "duration_minutes": 15,
        "key_takeaways": [
            "Indian Railways NEVER charges money for training, medical exams, or uniforms via personal UPI.",
            "Official notifications are only published on .gov.in websites (rrbapply.gov.in).",
            "There is NO direct appointment without official Computer Based Tests (CBT).",
            "Government officers never communicate official recruitment via personal @gmail.com accounts.",
        ],
        "quiz_questions": [
            {
                "question_id": "q1",
                "question": "An agent sends an appointment letter asking for a ₹3,500 'refundable uniform fee' via UPI. What should you do?",
                "question_hi": "एक एजेंट नियुक्ति पत्र भेजकर यूपीआई के माध्यम से ₹3,500 'वापसी योग्य वर्दी शुल्क' मांगता है। आपको क्या करना चाहिए?",
                "options": [
                    "Pay immediately to secure the government job seat.",
                    "Report immediately to 1930 / cybercrime.gov.in as Indian Railways never charges fees via UPI.",
                    "Wait for 2 days and pay half amount.",
                ],
                "correct_option_index": 1,
            },
            {
                "question_id": "q2",
                "question": "Which of the following is an official Indian Railways recruitment portal?",
                "question_hi": "निम्नलिखित में से कौन सा आधिकारिक भारतीय रेलवे भर्ती पोर्टल है?",
                "options": [
                    "www.rrb-group-d-direct-recruitment.in",
                    "www.rrbapply.gov.in",
                    "www.railway-joining-portal.org",
                ],
                "correct_option_index": 1,
            },
            {
                "question_id": "q3",
                "question": "If you receive a job offer letter from 'rrb.recruitment.officer2026@gmail.com', it is:",
                "question_hi": "यदि आपको 'rrb.recruitment.officer2026@gmail.com' से नौकरी का प्रस्ताव पत्र मिलता है, तो यह है:",
                "options": [
                    "A genuine direct recruitment offer.",
                    "A fraudulent phishing scam using an unofficial personal email domain.",
                    "An internal railway officer personal communication.",
                ],
                "correct_option_index": 1,
            },
        ],
    },
    {
        "module_id": "passwords_mfa_dpdp",
        "title": "Password Hygiene, Passkeys & DPDP Act Data Privacy",
        "title_hi": "पासवर्ड स्वच्छता, पासकीज़ एवं डीपीडीपी अधिनियम डेटा गोपनीयता",
        "description": (
            "Master modern password defense with k-anonymity breach checking, passkeys, "
            "and understand your digital rights under the Digital Personal Data Protection Act 2023."
        ),
        "duration_minutes": 20,
        "key_takeaways": [
            "Never reuse passwords across ticketing, banking, and college portals.",
            "Use passkeys (FIDO2/WebAuthn) for tamper-proof phishing resistance.",
            "Under DPDP Act 2023, you have the right to data correction, erasure, and grievance redressal.",
        ],
        "quiz_questions": [
            {
                "question_id": "q1",
                "question": "How does k-anonymity password breach checking protect your security?",
                "question_hi": "k-anonymity पासवर्ड ब्रीच चेकिंग आपकी सुरक्षा कैसे करती है?",
                "options": [
                    "It transmits your plain-text password to the government database.",
                    "It only transmits the first 5 characters of your hash, keeping your password private.",
                    "It changes your password automatically.",
                ],
                "correct_option_index": 1,
            },
            {
                "question_id": "q2",
                "question": "Under the Digital Personal Data Protection (DPDP) Act 2023, citizens have the right to:",
                "question_hi": "डिजिटल पर्सनल डेटा प्रोटेक्शन (डीपीडीपी) अधिनियम 2023 के तहत नागरिकों को अधिकार है:",
                "options": [
                    "Access, correct, and request erasure of their personal data.",
                    "Freely share other people's private Aadhaar cards.",
                    "Sell railway passenger data to marketing firms.",
                ],
                "correct_option_index": 0,
            },
            {
                "question_id": "q3",
                "question": "What is the most secure method for logging into student portals on public Wi-Fi?",
                "question_hi": "सार्वजनिक वाई-फाई पर छात्र पोर्टल में लॉग इन करने का सबसे सुरक्षित तरीका क्या है?",
                "options": [
                    "Save password in browser without two-factor authentication.",
                    "Use hardware passkeys / Authenticator app MFA and HTTPS.",
                    "Use the same simple password as your social media account.",
                ],
                "correct_option_index": 1,
            },
        ],
    },
    {
        "module_id": "hostel_wifi_sextortion",
        "title": "Hostel Wi-Fi Protection, Mod APKs & Anti-Blackmail Defense",
        "title_hi": "छात्रावास वाई-फाई सुरक्षा, मॉड एपीके एवं ब्लैकमेल-विरोधी सुरक्षा",
        "description": (
            "Essential survival skills against rogue library/hostel Wi-Fi hotspots, "
            "trojanized modded APKs, and zero-tolerance emergency response to sextortion."
        ),
        "duration_minutes": 15,
        "key_takeaways": [
            "Avoid entering banking credentials on open unencrypted public Wi-Fi.",
            "Never download cracked 'Mod APKs' from Telegram; they harvest contacts and photos.",
            "If targeted by video blackmail/sextortion, DO NOT PAY. Report immediately to 1930 / Tele-MANAS (14416).",
        ],
        "quiz_questions": [
            {
                "question_id": "q1",
                "question": "If an extortionist threatens to leak a private video unless you transfer money, you should:",
                "question_hi": "यदि कोई ब्लैकमेलर पैसे ट्रांसफर न करने पर निजी वीडियो लीक करने की धमकी देता है, तो आपको क्या करना चाहिए?",
                "options": [
                    "Immediately pay the extortion demand to avoid embarrassment.",
                    "Stop communication, preserve evidence, and dial 1930 / Tele-MANAS helpline 14416 immediately.",
                    "Delete all chats and keep it a secret from authorities.",
                ],
                "correct_option_index": 1,
            },
            {
                "question_id": "q2",
                "question": "Why are cracked or 'Modded' APKs shared on Telegram dangerous for students?",
                "question_hi": "टेलीग्राम पर साझा किए गए क्रैक्ड या 'मॉड' एपीके छात्रों के लिए खतरनाक क्यों हैं?",
                "options": [
                    "They save battery life on smartphones.",
                    "They often bundle trojan spyware that exfiltrates contacts, SMS, and OTPs.",
                    "They are officially endorsed by railway authorities.",
                ],
                "correct_option_index": 1,
            },
            {
                "question_id": "q3",
                "question": "Which national helpline provides 24x7 psychological support for students facing cyber distress?",
                "question_hi": "साइबर संकट का सामना कर रहे छात्रों के लिए कौन सी राष्ट्रीय हेल्पलाइन 24x7 मनोवैज्ञानिक सहायता प्रदान करती है?",
                "options": [
                    "Tele-MANAS (14416) / National Cyber Helpline (1930)",
                    "Railway Inquiry 139 for mental health",
                    "Local post office inquiry",
                ],
                "correct_option_index": 0,
            },
        ],
    },
]

# --- Schemas ---


class JobScamCheckRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    content: str = Field(min_length=10, max_length=10000)
    source_type: Literal["appointment_letter", "email", "sms_whatsapp", "job_website"] = (
        "appointment_letter"
    )


class JobScamCheckResult(BaseModel):
    risk_verdict: Literal["likely_scam", "suspicious", "official_verified"]
    risk_score: int
    red_flags: list[str]
    matched_official_portal: str | None
    recommendations_en: list[str]
    recommendations_hi: list[str]
    audit_id: str


class PasswordBreachCheckRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    hash_prefix: str = Field(
        min_length=5,
        max_length=5,
        pattern=r"^[0-9A-Fa-f]{5}$",
        description="First 5 hexadecimal characters of SHA-1 hash (k-anonymity model).",
    )


class PasswordBreachMatch(BaseModel):
    suffix: str
    breach_count: int


class PasswordBreachCheckResult(BaseModel):
    hash_prefix: str
    matches_found: int
    matches: list[PasswordBreachMatch]
    is_compromised: bool
    safety_advice_en: str
    safety_advice_hi: str


class QuizSubmissionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    student_name: str = Field(min_length=2, max_length=128)
    student_email: str = Field(min_length=5, max_length=256)
    course_module: str = Field(min_length=3, max_length=64)
    selected_options: dict[str, int] = Field(
        description="Map of question_id to selected option index."
    )


class QuizSubmissionResult(BaseModel):
    course_module: str
    score: int
    passed: bool
    correct_count: int
    total_questions: int
    certificate_id: str | None
    digital_signature: str | None
    issued_at: str | None
    message: str


class CertificateVerificationResult(BaseModel):
    certificate_id: str
    is_authentic: bool
    status: Literal["authentic", "revoked", "not_found"]
    student_name: str | None
    course_module: str | None
    score: int | None
    issued_at: str | None
    verification_badge: str


# --- Core Logic Functions ---


def analyze_recruitment_scam(
    content: str, source_type: str
) -> tuple[str, int, list[str], str | None]:
    lower_text = content.lower()
    red_flags: list[str] = []
    score = 0
    matched_official: str | None = None

    # Check for genuine official recruitment portals
    for domain in OFFICIAL_RECRUITMENT_DOMAINS:
        if domain in lower_text:
            matched_official = domain
            break

    # 1. Upfront Payment Extortion Patterns
    payment_patterns = [
        (
            r"(uniform\s*(charges|fee|cost)|वर्दी\s*शुल्क)",
            "Requests money for uniform charges (Govt railways provides uniforms free).",
        ),
        (
            r"(medical\s*(fee|charges|examination\s*fee)|चिकित्सा\s*परीक्षा\s*शुल्क)",
            "Demands medical examination fee via private transfer.",
        ),
        (
            r"(training\s*(charges|fee)|प्रशिक्षण\s*शुल्क)",
            "Requests upfront training fee.",
        ),
        (
            r"(security\s*deposit|refundable\s*deposit|जमानत\s*राशि)",
            "Asks for refundable security deposit.",
        ),
        (
            r"(pay\s*(₹|rs\.?|inr)\s*\d+|भुगतान\s*करें)",
            "Direct money payment solicited in recruitment correspondence.",
        ),
    ]
    for pattern, desc in payment_patterns:
        if re.search(pattern, lower_text):
            red_flags.append(desc)
            score += 35

    # 2. Personal email used for official government hiring
    personal_email_match = re.search(
        r"[a-zA-Z0-9._%+-]+@(gmail|yahoo|outlook|hotmail|rediffmail)\.com", lower_text
    )
    if personal_email_match:
        red_flags.append(
            f"Uses personal email address ({personal_email_match.group(0)}) instead of official @gov.in or @nic.in domain."
        )
        score += 35

    # 3. Direct appointment / bypass of official RRB exam
    direct_appointment_patterns = [
        (
            r"(direct\s*(selection|joining|appointment|hiring)|सीधी\s*भर्ती)",
            "Claims direct appointment without mandatory RRB Computer Based Test (CBT).",
        ),
        (
            r"(no\s*exam\s*required|बिना\s*परीक्षा)",
            "Claims no examination required for Central Govt Railway post.",
        ),
        (
            r"(100%\s*(guarantee|selection)|गारंटी\s*चयन)",
            "Promises guaranteed government job placement.",
        ),
        (
            r"(ministry\s*quota|विशेष\s*कोटा)",
            "Claims unauthorized Ministry of Railways discretion quota.",
        ),
    ]
    for pattern, desc in direct_appointment_patterns:
        if re.search(pattern, lower_text):
            red_flags.append(desc)
            score += 25

    # 4. WhatsApp-based hiring
    if "whatsapp" in lower_text and any(
        w in lower_text for w in ["joining", "letter", "documents", "interview", "hr"]
    ):
        red_flags.append(
            "Recruitment process conducted via WhatsApp messaging (Unauthorised channel)."
        )
        score += 25

    # 5. Excessive urgency
    if any(
        w in lower_text
        for w in ["24 hours", "immediate joining", "today itself", "within 48 hours", "तुरंत"]
    ):
        red_flags.append("High-pressure artificial urgency demanding immediate compliance.")
        score += 15

    # Determine verdict
    score = min(100, score)
    if matched_official and score < 20:
        verdict: Literal["likely_scam", "suspicious", "official_verified"] = "official_verified"
        score = 5
    elif score >= 50:
        verdict = "likely_scam"
    elif score >= 25:
        verdict = "suspicious"
    else:
        verdict = "official_verified"

    return verdict, score, red_flags, matched_official


def generate_certificate_signature(
    cert_id: str, student_name: str, score: int, module: str
) -> str:
    message = f"{cert_id}:{student_name}:{score}:{module}".encode()
    return hmac.new(SIGNING_SECRET.encode(), message, hashlib.sha256).hexdigest()


# --- Endpoints ---


@router.post("/job-scam/check", response_model=JobScamCheckResult)
async def check_job_recruitment_scam(
    req: JobScamCheckRequest,
    db: Database,
) -> JobScamCheckResult:
    """Scans employment offers, appointment letters, and circulars for RRB/RRC scams."""
    verdict, score, red_flags, matched_official = analyze_recruitment_scam(
        req.content, req.source_type
    )

    audit_obj = RecruitmentScamAudit(
        query_text=req.content[:2000],
        risk_verdict=verdict,
        risk_score=score,
        red_flags=red_flags,
        matched_official_portal=matched_official,
    )
    db.add(audit_obj)
    await db.commit()

    if verdict == "likely_scam":
        rec_en = [
            "DO NOT PAY ANY MONEY: Indian Railways NEVER charges uniform, training, or deposit fees.",
            "Verify all notifications directly on the official Centralized Portal: https://www.rrbapply.gov.in",
            "File an immediate fraud report on the National Cyber Crime Portal (cybercrime.gov.in) or call 1930.",
        ]
        rec_hi = [
            "कोई भी पैसा न दें: भारतीय रेलवे कभी भी वर्दी, प्रशिक्षण या जमा शुल्क नहीं लेता है।",
            "सभी अधिसूचनाओं को सीधे आधिकारिक पोर्टल www.rrbapply.gov.in पर सत्यापित करें।",
            "राष्ट्रीय साइबर अपराध पोर्टल (cybercrime.gov.in) पर तुरंत रिपोर्ट करें या 1930 डायल करें।",
        ]
    elif verdict == "suspicious":
        rec_en = [
            "Check for official CEN (Centralized Employment Notice) number on official RRB portal.",
            "Cross-verify the sender's identity with the nearest Railway Recruitment Board (RRB) office.",
        ]
        rec_hi = [
            "आधिकारिक आरआरबी पोर्टल पर आधिकारिक सीईएन (रोजगार सूचना) संख्या की जाँच करें।",
            "निकटतम रेलवे भर्ती बोर्ड (आरआरबी) कार्यालय से प्रेषक की पहचान सत्यापित करें।",
        ]
    else:
        rec_en = [
            "This communication aligns with authentic Indian Railways recruitment references.",
            "Always complete application fees solely through official payment gateways on .gov.in portals.",
        ]
        rec_hi = [
            "यह पत्राचार प्रामाणिक भारतीय रेलवे भर्ती संदर्भों से मेल खाता है।",
            "हमेशा केवल .gov.in पोर्टल पर आधिकारिक पेमेंट गेटवे के माध्यम से आवेदन शुल्क का भुगतान करें।",
        ]

    return JobScamCheckResult(
        risk_verdict=verdict,
        risk_score=score,
        red_flags=red_flags,
        matched_official_portal=matched_official,
        recommendations_en=rec_en,
        recommendations_hi=rec_hi,
        audit_id=str(audit_obj.id),
    )


@router.post("/breach/check-password", response_model=PasswordBreachCheckResult)
async def check_password_breach_k_anonymity(
    req: PasswordBreachCheckRequest,
) -> PasswordBreachCheckResult:
    """Evaluates password breach status using strict k-anonymity.

    Receives ONLY the first 5 characters of SHA-1 hash. The server never sees the
    password or the full hash.
    """
    prefix_upper = req.hash_prefix.upper()
    matches_data = BREACHED_HASH_LOOKUP.get(prefix_upper, [])

    match_objs = [
        PasswordBreachMatch(suffix=m["suffix"], breach_count=m["count"]) for m in matches_data
    ]

    is_breached = len(match_objs) > 0

    return PasswordBreachCheckResult(
        hash_prefix=prefix_upper,
        matches_found=len(match_objs),
        matches=match_objs,
        is_compromised=is_breached,
        safety_advice_en=(
            "This password appears in known dark-web credential dumps. "
            "Change it immediately and enable passkey / MFA."
            if is_breached
            else "No known breaches matching this hash prefix in our high-risk dictionary."
        ),
        safety_advice_hi=(
            "यह पासवर्ड डार्क-वेब डेटा उल्लंघन में पाया गया है। "
            "इसे तुरंत बदलें और पासकी / एमएफए सक्षम करें।"
            if is_breached
            else "हमारे शब्दकोश में इस हैश उपसर्ग से मेल खाने वाला कोई उल्लंघन नहीं मिला।"
        ),
    )


@router.get("/academy/lessons")
async def list_academy_lessons() -> list[dict[str, Any]]:
    """Lists interactive learning modules and awareness quizzes."""
    return ACADEMY_MODULES


@router.post("/academy/submit-quiz", response_model=QuizSubmissionResult)
async def submit_academy_quiz(
    req: QuizSubmissionRequest,
    db: Database,
) -> QuizSubmissionResult:
    """Grades quiz submission and issues cryptographically signed Certificate of Cyber Safety."""
    target_module = next((m for m in ACADEMY_MODULES if m["module_id"] == req.course_module), None)
    if not target_module:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Module '{req.course_module}' not found.",
        )

    questions = target_module["quiz_questions"]
    total_q = len(questions)
    correct_count = 0

    for q in questions:
        q_id = q["question_id"]
        correct_idx = q["correct_option_index"]
        if req.selected_options.get(q_id) == correct_idx:
            correct_count += 1

    score_pct = int((correct_count / total_q) * 100)
    passed = score_pct >= 75

    cert_id: str | None = None
    sig: str | None = None
    now_iso: str | None = None

    if passed:
        cert_id = f"RR-CERT-{datetime.now(UTC).year}-{uuid4().hex[:8].upper()}"
        sig = generate_certificate_signature(
            cert_id=cert_id,
            student_name=req.student_name,
            score=score_pct,
            module=req.course_module,
        )
        now_dt = datetime.now(UTC)
        now_iso = now_dt.isoformat()

        cert_record = StudentCertificate(
            certificate_id=cert_id,
            student_name=req.student_name,
            student_email=req.student_email,
            course_module=req.course_module,
            score=score_pct,
            signature=sig,
            issued_at=now_dt,
            is_valid=True,
        )
        db.add(cert_record)
        await db.commit()

        msg = (
            f"Congratulations {req.student_name}! You scored {score_pct}% and earned an official "
            f"Certificate of Cyber Safety ({cert_id})."
        )
    else:
        msg = f"You scored {score_pct}%. A minimum score of 75% is required to earn certification. Review the module and try again!"

    return QuizSubmissionResult(
        course_module=req.course_module,
        score=score_pct,
        passed=passed,
        correct_count=correct_count,
        total_questions=total_q,
        certificate_id=cert_id,
        digital_signature=sig,
        issued_at=now_iso,
        message=msg,
    )


@router.get("/certificates/{certificate_id}/verify", response_model=CertificateVerificationResult)
async def verify_student_certificate(
    certificate_id: str,
    db: Database,
) -> CertificateVerificationResult:
    """Public verification endpoint for RailRaksha Student Cyber Awareness Certificates."""
    query = select(StudentCertificate).where(StudentCertificate.certificate_id == certificate_id)
    res = await db.execute(query)
    cert = res.scalar_one_or_none()

    if not cert:
        return CertificateVerificationResult(
            certificate_id=certificate_id,
            is_authentic=False,
            status="not_found",
            student_name=None,
            course_module=None,
            score=None,
            issued_at=None,
            verification_badge="INVALID_CERTIFICATE_NOT_FOUND",
        )

    # Verify cryptographic signature
    expected_sig = generate_certificate_signature(
        cert_id=cert.certificate_id,
        student_name=cert.student_name,
        score=cert.score,
        module=cert.course_module,
    )

    if cert.signature != expected_sig or not cert.is_valid:
        return CertificateVerificationResult(
            certificate_id=certificate_id,
            is_authentic=False,
            status="revoked",
            student_name=cert.student_name,
            course_module=cert.course_module,
            score=cert.score,
            issued_at=cert.issued_at.isoformat(),
            verification_badge="TAMPERED_OR_REVOKED_SIGNATURE",
        )

    return CertificateVerificationResult(
        certificate_id=certificate_id,
        is_authentic=True,
        status="authentic",
        student_name=cert.student_name,
        course_module=cert.course_module,
        score=cert.score,
        issued_at=cert.issued_at.isoformat(),
        verification_badge="OFFICIAL_RAILRAKSHA_VERIFIED_CREDENTIAL",
    )
