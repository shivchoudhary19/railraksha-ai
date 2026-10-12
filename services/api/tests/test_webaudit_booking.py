from collections.abc import Callable

import httpx
import pytest

from tests.test_registry import headers


@pytest.mark.asyncio
async def test_webaudit_asset_registration_and_verification(
    client: httpx.AsyncClient, token: Callable[..., str]
) -> None:
    auth_headers = headers(token, "partner_dev")
    payload = {"domain": "portal.irctc-partner.in", "verification_method": "dns_txt"}
    resp = await client.post("/v1/webaudit/assets", json=payload, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["domain"] == "portal.irctc-partner.in"
    assert "railraksha-verify-" in data["verification_token"]
    assert "DNS TXT" in data["instructions_en"]
    asset_id = data["id"]

    # Verify asset
    verify_resp = await client.post(
        f"/v1/webaudit/assets/{asset_id}/verify", headers=auth_headers
    )
    assert verify_resp.status_code == 200
    assert verify_resp.json()["verified"] is True


@pytest.mark.asyncio
async def test_webaudit_scan_authorized_demo(
    client: httpx.AsyncClient, token: Callable[..., str]
) -> None:
    auth_headers = headers(token, "analyst")

    # 1. Vulnerable demo asset
    vuln_payload = {"domain": "demo-vuln.local"}
    resp = await client.post("/v1/webaudit/scan", json=vuln_payload, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["scan_type"] == "authorized_audit"
    assert data["grade"] in ["D", "F", "C"]
    csp_fail = any(
        h["header"] == "Content-Security-Policy" and h["status"] == "fail"
        for h in data["header_findings"]
    )
    assert csp_fail
    assert any(s["target"] == "nginx" for s in data["remediation_snippets"])
    assert ".env" in data["file_exposures"]

    # 2. Healthy demo asset
    healthy_payload = {"domain": "localhost"}
    h_resp = await client.post("/v1/webaudit/scan", json=healthy_payload, headers=auth_headers)
    assert h_resp.status_code == 200
    h_data = h_resp.json()
    assert h_data["overall_score"] >= 80
    assert h_data["grade"] in ["A+", "A"]


@pytest.mark.asyncio
async def test_webaudit_passive_public_snapshot_and_unauthorized_rejection(
    client: httpx.AsyncClient, token: Callable[..., str]
) -> None:
    auth_headers = headers(token, "citizen")

    # Passive public snapshot of genuine railway portal (non-intrusive)
    public_payload = {"domain": "irctc.co.in"}
    resp = await client.post("/v1/webaudit/scan", json=public_payload, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["scan_type"] == "passive_public"
    assert data["domain"] == "irctc.co.in"

    # Reject active scan on arbitrary unverified domain
    unauth_payload = {"domain": "unverified-external-corp.com"}
    unauth_resp = await client.post("/v1/webaudit/scan", json=unauth_payload, headers=auth_headers)
    assert unauth_resp.status_code == 403
    err_body = unauth_resp.json()
    err_obj = err_body.get("error", {})
    err_msg = err_obj.get("message", "") if isinstance(err_obj, dict) else str(err_body)
    assert "not verified" in err_msg.lower()


@pytest.mark.asyncio
async def test_booking_train_search(
    client: httpx.AsyncClient, token: Callable[..., str]
) -> None:
    auth_headers = headers(token, "citizen")
    payload = {"from_station": "NDLS", "to_station": "MMCT", "travel_date": "2026-10-25"}
    resp = await client.post("/v1/booking/trains/search", json=payload, headers=auth_headers)
    assert resp.status_code == 200
    trains = resp.json()
    assert len(trains) > 0
    assert any("Rajdhani" in t["train_name"] for t in trains)


@pytest.mark.asyncio
async def test_booking_full_journey_and_ticket_verification(
    client: httpx.AsyncClient, token: Callable[..., str]
) -> None:
    auth_headers = headers(token, "citizen")

    # 1. Book Ticket
    book_payload = {
        "train_number": "12951",
        "from_station": "NDLS",
        "to_station": "MMCT",
        "travel_date": "2026-10-25",
        "journey_class": "3A",
        "passenger_name": "Rohan Sharma",
        "passenger_age": 28,
        "passenger_gender": "M",
    }
    book_resp = await client.post("/v1/booking/book", json=book_payload, headers=auth_headers)
    assert book_resp.status_code == 200
    ticket = book_resp.json()
    assert len(ticket["pnr"]) == 10
    assert ticket["status"] == "confirmed"
    assert ticket["signature"] is not None
    qr_payload = ticket["qr_payload"]
    pnr = ticket["pnr"]

    # 2. Check PNR status
    pnr_resp = await client.get(f"/v1/booking/pnr/{pnr}", headers=auth_headers)
    assert pnr_resp.status_code == 200
    assert pnr_resp.json()["pnr"] == pnr

    # 3. Verify Genuine Ticket QR
    verify_resp = await client.post(
        "/v1/booking/verify-ticket", json={"qr_payload": qr_payload}, headers=auth_headers
    )
    assert verify_resp.status_code == 200
    v_data = verify_resp.json()
    assert v_data["valid"] is True
    assert v_data["verdict"] == "authentic"
    assert v_data["pnr"] == pnr

    # 4. Tampered QR rejection (change passenger name)
    tampered_qr = qr_payload.replace("PASSENGER=Rohan Sharma", "PASSENGER=Fake Impersonator")
    tampered_resp = await client.post(
        "/v1/booking/verify-ticket", json={"qr_payload": tampered_qr}, headers=auth_headers
    )
    assert tampered_resp.status_code == 200
    t_data = tampered_resp.json()
    assert t_data["valid"] is False
    assert t_data["verdict"] == "counterfeit_or_tampered"


@pytest.mark.asyncio
async def test_booking_cancellation_and_grievance(
    client: httpx.AsyncClient, token: Callable[..., str]
) -> None:
    auth_headers = headers(token, "citizen")

    # Book ticket to cancel
    book_payload = {
        "train_number": "12004",
        "from_station": "NDLS",
        "to_station": "LKO",
        "travel_date": "2026-10-26",
        "journey_class": "CC",
        "passenger_name": "Ananya Verma",
        "passenger_age": 24,
        "passenger_gender": "F",
    }
    book_resp = await client.post("/v1/booking/book", json=book_payload, headers=auth_headers)
    assert book_resp.status_code == 200
    pnr = book_resp.json()["pnr"]

    # Cancel ticket
    cancel_resp = await client.post(f"/v1/booking/pnr/{pnr}/cancel", headers=auth_headers)
    assert cancel_resp.status_code == 200
    c_data = cancel_resp.json()
    assert c_data["status"] == "cancelled"
    assert c_data["refund_amount"] > 0
    assert c_data["cancellation_fee"] == 120

    # Repeat cancellation fails
    repeat_cancel = await client.post(f"/v1/booking/pnr/{pnr}/cancel", headers=auth_headers)
    assert repeat_cancel.status_code == 400

    # File grievance (RailMadad-style)
    grievance_payload = {
        "pnr": pnr,
        "category": "Refund & Billing",
        "description": "Checking refund credit status after ticket cancellation.",
    }
    g_resp = await client.post(
        "/v1/booking/grievances", json=grievance_payload, headers=auth_headers
    )
    assert g_resp.status_code == 200
    g_data = g_resp.json()
    assert g_data["tracking_id"].startswith("RM-2026-")
    assert g_data["status"] == "registered"
