import hashlib
import uuid
from datetime import datetime
from typing import Annotated, Literal
from urllib.parse import urlsplit

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, ConfigDict, Field, HttpUrl, model_validator
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from railraksha.auth import Principal, current_user, moderator_write, registry_editor
from railraksha.dependencies import audit, database
from railraksha.normalization import AssetKind, normalize
from railraksha.registry_models import Indicator, ModerationAction, OfficialAsset, Report

router = APIRouter(prefix="/v1", tags=["Registry and reporting"])
Database = Annotated[AsyncSession, Depends(database)]
Citizen = Annotated[Principal, Depends(current_user)]
Moderator = Annotated[Principal, Depends(moderator_write)]
Editor = Annotated[Principal, Depends(registry_editor)]


class VerifyInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    kind: AssetKind
    value: str = Field(min_length=1, max_length=2048)

    @model_validator(mode="after")
    def valid_identifier(self) -> "VerifyInput":
        normalize(self.kind, self.value)
        return self


class AssetInput(VerifyInput):
    label: str = Field(min_length=1, max_length=100)
    source_url: HttpUrl
    certificate_sha256: str | None = Field(default=None, pattern=r"^[a-fA-F0-9]{64}$")
    demo: bool = False


class AssetOutput(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    kind: str
    value: str
    label: str
    source_url: str
    certificate_sha256: str | None
    status: str
    demo: bool
    verified_by: uuid.UUID
    verified_at: datetime


class Verification(BaseModel):
    verdict: Literal["official", "unknown", "known_scam"]
    normalized_value: str
    asset: AssetOutput | None = None
    scope: Literal["identifier", "domain"] = "identifier"
    explanation_code: str


class ReportInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    kind: Literal["url", "domain", "phone", "email", "upi", "app", "social", "message"]
    value: str = Field(min_length=1, max_length=2048)
    description: str = Field(min_length=10, max_length=5000)
    language: Literal["en", "hi"] = "en"
    location: str | None = Field(default=None, max_length=100)
    consent_to_store: Literal[True]

    @model_validator(mode="after")
    def valid_identifier(self) -> "ReportInput":
        if self.kind != "message":
            normalize(self.kind, self.value)
        return self


class ReportOutput(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    kind: str
    normalized_value: str
    description: str
    language: str
    location: str | None
    status: str
    merged_into: uuid.UUID | None
    created_at: datetime


class ModerationInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    action: Literal["approve", "reject", "merge"]
    note: str = Field(min_length=5, max_length=500)
    merge_into: uuid.UUID | None = None

    @model_validator(mode="after")
    def merge_target(self) -> "ModerationInput":
        if (self.action == "merge") != (self.merge_into is not None):
            raise ValueError("Only a merge action must specify its target")
        return self


async def verify(db: AsyncSession, kind: AssetKind, value: str) -> Verification:
    normalized = normalize(kind, value)
    indicator = await db.scalar(
        select(Indicator).where(
            Indicator.kind == kind,
            Indicator.normalized_value == normalized,
            Indicator.verdict == "known_scam",
        )
    )
    if indicator:
        return Verification(
            verdict="known_scam", normalized_value=normalized, explanation_code="reviewed_scam"
        )
    if kind in {"url", "social"}:
        blocked_domain = await db.scalar(
            select(Indicator).where(
                Indicator.kind == "domain",
                Indicator.normalized_value == urlsplit(normalized).hostname,
                Indicator.verdict == "known_scam",
            )
        )
        if blocked_domain:
            return Verification(
                verdict="known_scam",
                normalized_value=normalized,
                scope="domain",
                explanation_code="reviewed_scam",
            )
    asset = await db.scalar(
        select(OfficialAsset).where(
            OfficialAsset.kind == kind,
            OfficialAsset.normalized_value == normalized,
            OfficialAsset.status == "verified",
        )
    )
    scope: Literal["identifier", "domain"] = "identifier"
    if asset is None and kind == "url":
        host = urlsplit(normalized).hostname
        asset = await db.scalar(
            select(OfficialAsset).where(
                OfficialAsset.kind == "domain",
                OfficialAsset.normalized_value == host,
                OfficialAsset.status == "verified",
            )
        )
        scope = "domain"
    if asset:
        return Verification(
            verdict="official",
            normalized_value=normalized,
            scope=scope,
            asset=AssetOutput.model_validate(asset),
            explanation_code="demo_registry" if asset.demo else "registered_identifier",
        )
    return Verification(
        verdict="unknown", normalized_value=normalized, explanation_code="not_registered"
    )


@router.post("/verify", response_model=Verification)
async def verify_identifier(payload: VerifyInput, db: Database, _user: Citizen) -> Verification:
    return await verify(db, payload.kind, payload.value)


@router.get("/registry", response_model=list[AssetOutput])
async def registry(
    db: Database,
    _user: Citizen,
    search: Annotated[str, Query(max_length=100)] = "",
    limit: Annotated[int, Query(ge=1, le=50)] = 20,
) -> list[OfficialAsset]:
    query = select(OfficialAsset).where(OfficialAsset.status == "verified")
    if search:
        query = query.where(OfficialAsset.label.ilike("%" + search + "%", escape="\\"))
    return list((await db.scalars(query.order_by(OfficialAsset.label).limit(limit))).all())


@router.post("/registry", response_model=AssetOutput, status_code=201)
async def create_asset(
    payload: AssetInput, request: Request, db: Database, user: Editor
) -> OfficialAsset:
    asset = OfficialAsset(
        kind=payload.kind,
        value=payload.value,
        normalized_value=normalize(payload.kind, payload.value),
        label=payload.label,
        source_url=str(payload.source_url),
        verified_by=user.subject,
        certificate_sha256=payload.certificate_sha256.lower()
        if payload.certificate_sha256
        else None,
        demo=payload.demo,
        status="verified",
    )
    db.add(asset)
    audit(db, request, user, "registry.create")
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(409, "This identifier already exists") from exc
    await db.refresh(asset)
    return asset


@router.post("/registry/{asset_id}/revoke", response_model=AssetOutput)
async def revoke_asset(
    asset_id: uuid.UUID, request: Request, db: Database, user: Editor
) -> OfficialAsset:
    asset = await db.get(OfficialAsset, asset_id)
    if not asset:
        raise HTTPException(404, "Registry entry not found")
    asset.status = "revoked"
    audit(db, request, user, "registry.revoke")
    await db.commit()
    await db.refresh(asset)
    return asset


@router.post("/reports", response_model=ReportOutput, status_code=201)
async def create_report(
    payload: ReportInput, request: Request, db: Database, user: Citizen
) -> Report:
    normalized = (
        hashlib.sha256(payload.value.encode()).hexdigest()
        if payload.kind == "message"
        else normalize(payload.kind, payload.value)
    )
    report = Report(
        owner=user.subject,
        kind=payload.kind,
        normalized_value=normalized,
        description=payload.description,
        language=payload.language,
        location=payload.location,
        status="pending",
        public_excerpt="",
    )
    db.add(report)
    audit(db, request, user, "report.create")
    await db.commit()
    await db.refresh(report)
    return report


@router.get("/reports", response_model=list[ReportOutput])
async def my_reports(db: Database, user: Citizen) -> list[Report]:
    return list(
        (
            await db.scalars(
                select(Report)
                .where(Report.owner == user.subject)
                .order_by(Report.created_at.desc())
                .limit(50)
            )
        ).all()
    )


@router.get("/reports/{report_id}", response_model=ReportOutput)
async def report_detail(report_id: uuid.UUID, db: Database, user: Citizen) -> Report:
    report = await db.get(Report, report_id)
    if not report or report.owner != user.subject:
        raise HTTPException(404, "Report not found")
    return report


@router.get("/moderation", response_model=list[ReportOutput])
async def moderation_queue(db: Database, _user: Moderator) -> list[Report]:
    return list(
        (
            await db.scalars(
                select(Report)
                .where(Report.status == "pending")
                .order_by(Report.created_at)
                .limit(50)
            )
        ).all()
    )


@router.post("/moderation/{report_id}", response_model=ReportOutput)
async def moderate(
    report_id: uuid.UUID,
    payload: ModerationInput,
    request: Request,
    db: Database,
    user: Moderator,
) -> Report:
    identifiers = [report_id, payload.merge_into] if payload.merge_into else [report_id]
    locked = (
        await db.scalars(
            select(Report).where(Report.id.in_(identifiers)).order_by(Report.id).with_for_update()
        )
    ).all()
    report = next((row for row in locked if row.id == report_id), None)
    if not report:
        raise HTTPException(404, "Report not found")
    if report.status != "pending":
        raise HTTPException(409, "This report was already reviewed")
    if payload.action == "merge":
        target = next((row for row in locked if row.id == payload.merge_into), None)
        if (
            not target
            or target.id == report.id
            or target.status in {"rejected", "merged"}
            or target.kind != report.kind
            or target.normalized_value != report.normalized_value
        ):
            raise HTTPException(422, "Merge into an existing report for the same identifier")
        report.status, report.merged_into = "merged", target.id
    elif payload.action == "reject":
        report.status = "rejected"
    else:
        # A verified registry item must first be explicitly revoked, with its own audit event.
        existing = await db.scalar(
            select(OfficialAsset).where(
                OfficialAsset.kind == report.kind,
                OfficialAsset.normalized_value == report.normalized_value,
                OfficialAsset.status == "verified",
            )
        )
        if existing:
            raise HTTPException(409, "Review and revoke the verified registry item first")
        report.status, report.public_excerpt = (
            "approved",
            "A reported " + report.kind + " identifier was reviewed and added to the scam list.",
        )
        insert = (
            pg_insert
            if db.bind is not None and db.bind.dialect.name == "postgresql"
            else sqlite_insert
        )
        statement = insert(Indicator).values(
            id=uuid.uuid4(),
            kind=report.kind,
            normalized_value=report.normalized_value,
            verdict="known_scam",
            confidence=100,
            source_report=report.id,
        )
        await db.execute(
            statement.on_conflict_do_update(
                index_elements=["kind", "normalized_value"],
                set_={"verdict": "known_scam", "source_report": report.id},
            )
        )
    db.add(
        ModerationAction(
            report_id=report.id, actor=user.subject, action=payload.action, note=payload.note
        )
    )
    audit(db, request, user, "report." + payload.action)
    await db.commit()
    await db.refresh(report)
    return report


class PublicScam(BaseModel):
    kind: str
    excerpt: str
    reviewed_at: datetime


@router.get("/scams/recent", response_model=list[PublicScam])
async def recent_scams(db: Database) -> list[PublicScam]:
    reports = await db.scalars(
        select(Report)
        .where(Report.status == "approved")
        .order_by(Report.created_at.desc())
        .limit(20)
    )
    return [
        PublicScam(kind=report.kind, excerpt=report.public_excerpt, reviewed_at=report.created_at)
        for report in reports
    ]


async def seed_demo(sessions: async_sessionmaker[AsyncSession]) -> None:
    entries = [
        ("domain", "booking.railraksha.example", "DEMO booking domain"),
        ("app", "test.railraksha.booking", "DEMO app identifier"),
        ("upi", "railraksha-demo@demo", "DEMO payment identifier"),
    ]
    async with sessions() as db:
        insert = (
            pg_insert
            if db.bind is not None and db.bind.dialect.name == "postgresql"
            else sqlite_insert
        )
        for kind, value, label in entries:
            await db.execute(
                insert(OfficialAsset)
                .values(
                    id=uuid.uuid5(uuid.NAMESPACE_URL, "railraksha-demo:" + value),
                    kind=kind,
                    value=value,
                    normalized_value=value,
                    label=label,
                    source_url="http://localhost:3000/en/about",
                    verified_by=uuid.UUID(int=1),
                    status="verified",
                    demo=True,
                )
                .on_conflict_do_nothing(index_elements=["kind", "normalized_value"])
            )
        await db.commit()
