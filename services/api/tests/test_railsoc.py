from collections.abc import Callable
from typing import Any

import httpx
import pytest

from railraksha.railsoc import (
    SIGMA_RULES,
    build_cert_in_report_draft,
    evaluate_event_against_rules,
)
from tests.test_registry import headers


def test_sigma_detection_rules_benign() -> None:
    benign_event: dict[str, Any] = {
        "source": "kavach_radio",
        "event_type": "heartbeat",
        "severity": "low",
        "payload": {
            "authorized_crypto_key": True,
            "target_loco": "WAP-7-30219",
        },
    }
    matches = evaluate_event_against_rules(benign_event)
    assert len(matches) == 0


def test_sigma_detection_rules_attacks() -> None:
    # 1. SIGMA-RAIL-001: Radio Emergency Stop injection
    atk1: dict[str, Any] = {
        "source": "kavach_radio",
        "event_type": "radio_emergency_stop",
        "payload": {
            "command": "EMERGENCY_STOP",
            "authorized_crypto_key": False,
        },
    }
    m1 = evaluate_event_against_rules(atk1)
    assert len(m1) >= 1
    assert any(r["rule_id"] == "SIGMA-RAIL-001" for r in m1)

    # 2. SIGMA-RAIL-002: Modbus Point Machine Coil Tampering
    atk2: dict[str, Any] = {
        "source": "interlocking_scada",
        "event_type": "modbus_write_coil",
        "payload": {"function_code": 5, "point_machine_locked": True},
    }
    m2 = evaluate_event_against_rules(atk2)
    assert any(r["rule_id"] == "SIGMA-RAIL-002" for r in m2)

    # 3. SIGMA-RAIL-003: Privilege Escalation on Passenger Booking Core
    atk3: dict[str, Any] = {
        "source": "auth_gateway",
        "event_type": "role_assignment",
        "payload": {"action": "ADMIN_GRANT", "actor_role": "travel_agent"},
    }
    m3 = evaluate_event_against_rules(atk3)
    assert any(r["rule_id"] == "SIGMA-RAIL-003" for r in m3)

    # 4. SIGMA-RAIL-004: Bulk Data Exfiltration Anomaly on PNR Store
    atk4: dict[str, Any] = {
        "source": "pnr_store",
        "event_type": "bulk_query",
        "payload": {"record_count": 5500, "src_ip": "10.240.5.21"},
    }
    m4 = evaluate_event_against_rules(atk4)
    assert any(r["rule_id"] == "SIGMA-RAIL-004" for r in m4)

    # 5. SIGMA-RAIL-005: Rogue Device on Signalling VLAN
    atk5: dict[str, Any] = {
        "source": "network_switch",
        "event_type": "rogue_device_connected",
        "payload": {"vlan_id": 100, "mac_vendor": "unknown"},
    }
    m5 = evaluate_event_against_rules(atk5)
    assert any(r["rule_id"] == "SIGMA-RAIL-005" for r in m5)


def test_build_cert_in_report_draft() -> None:
    dossier = build_cert_in_report_draft(
        incident_id="INC-TEST-001",
        title="Unauthorized Radio Injection on Kavach Channel",
        severity="critical",
        mitre_id="T0885",
        iocs=["10.242.8.99", "UHF 441.8MHz"],
        evidence={"spoofed_frames": 14, "failsafe": "Hardware interlock engaged"},
    )
    assert dossier["incident_reference"] == "INC-TEST-001"
    assert "CERT-In Cyber Security Incident Reporting Form" in dossier["format"]
    assert dossier["reporting_timeline_hours"] == 6
    assert "chain_of_custody_hash" in dossier
    assert len(dossier["chain_of_custody_hash"]) == 64
    assert dossier["affected_critical_sector"] == "Transportation / Critical National Infrastructure"


@pytest.mark.asyncio
async def test_event_ingestion_api(
    client: httpx.AsyncClient,
    token: Callable[..., str],
) -> None:
    auth_headers = headers(token, role="staff")

    # 1. Ingest benign event
    resp_benign = await client.post(
        "/v1/soc/events/ingest",
        headers=auth_headers,
        json={
            "events": [
                {
                    "source": "kavach_radio",
                    "event_type": "heartbeat",
                    "severity": "low",
                    "payload": {"authorized_crypto_key": True, "target_loco": "WAP-7-30219"},
                }
            ]
        },
    )
    assert resp_benign.status_code == 200
    data_benign = resp_benign.json()
    assert data_benign["total_ingested"] == 1
    assert data_benign["alerts_triggered"] == 0
    assert len(data_benign["triggered_alerts"]) == 0

    # 2. Ingest attack event (SIGMA-RAIL-001)
    resp_atk = await client.post(
        "/v1/soc/events/ingest",
        headers=auth_headers,
        json={
            "events": [
                {
                    "source": "kavach_radio",
                    "event_type": "radio_emergency_stop",
                    "severity": "critical",
                    "payload": {
                        "command": "EMERGENCY_STOP",
                        "authorized_crypto_key": False,
                        "ip_address": "10.242.8.99",
                    },
                }
            ]
        },
    )
    assert resp_atk.status_code == 200
    data_atk = resp_atk.json()
    assert data_atk["total_ingested"] == 1
    assert data_atk["alerts_triggered"] >= 1
    assert len(data_atk["triggered_alerts"]) >= 1


@pytest.mark.asyncio
async def test_alerts_and_incident_promotion_flow(
    client: httpx.AsyncClient,
    token: Callable[..., str],
) -> None:
    auth_headers = headers(token, role="staff")

    # Ingest attack to generate an alert
    resp = await client.post(
        "/v1/soc/events/ingest",
        headers=auth_headers,
        json={
            "events": [
                {
                    "source": "interlocking_scada",
                    "event_type": "modbus_write_coil",
                    "severity": "critical",
                    "payload": {
                        "function_code": 5,
                        "point_machine_locked": True,
                        "ip_address": "10.240.12.88",
                    },
                }
            ]
        },
    )
    assert resp.status_code == 200
    alerts = resp.json()["triggered_alerts"]
    assert len(alerts) >= 1
    target_alert_id = alerts[0]["alert_id"]

    # Query alerts list
    resp_alerts = await client.get("/v1/soc/alerts", headers=auth_headers)
    assert resp_alerts.status_code == 200
    alert_list = resp_alerts.json()
    assert any(a["alert_id"] == target_alert_id for a in alert_list)

    # Promote alert to official incident
    resp_promote = await client.post(
        f"/v1/soc/alerts/{target_alert_id}/promote",
        headers=auth_headers,
        json={
            "assigned_analyst": "RPF-Cyber-Lead",
            "auto_execute_playbook": True,
        },
    )
    assert resp_promote.status_code == 200
    inc_data = resp_promote.json()
    assert inc_data["status"] == "active"
    assert inc_data["cert_in_reported"] is True
    assert "INC-" in inc_data["incident_id"]
    assert inc_data["cert_in_dossier"]["reporting_timeline_hours"] == 6


@pytest.mark.asyncio
async def test_ot_signalling_nodes_api(
    client: httpx.AsyncClient,
    token: Callable[..., str],
) -> None:
    auth_headers = headers(token, role="staff")
    resp = await client.get("/v1/soc/ot/nodes", headers=auth_headers)
    assert resp.status_code == 200
    nodes = resp.json()
    assert isinstance(nodes, list)
    assert len(nodes) >= 3
    node_names = [n["node_id"] for n in nodes]
    assert any("KAVACH" in name for name in node_names)
    assert any("NDLS-EI-01" in name for name in node_names)


@pytest.mark.asyncio
async def test_cyber_physical_attack_simulation(
    client: httpx.AsyncClient,
    token: Callable[..., str],
) -> None:
    auth_headers = headers(token, role="staff")

    # 1. Spoofed radio stop
    resp1 = await client.post(
        "/v1/soc/ot/simulate-attack",
        headers=auth_headers,
        json={"scenario": "spoofed_radio_stop", "target_node_id": "KAVACH-SEC-RADIO-04"},
    )
    assert resp1.status_code == 200
    d1 = resp1.json()
    assert d1["scenario"] == "spoofed_radio_stop"
    assert d1["mitre_attack_id"] == "T0885"
    assert "KAVACH FAILSAFE ENGAGED" in d1["kavach_safety_interlock"]
    assert d1["incident_id"] is not None

    # 2. PLC interlocking tamper
    resp2 = await client.post(
        "/v1/soc/ot/simulate-attack",
        headers=auth_headers,
        json={"scenario": "plc_interlocking_tamper", "target_node_id": "NDLS-EI-01"},
    )
    assert resp2.status_code == 200
    d2 = resp2.json()
    assert d2["scenario"] == "plc_interlocking_tamper"
    assert d2["mitre_attack_id"] == "T0855"
    assert "INTERLOCKING HARDWARE LOCK ENFORCED" in d2["kavach_safety_interlock"]

    # 3. Rogue VLAN device
    resp3 = await client.post(
        "/v1/soc/ot/simulate-attack",
        headers=auth_headers,
        json={"scenario": "rogue_vlan_device", "target_node_id": "WR-SCADA-PWR-02"},
    )
    assert resp3.status_code == 200
    d3 = resp3.json()
    assert d3["scenario"] == "rogue_vlan_device"
    assert "NETWORK ACCESS CONTROL" in d3["kavach_safety_interlock"]


@pytest.mark.asyncio
async def test_high_throughput_ingest_benchmark(
    client: httpx.AsyncClient,
    token: Callable[..., str],
) -> None:
    auth_headers = headers(token, role="staff")
    resp = await client.post(
        "/v1/soc/benchmark/ingest",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    bench = resp.json()
    assert bench["events_generated"] == 5000
    assert bench["events_ingested"] == 5000
    assert bench["throughput_events_per_sec"] > 1000.0
    assert bench["average_latency_ms"] < 2.0
    assert bench["alerts_generated"] >= 50
    assert "PASSED" in bench["verdict"]


@pytest.mark.asyncio
async def test_soc_dashboard_stats(
    client: httpx.AsyncClient,
    token: Callable[..., str],
) -> None:
    auth_headers = headers(token, role="staff")
    resp = await client.get("/v1/soc/dashboard/stats", headers=auth_headers)
    assert resp.status_code == 200
    stats = resp.json()
    assert "total_alerts" in stats
    assert "critical_alerts" in stats
    assert "total_incidents" in stats
    assert "mean_time_to_respond_minutes" in stats
    assert "kavach_interlock_health_percent" in stats
    assert "top_mitre_techniques" in stats
    assert isinstance(stats["top_mitre_techniques"], list)
