import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import (
    JSON,
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from railraksha.models import Base


class UrlScan(Base):
    __tablename__ = "url_scan"
    __table_args__ = (
        CheckConstraint("verdict IN ('safe','suspicious','dangerous')", name="scan_verdict"),
        CheckConstraint("risk_score >= 0 AND risk_score <= 100", name="scan_risk_score"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    target_url: Mapped[str] = mapped_column(String(2048), nullable=False)
    normalized_url: Mapped[str] = mapped_column(String(2048), nullable=False, index=True)
    domain: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    risk_score: Mapped[int] = mapped_column(Integer, nullable=False)
    verdict: Mapped[str] = mapped_column(String(16), nullable=False)
    factors: Mapped[list[dict[str, Any]]] = mapped_column(JSON, nullable=False, default=list)
    scanned_by: Mapped[uuid.UUID | None] = mapped_column(Uuid, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )


class DomainMonitor(Base):
    __tablename__ = "domain_monitor"
    __table_args__ = (
        CheckConstraint(
            "status IN ('queued','flagged','investigating','cleared')", name="monitor_status"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    monitored_domain: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    detected_lookalike: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    similarity_score: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="flagged")
    source: Mapped[str] = mapped_column(String(32), nullable=False, default="ct_log")
    detected_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )


class TakedownCase(Base):
    __tablename__ = "takedown_case"
    __table_args__ = (
        CheckConstraint(
            "status IN ('draft','reported','in_progress','resolved')", name="takedown_status"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    scan_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("url_scan.id"), nullable=True
    )
    target_domain: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="draft")
    registrar: Mapped[str | None] = mapped_column(String(255), nullable=True)
    evidence_summary: Mapped[str] = mapped_column(Text, nullable=False)
    created_by: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
