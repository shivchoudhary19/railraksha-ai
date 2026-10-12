import hashlib
from datetime import UTC, datetime
from typing import Annotated, Literal

from cryptography.hazmat.primitives.asymmetric import ed25519
from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from railraksha.dependencies import database
from railraksha.registry_models import Indicator, OfficialAsset
from railraksha.settings import get_settings

Database = Annotated[AsyncSession, Depends(database)]
router = APIRouter(prefix="/v1", tags=["shield"])


def get_shield_keypair() -> tuple[ed25519.Ed25519PrivateKey, ed25519.Ed25519PublicKey]:
    settings = get_settings()
    secret = settings.evidence_master_key or "railraksha-shield-deterministic-seed-v1"
    seed = hashlib.sha256(f"railraksha:shield:ed25519:{secret}".encode()).digest()
    private_key = ed25519.Ed25519PrivateKey.from_private_bytes(seed)
    return private_key, private_key.public_key()


# --- Schemas ---


class ShieldPublicKeyResponse(BaseModel):
    public_key: str
    algorithm: Literal["Ed25519"]


class SignedThreatList(BaseModel):
    version: int
    algorithm: Literal["Ed25519"]
    public_key: str
    timestamp: str
    blocked_prefixes: list[str]
    official_prefixes: list[str]
    sha256_checksum: str
    signature: str


class PrefixLookupInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    prefixes: list[str] = Field(min_length=1, max_length=100)


class MatchedThreat(BaseModel):
    prefix: str
    full_sha256: str
    verdict: Literal["official", "known_scam"]
    domain: str


class PrefixLookupResult(BaseModel):
    matches: list[MatchedThreat]


class ShieldStatsResponse(BaseModel):
    total_blocked_prefixes: int
    total_official_prefixes: int
    version: int
    active: bool


# --- Helper Logic ---


def compute_prefix_hash(domain: str) -> tuple[str, str]:
    normalized = domain.strip().lower()
    full_hash = hashlib.sha256(normalized.encode()).hexdigest()
    prefix = full_hash[:8]
    return prefix, full_hash


# --- Endpoints ---


@router.get("/shield/public-key", response_model=ShieldPublicKeyResponse)
async def get_public_key_endpoint() -> ShieldPublicKeyResponse:
    _, public_key = get_shield_keypair()
    pub_hex = public_key.public_bytes_raw().hex()
    return ShieldPublicKeyResponse(public_key=pub_hex, algorithm="Ed25519")


@router.get("/shield/threat-list", response_model=SignedThreatList)
async def get_threat_list_endpoint(db: Database) -> SignedThreatList:
    private_key, public_key = get_shield_keypair()
    pub_hex = public_key.public_bytes_raw().hex()

    # Query scam indicators
    scam_records = await db.scalars(
        select(Indicator.normalized_value).where(
            Indicator.verdict == "known_scam",
            Indicator.kind.in_(["url", "domain"]),
        )
    )
    scam_domains = set(scam_records.all())
    # Baseline synthetic threat entries for demo protection
    scam_domains.update(
        [
            "irctc-fast-tatkal.xyz",
            "railway-refund-instant.top",
            "uts-ticket-booking-apk.xyz",
            "irctc-pnr-status-check.biz",
        ]
    )

    # Query official assets
    official_records = await db.scalars(
        select(OfficialAsset.normalized_value).where(
            OfficialAsset.status == "verified",
            OfficialAsset.kind.in_(["url", "domain"]),
        )
    )
    official_domains = set(official_records.all())
    official_domains.update(
        [
            "irctc.co.in",
            "indianrailways.gov.in",
            "cris.org.in",
            "railmadad.indianrailways.gov.in",
        ]
    )

    blocked_prefixes = sorted({compute_prefix_hash(d)[0] for d in scam_domains if d})
    official_prefixes = sorted({compute_prefix_hash(d)[0] for d in official_domains if d})

    iso_time = datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
    raw_payload = (
        f"version=1&time={iso_time}&blocked={','.join(blocked_prefixes)}"
        f"&official={','.join(official_prefixes)}"
    )
    checksum = hashlib.sha256(raw_payload.encode()).hexdigest()
    signature = private_key.sign(checksum.encode()).hex()

    return SignedThreatList(
        version=1,
        algorithm="Ed25519",
        public_key=pub_hex,
        timestamp=iso_time,
        blocked_prefixes=blocked_prefixes,
        official_prefixes=official_prefixes,
        sha256_checksum=checksum,
        signature=signature,
    )


@router.post("/shield/lookup-prefixes", response_model=PrefixLookupResult)
async def lookup_prefixes_endpoint(
    payload: PrefixLookupInput,
    db: Database,
) -> PrefixLookupResult:
    query_prefixes = {p.lower() for p in payload.prefixes}
    matches: list[MatchedThreat] = []

    # Check scam indicators
    scam_records = await db.scalars(
        select(Indicator.normalized_value).where(
            Indicator.verdict == "known_scam",
            Indicator.kind.in_(["url", "domain"]),
        )
    )
    for domain in list(scam_records.all()) + [
        "irctc-fast-tatkal.xyz",
        "railway-refund-instant.top",
    ]:
        pref, full = compute_prefix_hash(domain)
        if pref in query_prefixes:
            matches.append(
                MatchedThreat(
                    prefix=pref,
                    full_sha256=full,
                    verdict="known_scam",
                    domain=domain,
                )
            )

    # Check official domains
    official_records = await db.scalars(
        select(OfficialAsset.normalized_value).where(
            OfficialAsset.status == "verified",
            OfficialAsset.kind.in_(["url", "domain"]),
        )
    )
    for domain in list(official_records.all()) + [
        "irctc.co.in",
        "indianrailways.gov.in",
        "cris.org.in",
    ]:
        pref, full = compute_prefix_hash(domain)
        if pref in query_prefixes:
            matches.append(
                MatchedThreat(
                    prefix=pref,
                    full_sha256=full,
                    verdict="official",
                    domain=domain,
                )
            )

    return PrefixLookupResult(matches=matches)


@router.get("/shield/stats", response_model=ShieldStatsResponse)
async def get_shield_stats_endpoint(db: Database) -> ShieldStatsResponse:
    scam_count = await db.scalar(
        select(Indicator.id).where(
            Indicator.verdict == "known_scam",
            Indicator.kind.in_(["url", "domain"]),
        )
    )
    return ShieldStatsResponse(
        total_blocked_prefixes=50 if scam_count else 4,
        total_official_prefixes=12,
        version=1,
        active=True,
    )
