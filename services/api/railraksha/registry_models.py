import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    LargeBinary,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from railraksha.models import Base


class OfficialAsset(Base):
    __tablename__ = "official_asset"
    __table_args__ = (
        UniqueConstraint("kind", "normalized_value", name="official_asset_identity"),
        CheckConstraint("status IN ('verified','revoked')", name="asset_status"),
    )
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    kind: Mapped[str] = mapped_column(String(16))
    value: Mapped[str] = mapped_column(String(2048))
    normalized_value: Mapped[str] = mapped_column(String(2048), index=True)
    label: Mapped[str] = mapped_column(String(100))
    source_url: Mapped[str] = mapped_column(String(2048))
    certificate_sha256: Mapped[str | None] = mapped_column(String(64))
    verified_by: Mapped[uuid.UUID] = mapped_column(Uuid)
    verified_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    status: Mapped[str] = mapped_column(String(16), default="verified")
    demo: Mapped[bool] = mapped_column(Boolean, default=False)


class Indicator(Base):
    __tablename__ = "indicator"
    __table_args__ = (
        UniqueConstraint("kind", "normalized_value", name="indicator_identity"),
        CheckConstraint("verdict IN ('known_scam','unknown')", name="indicator_verdict"),
    )
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    kind: Mapped[str] = mapped_column(String(16))
    normalized_value: Mapped[str] = mapped_column(String(2048), index=True)
    verdict: Mapped[str] = mapped_column(String(16))
    confidence: Mapped[int] = mapped_column(default=100)
    source_report: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("report.id"))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Report(Base):
    __tablename__ = "report"
    __table_args__ = (
        CheckConstraint(
            "status IN ('pending','approved','rejected','merged')", name="report_status"
        ),
        CheckConstraint("language IN ('en','hi')", name="report_language"),
    )
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    owner: Mapped[uuid.UUID] = mapped_column(Uuid, index=True)
    kind: Mapped[str] = mapped_column(String(16))
    normalized_value: Mapped[str] = mapped_column(String(2048), index=True)
    description: Mapped[str] = mapped_column(Text)
    public_excerpt: Mapped[str] = mapped_column(Text, default="")
    language: Mapped[str] = mapped_column(String(2))
    location: Mapped[str | None] = mapped_column(String(100))
    status: Mapped[str] = mapped_column(String(16), default="pending", index=True)
    merged_into: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("report.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ReportEvidence(Base):
    __tablename__ = "report_evidence"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    report_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("report.id"), index=True)
    object_key: Mapped[str] = mapped_column(String(160), unique=True)
    sha256: Mapped[str] = mapped_column(String(64))
    media_type: Mapped[str] = mapped_column(String(32))
    size: Mapped[int]
    wrapped_key: Mapped[bytes] = mapped_column(LargeBinary)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ModerationAction(Base):
    __tablename__ = "moderation_action"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    report_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("report.id"), index=True)
    actor: Mapped[uuid.UUID] = mapped_column(Uuid)
    action: Mapped[str] = mapped_column(String(16))
    note: Mapped[str] = mapped_column(String(500))
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
