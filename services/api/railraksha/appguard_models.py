import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from railraksha.models import Base


class AppScan(Base):
    __tablename__ = "app_scan"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    app_name: Mapped[str] = mapped_column(String(200), nullable=False)
    package_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    version_name: Mapped[str | None] = mapped_column(String(50), nullable=True)
    file_sha256: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    file_size_bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    cert_fingerprint_sha256: Mapped[str | None] = mapped_column(String(64), nullable=True)
    risk_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    verdict: Mapped[str] = mapped_column(String(20), nullable=False, default="unknown")
    dangerous_permissions: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB, nullable=False, default=list
    )
    suspicious_indicators: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB, nullable=False, default=list
    )
    registry_match: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    explanation_en: Mapped[str] = mapped_column(Text, nullable=False)
    explanation_hi: Mapped[str] = mapped_column(Text, nullable=False)
    scanned_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
        index=True,
    )
