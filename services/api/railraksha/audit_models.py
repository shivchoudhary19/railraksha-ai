import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import JSON, Boolean, DateTime, Integer, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from railraksha.models import Base


class AuditAsset(Base):
    __tablename__ = "audit_assets"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    domain: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    verification_token: Mapped[str] = mapped_column(String(64), nullable=False)
    verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    verification_method: Mapped[str] = mapped_column(String(32), default="dns_txt", nullable=False)
    owner_id: Mapped[uuid.UUID] = mapped_column(Uuid, index=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )


class AuditScan(Base):
    __tablename__ = "audit_scans"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    domain: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    scan_type: Mapped[str] = mapped_column(String(32), default="passive_public", nullable=False)
    overall_score: Mapped[int] = mapped_column(Integer, nullable=False)
    grade: Mapped[str] = mapped_column(String(4), nullable=False)
    tls_score: Mapped[int] = mapped_column(Integer, nullable=False)
    headers_score: Mapped[int] = mapped_column(Integer, nullable=False)
    dns_score: Mapped[int] = mapped_column(Integer, nullable=False)
    files_score: Mapped[int] = mapped_column(Integer, nullable=False)
    findings: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )


class BookingTicket(Base):
    __tablename__ = "booking_tickets"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    pnr: Mapped[str] = mapped_column(String(10), unique=True, index=True, nullable=False)
    train_number: Mapped[str] = mapped_column(String(10), nullable=False)
    train_name: Mapped[str] = mapped_column(String(100), nullable=False)
    from_station: Mapped[str] = mapped_column(String(10), nullable=False)
    to_station: Mapped[str] = mapped_column(String(10), nullable=False)
    travel_date: Mapped[str] = mapped_column(String(20), nullable=False)
    journey_class: Mapped[str] = mapped_column(String(10), nullable=False)
    quota: Mapped[str] = mapped_column(String(20), default="GENERAL", nullable=False)
    passenger_name: Mapped[str] = mapped_column(String(100), nullable=False)
    passenger_age: Mapped[int] = mapped_column(Integer, nullable=False)
    passenger_gender: Mapped[str] = mapped_column(String(10), nullable=False)
    fare_inr: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="confirmed", nullable=False)
    refund_amount: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    signature: Mapped[str] = mapped_column(String(128), nullable=False)
    qr_payload: Mapped[str] = mapped_column(String(512), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, index=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )


class BookingGrievance(Base):
    __tablename__ = "booking_grievances"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    tracking_id: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    pnr: Mapped[str] = mapped_column(String(10), index=True, nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[str] = mapped_column(String(2000), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="registered", nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, index=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
