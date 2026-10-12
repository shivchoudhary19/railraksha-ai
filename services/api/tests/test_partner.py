from collections.abc import Callable
import httpx
import pytest
from tests.test_registry import headers

@pytest.mark.asyncio
async def test_create_sandbox_api_key(
    client: httpx.AsyncClient,
    token: Callable[..., str],
) -> None:
    auth_headers = headers(token, role="citizen")
    response = await client.post(
        "/v1/partner/keys/create-sandbox",
        headers=auth_headers,
        json={
            "organization_name": "Bharat FinTech Labs",
            "developer_email": "dev@bharatfintech.in",
            "use_case": "BANKING_UPI"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["api_key"].startswith("rr_test_")
    assert data["tier"] == "SANDBOX"
    assert data["quota_limit_per_day"] == 10000
    assert "curl" in data["quickstart_curl"]
    assert "RailRakshaClient" in data["quickstart_typescript"]


@pytest.mark.asyncio
async def test_partner_verify_official_and_scam(
    client: httpx.AsyncClient,
    token: Callable[..., str],
) -> None:
    auth_headers = headers(token, role="citizen")
    # 1. Official domain
    resp_off = await client.get(
        "/v1/partner/verify?identifier=irctc.co.in",
        headers={**auth_headers, "X-API-Key": "rr_test_sandbox_123456"}
    )
    assert resp_off.status_code == 200
    data_off = resp_off.json()
    assert data_off["classification"] == "OFFICIAL"
    assert data_off["recommended_action"] == "ALLOW"
    assert data_off["risk_score"] == 0

    # 2. Phishing scam domain
    resp_scam = await client.get(
        "/v1/partner/verify?identifier=irctc-refund-help.shop",
        headers={**auth_headers, "X-API-Key": "rr_test_sandbox_123456"}
    )
    assert resp_scam.status_code == 200
    data_scam = resp_scam.json()
    assert data_scam["classification"] == "BLOCKED"
    assert data_scam["recommended_action"] == "BLOCK_TRANSACTION"
    assert data_scam["risk_score"] >= 90

    # 3. Unknown domain
    resp_unk = await client.get(
        "/v1/partner/verify?identifier=unregistered-service.xyz",
        headers={**auth_headers, "X-API-Key": "rr_test_sandbox_123456"}
    )
    assert resp_unk.status_code == 200
    data_unk = resp_unk.json()
    assert data_unk["classification"] == "UNKNOWN"
    assert data_unk["recommended_action"] == "WARN_USER"


@pytest.mark.asyncio
async def test_partner_url_scan(
    client: httpx.AsyncClient,
    token: Callable[..., str],
) -> None:
    auth_headers = headers(token, role="citizen")
    resp = await client.post(
        "/v1/partner/url/scan",
        headers={**auth_headers, "X-API-Key": "rr_test_sandbox_123456"},
        json={"url": "https://irctc-refund-secure.online/claim"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["is_phishing"] is True
    assert data["recommended_action"] == "BLOCK"
    assert data["risk_score"] > 80


@pytest.mark.asyncio
async def test_partner_message_analyze(
    client: httpx.AsyncClient,
    token: Callable[..., str],
) -> None:
    auth_headers = headers(token, role="citizen")
    # APK scam
    resp = await client.post(
        "/v1/partner/message/analyze",
        headers={**auth_headers, "X-API-Key": "rr_test_sandbox_123456"},
        json={"message_text": "Download our telegram apk for guaranteed tatkal booking ticket"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["is_fraud"] is True
    assert data["fraud_category"] == "TELEGRAM_APK_SCAM"

    # Benign message
    resp_benign = await client.post(
        "/v1/partner/message/analyze",
        headers={**auth_headers, "X-API-Key": "rr_test_sandbox_123456"},
        json={"message_text": "Your train 12952 departs New Delhi at 16:55"}
    )
    assert resp_benign.status_code == 200
    data_benign = resp_benign.json()
    assert data_benign["is_fraud"] is False


@pytest.mark.asyncio
async def test_get_stix_threat_feed(
    client: httpx.AsyncClient,
    token: Callable[..., str],
) -> None:
    auth_headers = headers(token, role="citizen")
    resp = await client.get(
        "/v1/partner/feed/stix2",
        headers={**auth_headers, "X-API-Key": "rr_live_demo_key_998877"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["type"] == "bundle"
    assert data["spec_version"] == "2.1"
    assert len(data["objects"]) >= 2
    types = {obj["type"] for obj in data["objects"]}
    assert "indicator" in types
    assert "identity" in types


@pytest.mark.asyncio
async def test_list_tenants_operator(
    client: httpx.AsyncClient,
    token: Callable[..., str],
) -> None:
    auth_headers = headers(token, role="analyst")
    resp = await client.get("/v1/partner/tenants", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 3
    tenant_ids = {t["tenant_id"] for t in data}
    assert "TENANT-GOV-CERT-IN" in tenant_ids


@pytest.mark.asyncio
async def test_webhook_test_dispatch(
    client: httpx.AsyncClient,
    token: Callable[..., str],
) -> None:
    auth_headers = headers(token, role="citizen")
    resp = await client.post(
        "/v1/partner/webhooks/test",
        headers={**auth_headers, "X-API-Key": "rr_test_sandbox_123456"},
        json={
            "webhook_url": "https://fintech-bank.in/security/webhooks",
            "event_type": "THREAT_DETECTED"
        }
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "DELIVERED"
    assert data["http_status"] == 200
    assert data["dispatched_payload"]["threat_severity"] == "CRITICAL"


@pytest.mark.asyncio
async def test_kpi_metrics(
    client: httpx.AsyncClient,
    token: Callable[..., str],
) -> None:
    auth_headers = headers(token, role="citizen")
    resp = await client.get("/v1/partner/metrics/kpis", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_verifications_count"] > 10000000
    assert data["estimated_fraud_loss_prevented_inr"] > 10000000
    assert data["fake_domains_dismantled"] > 1000
    assert data["platform_uptime_percent"] >= 99.9
