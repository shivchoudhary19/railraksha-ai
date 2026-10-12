import hashlib
from collections.abc import Callable

import httpx
import pytest

from railraksha.fairqueue import (
    ClientSignalsInput,
    calculate_bot_risk,
    determine_challenge_type,
    generate_pow_challenge,
    verify_pow_solution,
)
from tests.test_registry import headers


def test_bot_risk_calculation_and_friction_tiers() -> None:
    # 1. Human signals
    human_sig = ClientSignalsInput(
        session_id="human-session-test-01",
        window_code="TK-12951-NDLS-MMCT",
        form_fill_ms=4500,
        timing_entropy=0.78,
        is_headless=False,
        asn_type="residential",
        device_hash="device-human-hash-1234",
        request_velocity=4,
    )
    score, reasons = calculate_bot_risk(human_sig)
    challenge, level = determine_challenge_type(score)
    assert score < 30
    assert challenge == "none"
    assert level == "low"
    assert "Normal human behavioral signals" in reasons[0]

    # 2. Medium risk: slightly fast, low timing entropy
    medium_sig = ClientSignalsInput(
        session_id="medium-session-test-02",
        window_code="TK-12951-NDLS-MMCT",
        form_fill_ms=1200,
        timing_entropy=0.28,
        is_headless=False,
        asn_type="residential",
        device_hash="device-hash-5678",
        request_velocity=12,
    )
    m_score, _ = calculate_bot_risk(medium_sig)
    m_challenge, m_level = determine_challenge_type(m_score)
    assert 30 <= m_score <= 60
    assert m_challenge == "proof_of_work"
    assert m_level == "medium"

    # 3. Critical bot: Headless + Datacenter ASN + Sub-800ms speed + Tout script
    bot_sig = ClientSignalsInput(
        session_id="bot-session-test-03",
        window_code="TK-12951-NDLS-MMCT",
        form_fill_ms=250,
        timing_entropy=0.08,
        is_headless=True,
        asn_type="datacenter",
        device_hash="bot-farm-hash-9999",
        request_velocity=85,
        tout_script_detected="SuperTatkal Pro v4.2",
    )
    b_score, b_reasons = calculate_bot_risk(bot_sig)
    b_challenge, b_level = determine_challenge_type(b_score)
    assert b_score >= 85
    assert b_challenge == "blocked"
    assert b_level == "critical"
    assert any("Sub-human form-fill" in r for r in b_reasons)
    assert any("navigator.webdriver" in r for r in b_reasons)
    assert any("Blacklisted Tatkal tout" in r for r in b_reasons)


def test_pow_micro_puzzle_generator_and_verifier() -> None:
    session_id = "test-pow-session-abc"
    token = generate_pow_challenge(session_id)
    assert len(token) == 16

    # Solve the micro-puzzle (find nonce starting with "0000")
    solved_nonce = None
    for nonce in range(500000):
        if verify_pow_solution(token, nonce):
            solved_nonce = nonce
            break

    assert solved_nonce is not None
    assert verify_pow_solution(token, solved_nonce) is True
    assert verify_pow_solution(token, solved_nonce + 1) is False


@pytest.mark.asyncio
async def test_evaluate_signals_and_solve_challenge(
    client: httpx.AsyncClient, token: Callable[..., str]
) -> None:
    # 1. Evaluate human signals
    human_payload = {
        "session_id": "sess-eval-human-9999",
        "window_code": "TK-12951-NDLS-MMCT",
        "form_fill_ms": 5200,
        "timing_entropy": 0.82,
        "is_headless": False,
        "asn_type": "residential",
        "device_hash": "device-sess-eval-hash-01",
        "request_velocity": 3,
    }
    resp = await client.post("/v1/fairqueue/evaluate-signals", json=human_payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["bot_risk_score"] < 30
    assert data["risk_level"] == "low"
    assert data["challenge_type"] == "none"
    assert data["is_admitted"] is True

    # 2. Evaluate medium risk signals requiring PoW
    pow_payload = {
        "session_id": "sess-eval-pow-8888",
        "window_code": "TK-12951-NDLS-MMCT",
        "form_fill_ms": 1100,
        "timing_entropy": 0.25,
        "is_headless": False,
        "asn_type": "residential",
        "device_hash": "device-sess-eval-hash-02",
        "request_velocity": 10,
    }
    p_resp = await client.post("/v1/fairqueue/evaluate-signals", json=pow_payload)
    assert p_resp.status_code == 200
    p_data = p_resp.json()
    assert p_data["challenge_type"] == "proof_of_work"
    assert p_data["challenge_token"] is not None
    ch_token = p_data["challenge_token"]

    # Solve PoW
    found_nonce = None
    for n in range(1000000):
        h = hashlib.sha256(f"{ch_token}:{n}".encode()).hexdigest()
        if h.startswith("0000"):
            found_nonce = n
            break
    assert found_nonce is not None

    solve_payload = {
        "session_id": "sess-eval-pow-8888",
        "challenge_token": ch_token,
        "nonce": found_nonce,
    }
    s_resp = await client.post("/v1/fairqueue/solve-challenge", json=solve_payload)
    assert s_resp.status_code == 200
    s_data = s_resp.json()
    assert s_data["challenge_solved"] is True
    assert s_data["status"] == "verified"


@pytest.mark.asyncio
async def test_waiting_room_lifecycle(client: httpx.AsyncClient, token: Callable[..., str]) -> None:
    auth_headers = headers(token, "citizen")

    # 1. Join queue with valid human signals
    join_payload = {
        "window_code": "TK-12004-NDLS-LKO",
        "session_id": "citizen-waiting-sess-1111",
        "signals": {
            "session_id": "citizen-waiting-sess-1111",
            "window_code": "TK-12004-NDLS-LKO",
            "form_fill_ms": 4200,
            "timing_entropy": 0.74,
            "is_headless": False,
            "asn_type": "residential",
            "device_hash": "dev-citizen-waiting-hash",
            "request_velocity": 2,
        },
    }
    join_resp = await client.post(
        "/v1/fairqueue/waiting-room/join", json=join_payload, headers=auth_headers
    )
    assert join_resp.status_code == 200
    join_data = join_resp.json()
    assert join_data["window_code"] == "TK-12004-NDLS-LKO"
    assert join_data["queue_status"] in ["admitted", "waiting"]
    assert join_data["assigned_rank"] >= 1
    assert join_data["challenge_type"] == "none"

    # 2. Check queue status
    status_resp = await client.get(
        "/v1/fairqueue/waiting-room/status?window_code=TK-12004-NDLS-LKO&session_id=citizen-waiting-sess-1111"
    )
    assert status_resp.status_code == 200
    stat_data = status_resp.json()
    assert stat_data["assigned_rank"] == join_data["assigned_rank"]

    # 3. Blocked tout joining queue
    bot_join_payload = {
        "window_code": "TK-12004-NDLS-LKO",
        "session_id": "tout-bot-waiting-sess-2222",
        "signals": {
            "session_id": "tout-bot-waiting-sess-2222",
            "window_code": "TK-12004-NDLS-LKO",
            "form_fill_ms": 150,
            "timing_entropy": 0.05,
            "is_headless": True,
            "asn_type": "datacenter",
            "device_hash": "dev-tout-farm-hash",
            "request_velocity": 80,
            "tout_script_detected": "TatkalNow Automator",
        },
    }
    bot_resp = await client.post(
        "/v1/fairqueue/waiting-room/join", json=bot_join_payload, headers=auth_headers
    )
    assert bot_resp.status_code == 200
    b_data = bot_resp.json()
    assert b_data["queue_status"] == "blocked"
    assert b_data["challenge_type"] == "blocked"


@pytest.mark.asyncio
async def test_tatkal_fairness_simulation_and_metrics(
    client: httpx.AsyncClient, token: Callable[..., str]
) -> None:
    sim_payload = {
        "num_bots": 200,
        "num_humans": 50,
        "quota_seats": 40,
        "lottery_window_seconds": 15,
    }
    resp = await client.post("/v1/fairqueue/simulate", json=sim_payload)
    assert resp.status_code == 200
    data = resp.json()

    # Acceptance criteria verification from master prompt:
    # 1. >= 95% bot detection rate
    assert data["bot_detection_rate"] >= 95.0
    # 2. <= 1% human false positive rate
    assert data["human_false_positive_rate"] <= 1.0
    # 3. Traditional FIFO: bots capture vast majority of seats
    assert data["traditional_fifo"]["seats_captured_by_bots"] >= 35
    # 4. FairQueue Lottery: humans capture majority or all seats, bots neutralized
    assert data["fairqueue_lottery"]["seats_captured_by_humans"] >= 35
    assert data["fairqueue_lottery"]["seats_captured_by_bots"] <= 5
    # 5. Acceptance verdict
    assert "ACCEPTED" in data["verdict"]


@pytest.mark.asyncio
async def test_operator_analytics_and_rpf_export(
    client: httpx.AsyncClient, token: Callable[..., str]
) -> None:
    op_headers = headers(token, "soc_lead")

    # 1. Operator Analytics
    resp = await client.get("/v1/fairqueue/operator/analytics", headers=op_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_windows"] >= 1
    assert data["total_entries"] >= 1
    assert "SuperTatkal Pro" in data["blocked_tout_software"]
    assert len(data["device_cluster_risk"]) >= 1

    # 2. RPF Cyber Evidence Export
    rpf_resp = await client.get("/v1/fairqueue/operator/rpf-export", headers=op_headers)
    assert rpf_resp.status_code == 200
    rpf_data = rpf_resp.json()
    assert "RPF-CYBER-EVIDENCE-" in rpf_data["report_id"]
    assert "Railway Protection Force" in rpf_data["jurisdiction"]
    assert "Section 143" in rpf_data["investigation_summary"]
    assert len(rpf_data["threat_actors_identified"]) >= 2
    assert rpf_data["compliance_certifications"]["chain_of_custody_maintained"] is True


@pytest.mark.asyncio
async def test_citizen_appeal_flow(client: httpx.AsyncClient, token: Callable[..., str]) -> None:
    appeal_payload = {
        "session_id": "citizen-waiting-sess-1111",
        "email_or_phone": "sharma.family@gmail.com",
        "explanation": "I am traveling to Lucknow for medical treatment. Please unblock.",
    }
    resp = await client.post("/v1/fairqueue/appeal", json=appeal_payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "received"
    assert data["appeal_ticket"].startswith("APL-")
    assert "Cyber team reviews" in data["message"]
