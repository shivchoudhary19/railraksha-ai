import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import (
    JSON,
    CheckConstraint,
    DateTime,
    Integer,
    String,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from railraksha.models import Base


class ScamAnalysis(Base):
    __tablename__ = "scam_analysis"
    __table_args__ = (
        CheckConstraint(
            "verdict IN ('safe','suspicious','dangerous')", name="scam_analysis_verdict"
        ),
        CheckConstraint("risk_score >= 0 AND risk_score <= 100", name="scam_analysis_risk_score"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    category: Mapped[str] = mapped_column(String(32), nullable=False)
    risk_score: Mapped[int] = mapped_column(Integer, nullable=False)
    verdict: Mapped[str] = mapped_column(String(16), nullable=False)
    extracted_urls: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    extracted_entities: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    red_flags: Mapped[list[dict[str, Any]]] = mapped_column(JSON, nullable=False, default=list)
    language: Mapped[str] = mapped_column(String(8), nullable=False, default="en")
    owner: Mapped[uuid.UUID | None] = mapped_column(Uuid, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
