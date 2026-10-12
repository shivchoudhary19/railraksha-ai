"""ScamLens message analysis table."""

import sqlalchemy as sa
from alembic import op

revision = "0004_scamlens"
down_revision = "0003_phishradar"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "scam_analysis",
        sa.Column("id", sa.Uuid, primary_key=True),
        sa.Column("category", sa.String(32), nullable=False),
        sa.Column("risk_score", sa.Integer, nullable=False),
        sa.Column("verdict", sa.String(16), nullable=False),
        sa.Column("extracted_urls", sa.JSON, nullable=False),
        sa.Column("extracted_entities", sa.JSON, nullable=False),
        sa.Column("red_flags", sa.JSON, nullable=False),
        sa.Column("language", sa.String(8), nullable=False),
        sa.Column("owner", sa.Uuid, nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.CheckConstraint(
            "verdict IN ('safe','suspicious','dangerous')", name="scam_analysis_verdict"
        ),
        sa.CheckConstraint(
            "risk_score >= 0 AND risk_score <= 100", name="scam_analysis_risk_score"
        ),
    )
    op.create_index("ix_scam_analysis_created_at", "scam_analysis", ["created_at"])
    op.create_index("ix_scam_analysis_category", "scam_analysis", ["category"])

    if op.get_bind().dialect.name == "postgresql":
        op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON scam_analysis TO railraksha")


def downgrade() -> None:
    op.drop_table("scam_analysis")
