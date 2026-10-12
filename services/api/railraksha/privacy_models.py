import uuid
from datetime import datetime, timezone
from typing import Any
from sqlalchemy import (
    Boolean,
    DateTime,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from railraksha.models import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class PIIVaultRecord(Base):
    __tablename__ = "privacy_pii_vault"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    vault_token: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    encrypted_data: Mapped[str] = mapped_column(Text)
    data_hash: Mapped[str] = mapped_column(String(64), index=True)  # blind index HMAC
    key_version: Mapped[int] = mapped_column(Integer, default=1)
    classification: Mapped[str] = mapped_column(String(64), default="CONFIDENTIAL_PII")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )


class ConsentRecord(Base):
    __tablename__ = "privacy_consent_records"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    consent_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    principal_id: Mapped[str] = mapped_column(String(128), index=True)
    purpose_code: Mapped[str] = mapped_column(String(64), index=True)
    is_given: Mapped[bool] = mapped_column(Boolean, default=True)
    legal_basis: Mapped[str] = mapped_column(
        String(128), default="DPDP Act 2023 Section 6(1)"
    )
    consent_receipt: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    given_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow
    )
    withdrawn_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )


class DPDPPrincipalRequest(Base):
    __tablename__ = "privacy_dsr_requests"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    request_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    principal_id: Mapped[str] = mapped_column(String(128), index=True)
    request_type: Mapped[str] = mapped_column(String(32), index=True)  # access, erasure, correction, grievance
    status: Mapped[str] = mapped_column(String(32), default="completed", index=True)
    sla_due_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    details: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    response_summary: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )


class ImmutablePrivacyAuditLog(Base):
    __tablename__ = "privacy_immutable_audit_chain"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    action: Mapped[str] = mapped_column(String(64), index=True)
    principal_id: Mapped[str] = mapped_column(String(128), index=True)
    previous_hash: Mapped[str] = mapped_column(String(64))
    current_hash: Mapped[str] = mapped_column(String(64), index=True)
    metadata_payload: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow
    )


class DataRetentionPolicy(Base):
    __tablename__ = "privacy_retention_policies"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    policy_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    data_category: Mapped[str] = mapped_column(String(64), unique=True)
    retention_days: Mapped[int] = mapped_column(Integer)
    legal_hold: Mapped[bool] = mapped_column(Boolean, default=False)
    auto_purge_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow
    )
