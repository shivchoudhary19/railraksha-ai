from collections.abc import Callable

import httpx
import pytest
from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric import ed25519

from railraksha.shield import compute_prefix_hash
from tests.test_registry import headers


@pytest.mark.asyncio
async def test_public_key_endpoint(
    client: httpx.AsyncClient, token: Callable[..., str]
) -> None:
    auth_headers = headers(token, "citizen")
    resp = await client.get("/v1/shield/public-key", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["algorithm"] == "Ed25519"
    assert len(data["public_key"]) == 64  # 32 bytes hex


@pytest.mark.asyncio
async def test_threat_list_cryptographic_verification(
    client: httpx.AsyncClient, token: Callable[..., str]
) -> None:
    auth_headers = headers(token, "citizen")
    resp = await client.get("/v1/shield/threat-list", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["version"] >= 1
    assert len(data["blocked_prefixes"]) > 0
    assert len(data["official_prefixes"]) > 0

    # Cryptographically verify the Ed25519 signature
    pub_bytes = bytes.fromhex(data["public_key"])
    verifier = ed25519.Ed25519PublicKey.from_public_bytes(pub_bytes)
    sig_bytes = bytes.fromhex(data["signature"])
    checksum_bytes = data["sha256_checksum"].encode()

    # Must not raise InvalidSignature
    verifier.verify(sig_bytes, checksum_bytes)


@pytest.mark.asyncio
async def test_threat_list_tamper_rejection(
    client: httpx.AsyncClient, token: Callable[..., str]
) -> None:
    auth_headers = headers(token, "citizen")
    resp = await client.get("/v1/shield/threat-list", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()

    pub_bytes = bytes.fromhex(data["public_key"])
    verifier = ed25519.Ed25519PublicKey.from_public_bytes(pub_bytes)
    sig_bytes = bytes.fromhex(data["signature"])

    # Tampered checksum
    tampered_bytes = b"bad" + data["sha256_checksum"].encode()[3:]
    with pytest.raises(InvalidSignature):
        verifier.verify(sig_bytes, tampered_bytes)


@pytest.mark.asyncio
async def test_prefix_lookup_endpoint(
    client: httpx.AsyncClient, token: Callable[..., str]
) -> None:
    auth_headers = headers(token, "citizen")
    scam_prefix, _ = compute_prefix_hash("irctc-fast-tatkal.xyz")
    official_prefix, _ = compute_prefix_hash("irctc.co.in")

    payload = {"prefixes": [scam_prefix, official_prefix, "00000000"]}
    resp = await client.post("/v1/shield/lookup-prefixes", json=payload, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    matches = data["matches"]
    assert len(matches) >= 2
    verdicts = {m["verdict"] for m in matches}
    assert "known_scam" in verdicts
    assert "official" in verdicts


@pytest.mark.asyncio
async def test_shield_stats_endpoint(
    client: httpx.AsyncClient, token: Callable[..., str]
) -> None:
    auth_headers = headers(token, "citizen")
    resp = await client.get("/v1/shield/stats", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["version"] >= 1
    assert data["active"] is True
    assert data["total_official_prefixes"] > 0
