import uuid
from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, Float, Integer, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from railraksha.models import Base


class FairQueueTatkalWindow(Base):
    __tablename__ = "fairqueue_tatkal_windows"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    window_code: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    train_number: Mapped[str] = mapped_column(String(10), index=True)
    travel_date: Mapped[str] = mapped_column(String(20))
    total_quota_seats: Mapped[int] = mapped_column(Integer, default=50)
    total_human_admitted: Mapped[int] = mapped_column(Integer, default=0)
    total_bots_blocked: Mapped[int] = mapped_column(Integer, default=0)
    window_status: Mapped[str] = mapped_column(
        String(20), default="open"
    )  # scheduled, open, closed
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class FairQueueEntry(Base):
    __tablename__ = "fairqueue_entries"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    window_code: Mapped[str] = mapped_column(String(64), index=True)
    session_id: Mapped[str] = mapped_column(String(64), index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, index=True)
    assigned_rank: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(
        String(20), default="waiting"
    )  # waiting, admitted, blocked, expired
    bot_risk_score: Mapped[int] = mapped_column(Integer, default=0)
    risk_reasons: Mapped[list[str]] = mapped_column(JSON, default=list)
    challenge_type: Mapped[str] = mapped_column(
        String(32), default="none"
    )  # none, proof_of_work, passkey_reauth, blocked
    challenge_solved: Mapped[bool] = mapped_column(Boolean, default=False)
    admitted_seat: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class FairQueueSessionSignal(Base):
    __tablename__ = "fairqueue_signals"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    session_id: Mapped[str] = mapped_column(String(64), index=True)
    form_fill_ms: Mapped[int] = mapped_column(Integer)
    timing_entropy: Mapped[float] = mapped_column(Float)
    is_headless: Mapped[bool] = mapped_column(Boolean, default=False)
    asn_type: Mapped[str] = mapped_column(
        String(32), default="residential"
    )  # residential, datacenter, proxy
    device_hash: Mapped[str] = mapped_column(String(64))
    request_velocity: Mapped[int] = mapped_column(Integer, default=1)
    is_bot: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
