from collections.abc import Callable
import httpx
import pytest
from tests.test_registry import headers

@pytest.mark.asyncio
async def test_federated_status(
    client: httpx.AsyncClient,
) -> None:
    response = await client.get("/v1/advanced-rd/federated/status")
    assert response.status_code == 200
    data = response.json()
    assert data["model_version"] == "v4.2.0-fl"
    assert data["participating_edge_devices"] >= 10000
    assert data["differential_privacy_epsilon"] == 0.50
    assert data["status"] == "TRAINING_CONVERGED"


@pytest.mark.asyncio
async def test_submit_federated_round(
    client: httpx.AsyncClient,
) -> None:
    response = await client.post(
        "/v1/advanced-rd/federated/round",
        json={
            "device_id": "pixel-9-pro-mumbai",
            "local_samples_count": 150,
            "local_loss": 0.042,
            "gradient_norm": 0.15,
            "clip_threshold": 1.0,
            "differential_privacy_noise": True,
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["accepted"] is True
    assert data["dp_noise_added"] > 0
    assert data["status"] == "WEIGHT_AGGREGATED_SECURE_FEDAVG"
    assert "Gradients clipped" in data["client_feedback"]


@pytest.mark.asyncio
async def test_ivr_call_verify_official_and_scam(
    client: httpx.AsyncClient,
) -> None:
    # 1. Official Railway helpline 139 in Hindi
    resp_off = await client.post(
        "/v1/advanced-rd/ivr/call-verify",
        json={
            "caller_number": "+919876543210",
            "language": "hi-IN",
            "query_input": "139",
            "input_type": "DTMF_DIGITS",
        },
    )
    assert resp_off.status_code == 200
    data_off = resp_off.json()
    assert data_off["classification"] == "OFFICIAL"
    assert data_off["risk_score"] == 0
    assert "आधिकारिक और सुरक्षित" in data_off["audio_script"]
    assert "<speak>" in data_off["ssml_markup"]

    # 2. Scam Tatkal refund link in English
    resp_scam = await client.post(
        "/v1/advanced-rd/ivr/call-verify",
        json={
            "caller_number": "+919425012345",
            "language": "en-IN",
            "query_input": "refund.irctc@oksbi",
            "input_type": "SPEECH_TEXT",
        },
    )
    assert resp_scam.status_code == 200
    data_scam = resp_scam.json()
    assert data_scam["classification"] == "SCAM_ALERT"
    assert data_scam["risk_score"] >= 90
    assert "suspected railway scam" in data_scam["audio_script"]
    assert "Never share" in data_scam["safety_guidance"]


@pytest.mark.asyncio
async def test_ivr_call_multilingual_parity(
    client: httpx.AsyncClient,
) -> None:
    for lang in ["ta-IN", "te-IN", "bn-IN", "mr-IN"]:
        resp = await client.post(
            "/v1/advanced-rd/ivr/call-verify",
            json={
                "caller_number": "+919988776655",
                "language": lang,
                "query_input": "irctc-refund-fake.site",
                "input_type": "SPEECH_TEXT",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["classification"] == "SCAM_ALERT"
        assert len(data["audio_script"]) > 10
        assert "<speak>" in data["ssml_markup"]


@pytest.mark.asyncio
async def test_ivr_history(
    client: httpx.AsyncClient,
) -> None:
    resp = await client.get("/v1/advanced-rd/ivr/history")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert "session_id" in data[0]


@pytest.mark.asyncio
async def test_telecom_header_verify(
    client: httpx.AsyncClient,
) -> None:
    # 1. Registered DLT Header
    resp_dlt = await client.post(
        "/v1/advanced-rd/telecom/header-verify",
        json={"sms_header": "VM-IRCTC", "message_sample": "Your PNR 1234567890 is confirmed."},
    )
    assert resp_dlt.status_code == 200
    data_dlt = resp_dlt.json()
    assert data_dlt["dlt_registered"] is True
    assert data_dlt["verdict"] == "OFFICIAL_DLT_VERIFIED"
    assert data_dlt["telecom_action"] == "DELIVER"

    # 2. Spoofed Header
    resp_spoof = await client.post(
        "/v1/advanced-rd/telecom/header-verify",
        json={"sms_header": "IRCTCi", "message_sample": "Click here to claim refund."},
    )
    assert resp_spoof.status_code == 200
    data_spoof = resp_spoof.json()
    assert data_spoof["spoof_detected"] is True
    assert data_spoof["verdict"] == "SPOOFED_UNAUTHORIZED_HEADER"
    assert data_spoof["telecom_action"] == "BLOCK_IMMEDIATELY"


@pytest.mark.asyncio
async def test_upi_verify_vpa(
    client: httpx.AsyncClient,
) -> None:
    # 1. Official Merchant
    resp_off = await client.post(
        "/v1/advanced-rd/upi/verify-vpa",
        json={"vpa_handle": "irctc@icici", "amount_inr": 1250.0},
    )
    assert resp_off.status_code == 200
    data_off = resp_off.json()
    assert data_off["is_official_railway_merchant"] is True
    assert data_off["risk_level"] == "LOW_VERIFIED"
    assert data_off["recommended_action"] == "ALLOW_PAYMENT"

    # 2. Phishing Collect Request
    resp_phish = await client.post(
        "/v1/advanced-rd/upi/verify-vpa",
        json={"vpa_handle": "refund.irctc@oksbi", "amount_inr": 2500.0},
    )
    assert resp_phish.status_code == 200
    data_phish = resp_phish.json()
    assert data_phish["is_official_railway_merchant"] is False
    assert data_phish["risk_level"] == "CRITICAL_PHISHING"
    assert data_phish["recommended_action"] == "BLOCK_AND_WARN_USER"


@pytest.mark.asyncio
async def test_graph_fraud_rings(
    client: httpx.AsyncClient,
) -> None:
    resp = await client.get("/v1/advanced-rd/graph/fraud-rings")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_active_syndicates"] >= 2
    assert data["total_nodes_tracked"] >= 8
    assert data["total_edges_mapped"] >= 6
    assert data["syndicates"][0]["syndicate_id"] == "SYN-JAM-01"
    assert data["syndicates"][0]["risk_level"] == "CRITICAL"


@pytest.mark.asyncio
async def test_drift_metrics_and_bug_bounty(
    client: httpx.AsyncClient,
) -> None:
    # Drift
    resp_drift = await client.get("/v1/advanced-rd/drift/metrics")
    assert resp_drift.status_code == 200
    data_drift = resp_drift.json()
    assert data_drift["population_stability_index"] < data_drift["psi_threshold"]
    assert data_drift["drift_detected"] is False

    # Bug Bounty
    resp_bounty = await client.get("/v1/advanced-rd/bug-bounty/leaderboard")
    assert resp_bounty.status_code == 200
    data_bounty = resp_bounty.json()
    assert data_bounty["valid_bounties_awarded"] >= 10
    assert len(data_bounty["researchers"]) >= 4
