from collections.abc import Callable
from typing import Any

import httpx
import pytest

from railraksha.student import (
    analyze_recruitment_scam,
    generate_certificate_signature,
)
from tests.test_registry import headers


def test_analyze_recruitment_scam_heuristics() -> None:
    # 1. Obvious recruitment scam with upfront payment and gmail
    scam_text = (
        "Congratulations! You have been selected for Indian Railways Ticket Collector post. "
        "Direct appointment without exam. Please deposit refundable uniform fee of Rs. 3500 "
        "via UPI and email receipt to rrb.recruitment.officer2026@gmail.com within 24 hours."
    )
    verdict, score, red_flags, matched = analyze_recruitment_scam(
        scam_text, "appointment_letter"
    )
    assert verdict == "likely_scam"
    assert score >= 70
    assert any("uniform charges" in f.lower() for f in red_flags)
    assert any("personal email" in f.lower() for f in red_flags)
    assert any("direct appointment" in f.lower() for f in red_flags)

    # 2. Genuine official notification
    genuine_text = (
        "Government of India, Ministry of Railways, Railway Recruitment Boards (RRB). "
        "Centralized Employment Notice (CEN) No. 01/2026. Online applications are invited "
        "only on official portal https://www.rrbapply.gov.in. No agent is authorized."
    )
    verdict_gen, score_gen, flags_gen, matched_gen = analyze_recruitment_scam(
        genuine_text, "job_website"
    )
    assert verdict_gen == "official_verified"
    assert score_gen <= 20
    assert matched_gen == "rrbapply.gov.in"


def test_generate_certificate_signature_deterministic() -> None:
    sig1 = generate_certificate_signature(
        "RR-CERT-2026-TEST", "Priya Sharma", 100, "rrb_recruitment_safety"
    )
    sig2 = generate_certificate_signature(
        "RR-CERT-2026-TEST", "Priya Sharma", 100, "rrb_recruitment_safety"
    )
    assert sig1 == sig2
    assert len(sig1) == 64


@pytest.mark.asyncio
async def test_job_scam_check_api(
    client: httpx.AsyncClient,
    token: Callable[..., str],
) -> None:
    auth_headers = headers(token, role="citizen")

    # Check scam text
    resp = await client.post(
        "/v1/student/job-scam/check",
        headers=auth_headers,
        json={
            "content": (
                "Railway Recruitment Cell: Urgent appointment letter for Group D post. "
                "Pay training fee of Rs. 4500 to secure joining. Contact on WhatsApp immediately."
            ),
            "source_type": "appointment_letter",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["risk_verdict"] == "likely_scam"
    assert data["risk_score"] >= 60
    assert len(data["red_flags"]) >= 2
    assert len(data["recommendations_en"]) >= 2
    assert len(data["recommendations_hi"]) >= 2
    assert data["audit_id"] is not None


@pytest.mark.asyncio
async def test_password_breach_k_anonymity_api(
    client: httpx.AsyncClient,
    token: Callable[..., str],
) -> None:
    auth_headers = headers(token, role="citizen")

    # 1. Compromised hash prefix ("5BAA6" from SHA-1 of "password")
    resp_hit = await client.post(
        "/v1/student/breach/check-password",
        headers=auth_headers,
        json={"hash_prefix": "5BAA6"},
    )
    assert resp_hit.status_code == 200
    data_hit = resp_hit.json()
    assert data_hit["is_compromised"] is True
    assert data_hit["matches_found"] >= 1
    assert any(m["suffix"] == "1E4C9B93F3F0682250B6CF8331B7EE68FD8" for m in data_hit["matches"])

    # 2. Safe / unbreached prefix
    resp_safe = await client.post(
        "/v1/student/breach/check-password",
        headers=auth_headers,
        json={"hash_prefix": "00000"},
    )
    assert resp_safe.status_code == 200
    data_safe = resp_safe.json()
    assert data_safe["is_compromised"] is False
    assert data_safe["matches_found"] == 0

    # 3. Reject invalid prefix shape (must be 5 hex chars)
    resp_invalid = await client.post(
        "/v1/student/breach/check-password",
        headers=auth_headers,
        json={"hash_prefix": "123"},
    )
    assert resp_invalid.status_code == 422


@pytest.mark.asyncio
async def test_academy_lessons_list(client: httpx.AsyncClient) -> None:
    resp = await client.get("/v1/student/academy/lessons")
    assert resp.status_code == 200
    modules = resp.json()
    assert isinstance(modules, list)
    assert len(modules) >= 3
    mod_ids = [m["module_id"] for m in modules]
    assert "rrb_recruitment_safety" in mod_ids
    assert "passwords_mfa_dpdp" in mod_ids
    assert "hostel_wifi_sextortion" in mod_ids


@pytest.mark.asyncio
async def test_quiz_submission_and_certificate_verification_flow(
    client: httpx.AsyncClient,
    token: Callable[..., str],
) -> None:
    auth_headers = headers(token, role="citizen")

    # 1. Failing Quiz Submission (< 75%)
    resp_fail = await client.post(
        "/v1/student/academy/submit-quiz",
        headers=auth_headers,
        json={
            "student_name": "Rohan Gupta",
            "student_email": "rohan.gupta@college.edu.in",
            "course_module": "rrb_recruitment_safety",
            "selected_options": {"q1": 0, "q2": 0, "q3": 0},  # all incorrect
        },
    )
    assert resp_fail.status_code == 200
    data_fail = resp_fail.json()
    assert data_fail["passed"] is False
    assert data_fail["score"] == 0
    assert data_fail["certificate_id"] is None

    # 2. Passing Quiz Submission (100%)
    resp_pass = await client.post(
        "/v1/student/academy/submit-quiz",
        headers=auth_headers,
        json={
            "student_name": "Priya Sharma",
            "student_email": "priya.sharma@university.ac.in",
            "course_module": "rrb_recruitment_safety",
            "selected_options": {"q1": 1, "q2": 1, "q3": 1},  # all correct
        },
    )
    assert resp_pass.status_code == 200
    data_pass = resp_pass.json()
    assert data_pass["passed"] is True
    assert data_pass["score"] == 100
    assert data_pass["certificate_id"] is not None
    assert data_pass["digital_signature"] is not None
    cert_id = data_pass["certificate_id"]

    # 3. Public Certificate Verification
    resp_verify = await client.get(f"/v1/student/certificates/{cert_id}/verify")
    assert resp_verify.status_code == 200
    v_data = resp_verify.json()
    assert v_data["is_authentic"] is True
    assert v_data["status"] == "authentic"
    assert v_data["student_name"] == "Priya Sharma"
    assert v_data["course_module"] == "rrb_recruitment_safety"
    assert v_data["score"] == 100
    assert "OFFICIAL_RAILRAKSHA_VERIFIED" in v_data["verification_badge"]

    # 4. Unknown Certificate Verification
    resp_unknown = await client.get("/v1/student/certificates/RR-CERT-FAKE-9999/verify")
    assert resp_unknown.status_code == 200
    u_data = resp_unknown.json()
    assert u_data["is_authentic"] is False
    assert u_data["status"] == "not_found"
