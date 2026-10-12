from collections.abc import Callable
import httpx
import pytest
from tests.test_registry import headers

@pytest.mark.asyncio
async def test_slo_metrics_healthy(
    client: httpx.AsyncClient,
    token: Callable[..., str],
) -> None:
    auth_headers = headers(token, role="citizen")
    response = await client.get("/v1/resilience/slo", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["target_slo_percent"] == 99.9
    assert data["measured_uptime_percent"] >= 99.9
    assert data["status"] == "HEALTHY"
    assert data["error_budget_remaining_percent"] > 50.0
    assert data["latency_percentiles"]["p50_ms"] < 2.0
    assert data["latency_percentiles"]["p99_ms"] < 10.0


@pytest.mark.asyncio
async def test_benchmark_exceeds_50k_rps(
    client: httpx.AsyncClient,
    token: Callable[..., str],
) -> None:
    auth_headers = headers(token, role="citizen")
    response = await client.post(
        "/v1/resilience/benchmark/verify",
        headers=auth_headers,
        json={"concurrency": 1000, "duration_seconds": 5, "cache_enabled": True}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["simulated_rps"] >= 50000
    assert data["failed_requests"] == 0
    assert data["cache_hit_ratio"] >= 0.99
    assert data["p50_latency_ms"] < 1.0
    assert data["verdict"] == "CAPACITY_VERIFIED_EXCEEDS_50K_RPS"


@pytest.mark.asyncio
async def test_benchmark_uncached(
    client: httpx.AsyncClient,
    token: Callable[..., str],
) -> None:
    auth_headers = headers(token, role="citizen")
    response = await client.post(
        "/v1/resilience/benchmark/verify",
        headers=auth_headers,
        json={"concurrency": 200, "duration_seconds": 2, "cache_enabled": False}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["simulated_rps"] > 10000
    assert data["cache_hit_ratio"] == 0.0


@pytest.mark.asyncio
async def test_dr_status_sla_compliance(
    client: httpx.AsyncClient,
    token: Callable[..., str],
) -> None:
    auth_headers = headers(token, role="citizen")
    response = await client.get("/v1/resilience/dr/status", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "ap-south-1" in data["primary_region"]
    assert data["rpo_measured_minutes"] <= data["rpo_sla_minutes"]
    assert data["rto_measured_minutes"] <= data["rto_sla_minutes"]
    assert data["blue_green"]["active_slot"] == "BLUE"
    assert data["blue_green"]["switchover_ready"] is True


@pytest.mark.asyncio
async def test_dr_drill_execution(
    client: httpx.AsyncClient,
    token: Callable[..., str],
) -> None:
    auth_headers = headers(token, role="operator")
    response = await client.post("/v1/resilience/dr/drill", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "COMPLETED_SUCCESSFULLY"
    assert data["drill_id"].startswith("DR-DRILL-")
    assert len(data["checks"]) == 4
    for check in data["checks"]:
        assert check["status"] == "PASSED"


@pytest.mark.asyncio
async def test_security_audit_zero_high_critical(
    client: httpx.AsyncClient,
    token: Callable[..., str],
) -> None:
    auth_headers = headers(token, role="citizen")
    response = await client.get("/v1/resilience/security/audit", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["overall_security_grade"] == "A+"
    assert data["critical_vulnerabilities"] == 0
    assert data["high_vulnerabilities"] == 0
    categories = {item["stride_category"] for item in data["stride_matrix"]}
    assert categories == {"Spoofing", "Tampering", "Repudiation", "Information Disclosure", "Denial of Service", "Elevation of Privilege"}


@pytest.mark.asyncio
async def test_cost_metrics(
    client: httpx.AsyncClient,
    token: Callable[..., str],
) -> None:
    auth_headers = headers(token, role="citizen")
    response = await client.get("/v1/resilience/cost", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["monthly_estimated_inr"] > 0
    assert data["currency"] == "INR"
    assert len(data["infrastructure_breakdown"]) > 0
