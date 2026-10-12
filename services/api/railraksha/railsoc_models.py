import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import Boolean, DateTime, String, Uuid
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from railraksha.models import Base


class RailSOCEvent(Base):
    __tablename__ = "railsoc_events"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    event_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    source: Mapped[str] = mapped_column(
        String(64), index=True
    )  # e.g., "syslog", "web_gateway", "interlocking_scada"
    event_type: Mapped[str] = mapped_column(
        String(64), index=True
    )  # e.g., "auth_anomaly", "modbus_write", "radio_spoof"
    severity: Mapped[str] = mapped_column(
        String(16), default="low"
    )  # "low", "medium", "high", "critical"
    payload: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), index=True
    )


class RailSOCAlert(Base):
    __tablename__ = "railsoc_alerts"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    alert_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    rule_id: Mapped[str] = mapped_column(String(64), index=True)  # Sigma Rule ID
    title: Mapped[str] = mapped_column(String(255))
    severity: Mapped[str] = mapped_column(
        String(16), index=True
    )  # "low", "medium", "high", "critical"
    mitre_attack_id: Mapped[str] = mapped_column(String(32), index=True)  # e.g. "T0855", "T1566.002"
    mitre_tactic: Mapped[str] = mapped_column(
        String(64)
    )  # e.g. "Impair Process Control", "Initial Access"
    status: Mapped[str] = mapped_column(
        String(32), default="new", index=True
    )  # "new", "triaged", "investigating", "mitigated"
    ioc_indicators: Mapped[list[str]] = mapped_column(JSONB, default=list)
    evidence_data: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), index=True
    )


class RailSOCIncident(Base):
    __tablename__ = "railsoc_incidents"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    incident_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(255))
    severity: Mapped[str] = mapped_column(String(16), index=True)
    status: Mapped[str] = mapped_column(
        String(32), default="active", index=True
    )  # "active", "contained", "resolved", "closed"
    cert_in_reported: Mapped[bool] = mapped_column(Boolean, default=False)
    cert_in_dossier: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    playbook_actions_taken: Mapped[list[str]] = mapped_column(JSONB, default=list)
    assigned_analyst: Mapped[str | None] = mapped_column(String(128), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )


class OTSignallingNode(Base):
    __tablename__ = "railsoc_ot_nodes"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    node_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    system_type: Mapped[str] = mapped_column(
        String(32)
    )  # "interlocking_ei", "kavach_radio", "scada_traction"
    location_zone: Mapped[str] = mapped_column(
        String(64)
    )  # e.g., "Northern Railway (NDLS)", "Western Railway (BCT)"
    ip_address: Mapped[str] = mapped_column(String(45))
    status: Mapped[str] = mapped_column(
        String(16), default="healthy", index=True
    )  # "healthy", "alarm", "compromised"
    last_telemetry: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
