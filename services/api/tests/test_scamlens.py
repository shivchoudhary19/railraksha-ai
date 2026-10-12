from collections.abc import Callable

import httpx
import pytest

from railraksha.scamlens import extract_entities
from tests.test_registry import headers


def test_entity_extraction() -> None:
    text = (
        "Dear passenger, verify your ticket at https://irctc-refund.biz/now immediately. "
        "Contact officer at +919876543210 or send processing fee to irctc.support@okhdfcbank."
    )
    entities = extract_entities(text)
    assert "https://irctc-refund.biz/now" in entities.urls
    assert any("9876543210" in p for p in entities.phones)
    assert "irctc.support@okhdfcbank" in entities.upis


@pytest.mark.asyncio
async def test_scamlens_otp_theft(
    client: httpx.AsyncClient, token: Callable[..., str]
) -> None:
    auth_headers = headers(token, "citizen")
    payload = {
        "text": (
            "Your IRCTC account will be blocked within 24 hours. "
            "Kindly share your OTP immediately to avoid suspension."
        ),
        "save_report": True,
    }
    resp = await client.post("/v1/scamlens/analyze", json=payload, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["verdict"] == "dangerous"
    assert data["category"] == "otp_theft"
    assert data["risk_score"] >= 65
    assert any(flag["severity"] == "critical" for flag in data["red_flags"])
    assert any("1930" in step for step in data["safe_steps_en"])


@pytest.mark.asyncio
async def test_scamlens_remote_access_scam(
    client: httpx.AsyncClient, token: Callable[..., str]
) -> None:
    auth_headers = headers(token, "citizen")
    payload = {
        "text": (
            "Rail passenger support: Please install AnyDesk to verify your failed "
            "ticket transaction."
        ),
        "save_report": False,
    }
    resp = await client.post("/v1/scamlens/analyze", json=payload, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["verdict"] == "dangerous"
    assert data["category"] == "remote_access"
    assert any("AnyDesk" in f["snippet"] for f in data["red_flags"])


@pytest.mark.asyncio
async def test_scamlens_upi_collect_fraud(
    client: httpx.AsyncClient, token: Callable[..., str]
) -> None:
    auth_headers = headers(token, "citizen")
    payload = {
        "text": (
            "Your train ticket refund is ready! Enter PIN to receive money on your "
            "PhonePe/GPay app now."
        ),
        "save_report": False,
    }
    resp = await client.post("/v1/scamlens/analyze", json=payload, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["verdict"] == "dangerous"
    assert data["category"] == "upi_collect"


@pytest.mark.asyncio
async def test_scamlens_job_recruitment_scam(
    client: httpx.AsyncClient, token: Callable[..., str]
) -> None:
    auth_headers = headers(token, "citizen")
    payload = {
        "text": (
            "Direct RRB recruitment appointment letter issued for Group D railway job. "
            "Pay joining fee to confirm."
        ),
        "save_report": False,
    }
    resp = await client.post("/v1/scamlens/analyze", json=payload, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["category"] == "job_recruitment"
    assert any("RRB" in f["reason_en"] for f in data["red_flags"])


@pytest.mark.asyncio
async def test_scamlens_hindi_text_analysis(
    client: httpx.AsyncClient, token: Callable[..., str]
) -> None:
    auth_headers = headers(token, "citizen")
    payload = {
        "text": "आपका रेलवे टिकट रिफंड पाने के लिए पैसे पाने के लिए पिन दर्ज करें और तुरंत ओटीपी साझा करें।",
        "save_report": True,
    }
    resp = await client.post("/v1/scamlens/analyze", json=payload, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["verdict"] == "dangerous"
    assert len(data["category_title_hi"]) > 0
    assert len(data["safe_steps_hi"]) > 0


@pytest.mark.asyncio
async def test_scamlens_safe_message(
    client: httpx.AsyncClient, token: Callable[..., str]
) -> None:
    auth_headers = headers(token, "citizen")
    payload = {
        "text": (
            "Train 12951 will arrive on platform 3 at New Delhi railway station at "
            "08:30 AM. Happy journey!"
        ),
        "save_report": False,
    }
    resp = await client.post("/v1/scamlens/analyze", json=payload, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["verdict"] == "safe"
    assert data["risk_score"] < 30
    assert len(data["red_flags"]) == 0


@pytest.mark.asyncio
async def test_email_analysis_spoofing_and_auth_fail(
    client: httpx.AsyncClient, token: Callable[..., str]
) -> None:
    auth_headers = headers(token, "citizen")
    payload = {
        "from_header": "IRCTC Official Support <support@suspicious-cloud.com>",
        "reply_to": "attacker@darkweb-mailbox.org",
        "subject": "Urgent ticket refund authorization required",
        "body": "Dear passenger, please confirm your banking details for pending refund.",
        "spf_result": "fail",
        "dkim_result": "fail",
        "dmarc_result": "fail",
    }
    resp = await client.post("/v1/scamlens/analyze-email", json=payload, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["verdict"] == "dangerous"
    assert data["display_name_spoofed"] is True
    assert data["domain_mismatch"] is True
    assert "SPF fail" in data["auth_failures"]
    assert "DKIM fail" in data["auth_failures"]
    assert "DMARC fail" in data["auth_failures"]


@pytest.mark.asyncio
async def test_email_analysis_safe(
    client: httpx.AsyncClient, token: Callable[..., str]
) -> None:
    auth_headers = headers(token, "citizen")
    payload = {
        "from_header": "Ticket Booking <ticketadmin@irctc.co.in>",
        "reply_to": "ticketadmin@irctc.co.in",
        "subject": "Booking Confirmation PNR 2847291823",
        "body": "Your train ticket is confirmed. Coach B2 Seat 45.",
        "spf_result": "pass",
        "dkim_result": "pass",
        "dmarc_result": "pass",
    }
    resp = await client.post("/v1/scamlens/analyze-email", json=payload, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["verdict"] == "safe"
    assert data["display_name_spoofed"] is False
    assert data["risk_score"] == 0


@pytest.mark.asyncio
async def test_emergency_checklist(
    client: httpx.AsyncClient, token: Callable[..., str]
) -> None:
    auth_headers = headers(token, "citizen")
    resp = await client.get("/v1/scamlens/emergency-checklist", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 5
    assert data[0]["contact"] == "1930"
    assert "1930" in data[0]["title_en"]
    assert data[0]["urgent"] is True
