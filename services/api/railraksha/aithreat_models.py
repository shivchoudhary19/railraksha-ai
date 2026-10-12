import uuid
from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, Float, Integer, String, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from railraksha.models import Base


class AIFirewallAudit(Base):
    __tablename__ = "ai_firewall_audits"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    session_id: Mapped[str] = mapped_column(String(64), index=True)
    user_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, nullable=True, index=True)
    prompt_hash: Mapped[str] = mapped_column(String(64), index=True)
    threat_verdict: Mapped[str] = mapped_column(
        String(32), index=True
    )  # safe_passed, blocked_injection, blocked_pii, blocked_policy
    risk_score: Mapped[int] = mapped_column(Integer, default=0)
    redacted_pii_types: Mapped[list[str]] = mapped_column(JSON, default=list)
    injection_technique: Mapped[str | None] = mapped_column(String(64), nullable=True)
    blocked_canary_leak: Mapped[bool] = mapped_column(Boolean, default=False)
    latency_ms: Mapped[int] = mapped_column(Integer, default=15)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class AIAssistantFAQ(Base):
    __tablename__ = "ai_assistant_faqs"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    category: Mapped[str] = mapped_column(String(64), index=True)
    question_en: Mapped[str] = mapped_column(String(255))
    question_hi: Mapped[str] = mapped_column(String(255))
    answer_en: Mapped[str] = mapped_column(Text)
    answer_hi: Mapped[str] = mapped_column(Text)
    source_citation: Mapped[str] = mapped_column(String(128))
    keywords: Mapped[list[str]] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class DeepfakeEvaluation(Base):
    __tablename__ = "deepfake_evaluations"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    media_type: Mapped[str] = mapped_column(String(32))  # audio, video, image
    filename: Mapped[str] = mapped_column(String(255))
    synthetic_likelihood: Mapped[float] = mapped_column(Float)
    risk_verdict: Mapped[str] = mapped_column(
        String(32), index=True
    )  # low_synthetic, medium_altered, high_deepfake
    c2pa_status: Mapped[str] = mapped_column(
        String(32), default="absent"
    )  # valid_credentials, absent, tampered_signature
    metadata_signals: Mapped[list[str]] = mapped_column(JSON, default=list)
    safety_advice_en: Mapped[str] = mapped_column(String(255))
    safety_advice_hi: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
