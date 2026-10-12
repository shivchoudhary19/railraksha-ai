from collections.abc import Callable
import pytest
import httpx


@pytest.mark.asyncio
async def test_pii_envelope_encryption_and_decryption(
    client: httpx.AsyncClient, token: Callable[..., str]
) -> None:
    # 1. Encrypt PII
    encrypt_res = await client.post(
        "/v1/privacy/vault/encrypt",
        json={
            "plaintext_data": "+91-9876543210",
            "classification": "PHONE_NUMBER_PII",
        },
    )
    assert encrypt_res.status_code == 200
    data = encrypt_res.json()
    assert data["vault_token"].startswith("TOK-PII-")
    assert data["key_version"] == 1
    assert len(data["blind_index_hash"]) == 64

    vault_token = data["vault_token"]

    # 2. Decrypt PII
    decrypt_res = await client.post(
        "/v1/privacy/vault/decrypt",
        json={"vault_token": vault_token},
    )
    assert decrypt_res.status_code == 200
    dec_data = decrypt_res.json()
    assert dec_data["plaintext_data"] == "+91-9876543210"
    assert dec_data["classification"] == "PHONE_NUMBER_PII"


@pytest.mark.asyncio
async def test_key_rotation_without_downtime(
    client: httpx.AsyncClient, token: Callable[..., str]
) -> None:
    # 1. Encrypt with v1
    enc = await client.post(
        "/v1/privacy/vault/encrypt",
        json={
            "plaintext_data": "sharma.priya@university.ac.in",
            "classification": "EMAIL_PII",
        },
    )
    vault_token = enc.json()["vault_token"]

    # 2. Rotate to v2
    rot_res = await client.post(
        "/v1/privacy/vault/rotate",
        json={"target_version": 2},
    )
    assert rot_res.status_code == 200
    assert rot_res.json()["target_key_version"] == 2

    # 3. Decrypt with rotated key v2
    dec_res = await client.post(
        "/v1/privacy/vault/decrypt",
        json={"vault_token": vault_token},
    )
    assert dec_res.status_code == 200
    assert dec_res.json()["plaintext_data"] == "sharma.priya@university.ac.in"
    assert dec_res.json()["key_version"] == 2


@pytest.mark.asyncio
async def test_consent_manager_grant_and_receipt(
    client: httpx.AsyncClient, token: Callable[..., str]
) -> None:
    principal = "student-test-dpdp@university.ac.in"
    res = await client.post(
        "/v1/privacy/consent",
        json={
            "principal_id": principal,
            "consents": [
                {"purpose_code": "FRAUD_DETECTION", "is_given": True},
                {"purpose_code": "ANALYTICS", "is_given": False},
            ],
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["consents"]["FRAUD_DETECTION"] is True
    assert data["consents"]["ANALYTICS"] is False
    assert len(data["receipts"]) >= 1
    receipt = data["receipts"][0]
    assert "receipt_id" in receipt
    assert receipt["legal_standard"] == "DPDP Act 2023 Sec 6"
    assert len(receipt["signature"]) == 64


@pytest.mark.asyncio
async def test_dsr_request_and_data_export(
    client: httpx.AsyncClient, token: Callable[..., str]
) -> None:
    principal = "citizen-dsr@railraksha.internal"

    # Submit DSR request
    dsr_res = await client.post(
        "/v1/privacy/dsr/request",
        json={
            "principal_id": principal,
            "request_type": "access_export",
            "details": {"format": "json"},
        },
    )
    assert dsr_res.status_code == 200
    assert dsr_res.json()["request_type"] == "access_export"
    assert dsr_res.json()["status"] == "completed"

    # Execute Data Principal Export
    export_res = await client.get(
        f"/v1/privacy/dsr/export?principal_id={principal}",
    )
    assert export_res.status_code == 200
    exp = export_res.json()
    assert exp["principal_id"] == principal
    assert "Digital Personal Data Protection Act" in exp["compliance_framework"]
    assert exp["data_retention_days"] == 180


@pytest.mark.asyncio
async def test_right_to_erasure_flow(
    client: httpx.AsyncClient, token: Callable[..., str]
) -> None:
    principal = "citizen-to-erase@railraksha.internal"

    # Must fail without confirmation
    fail_res = await client.post(
        "/v1/privacy/dsr/erase",
        json={"principal_id": principal, "confirmation": False},
    )
    assert fail_res.status_code == 400

    # Confirmed erasure
    erase_res = await client.post(
        "/v1/privacy/dsr/erase",
        json={"principal_id": principal, "confirmation": True},
    )
    assert erase_res.status_code == 200
    assert erase_res.json()["status"] == "ERASED_AND_PSEUDONYMIZED"
    assert "audit_chain_hash" in erase_res.json()


@pytest.mark.asyncio
async def test_immutable_audit_chain_integrity(
    client: httpx.AsyncClient, token: Callable[..., str]
) -> None:
    res = await client.get("/v1/privacy/audit/verify")
    assert res.status_code == 200
    data = res.json()
    assert data["is_valid"] is True
    assert data["total_blocks"] >= 1
    assert data["integrity_status"] == "100% UNTAMPERED & VERIFIED"


@pytest.mark.asyncio
async def test_database_privacy_scanner_zero_violations(
    client: httpx.AsyncClient, token: Callable[..., str]
) -> None:
    scan_res = await client.post("/v1/privacy/scanner/scan")
    assert scan_res.status_code == 200
    data = scan_res.json()
    assert data["status"] == "CLEAN_COMPLIANT"
    assert data["plaintext_pii_violations"] == 0
    assert data["tables_scanned"] >= 8
    assert len(data["findings"]) >= 4


@pytest.mark.asyncio
async def test_dpbi_breach_dossier_generation(
    client: httpx.AsyncClient, token: Callable[..., str]
) -> None:
    dossier_res = await client.post(
        "/v1/privacy/breach/dossier",
        json={
            "incident_title": "Simulated unauthorized credential exfiltration attempt",
            "affected_principals_count": 42,
            "pii_categories_exposed": ["Email", "IP Address Telemetry"],
            "containment_measures_taken": "Quarantined ingress interface, revoked active session tokens.",
        },
    )
    assert dossier_res.status_code == 200
    dossier = dossier_res.json()
    assert dossier["reporting_window_hours"] == 6
    assert dossier["is_within_statutory_window"] is True
    assert "Form DPBI-Annexure-B" in dossier["dpbi_notice_format"]
