from collections.abc import Callable

import httpx
import pytest

from railraksha.phishradar import detect_homoglyphs, levenshtein_distance
from tests.test_registry import headers, privileged


def test_levenshtein_distance() -> None:
    assert levenshtein_distance("irctc", "irctc") == 0
    assert levenshtein_distance("irctc", "irctk") == 1
    assert levenshtein_distance("irctc", "irctcc") == 1
    assert levenshtein_distance("tatkal", "tatkal123") == 3


def test_homoglyph_detection() -> None:
    has_homo, deconfused = detect_homoglyphs("irсtс.example.test")  # contains Cyrillic 'с'
    assert has_homo is True
    assert deconfused == "irctc.example.test"

    has_homo_clean, _ = detect_homoglyphs("clean-domain.example.test")
    assert has_homo_clean is False


@pytest.mark.asyncio
async def test_ssrf_protection_rejects_internal_targets(
    client: httpx.AsyncClient, token: Callable[..., str]
) -> None:
    auth_headers = headers(token, "citizen")

    # Localhost
    resp = await client.post(
        "/v1/phishradar/scan",
        json={"url": "http://localhost:8000/admin"},
        headers=auth_headers,
    )
    assert resp.status_code == 422
    assert "Internal addresses" in resp.json()["error"]["message"]

    # 127.0.0.1
    resp = await client.post(
        "/v1/phishradar/scan",
        json={"url": "http://127.0.0.1/test"},
        headers=auth_headers,
    )
    assert resp.status_code == 422

    # Private IP
    resp = await client.post(
        "/v1/phishradar/scan",
        json={"url": "http://192.168.1.1/router"},
        headers=auth_headers,
    )
    assert resp.status_code == 422

    # Non-HTTP link
    resp = await client.post(
        "/v1/phishradar/scan",
        json={"url": "ftp://files.example.test"},
        headers=auth_headers,
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_phishradar_scan_verdicts_and_explanations(
    client: httpx.AsyncClient, token: Callable[..., str]
) -> None:
    auth_headers = headers(token, "citizen")

    # 1. Dangerous lookalike with brand keyword, tatkal, and risky TLD
    resp = await client.post(
        "/v1/phishradar/scan",
        json={"url": "https://irctc-tatkal-fast.xyz/booking?refund=instant"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["verdict"] == "dangerous"
    assert data["risk_score"] >= 70
    factor_codes = [f["code"] for f in data["factors"]]
    assert "BRAND_TYPOSQUAT" in factor_codes
    assert "RISKY_TLD" in factor_codes
    assert "SUSPICIOUS_KEYWORDS" in factor_codes
    assert len(data["actions_en"]) > 0
    assert len(data["actions_hi"]) > 0

    # 2. Benign clean link
    resp = await client.post(
        "/v1/phishradar/scan",
        json={"url": "https://independent-blog.example.test/travel-tips"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["verdict"] == "safe"
    assert data["risk_score"] < 30

    # 3. Check listing recent scans
    scans_resp = await client.get("/v1/phishradar/scans", headers=auth_headers)
    assert scans_resp.status_code == 200
    scans = scans_resp.json()
    assert len(scans) >= 2


@pytest.mark.asyncio
async def test_domain_monitoring_and_takedown_workflow(
    client: httpx.AsyncClient, token: Callable[..., str]
) -> None:
    op_headers = privileged(token, "analyst")
    cit_headers = headers(token, "citizen")

    # Citizen cannot trigger CT-log simulation
    forbidden_sim = await client.post("/v1/phishradar/monitor/simulate", headers=cit_headers)
    assert forbidden_sim.status_code == 403

    # Operator triggers CT-log simulation
    sim_resp = await client.post("/v1/phishradar/monitor/simulate", headers=op_headers)
    assert sim_resp.status_code == 200
    alert = sim_resp.json()
    assert "irctc" in alert["detected_lookalike"]
    assert alert["status"] == "flagged"

    # List monitor alerts
    list_alerts = await client.get("/v1/phishradar/monitor", headers=op_headers)
    assert list_alerts.status_code == 200
    assert len(list_alerts.json()) >= 1

    # Operator creates a takedown case
    takedown_resp = await client.post(
        "/v1/takedowns",
        json={
            "target_domain": alert["detected_lookalike"],
            "registrar": "Example Registrar LLC",
            "evidence_summary": "Phishing domain detected via CT-log mimicking IRCTC booking.",
        },
        headers=op_headers,
    )
    assert takedown_resp.status_code == 201
    case = takedown_resp.json()
    case_id = case["id"]
    assert case["status"] == "draft"

    # Update takedown status
    update_resp = await client.post(
        f"/v1/takedowns/{case_id}/status",
        json={"status": "reported", "note": "Report submitted to registrar abuse contact."},
        headers=op_headers,
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["status"] == "reported"

    # List takedowns
    list_takedowns = await client.get("/v1/takedowns", headers=op_headers)
    assert list_takedowns.status_code == 200
    assert len(list_takedowns.json()) >= 1
