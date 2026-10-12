"""PhishRadar URL scans, domain monitoring and takedown cases."""

import sqlalchemy as sa
from alembic import op

revision = "0003_phishradar"
down_revision = "0002_registry"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "url_scan",
        sa.Column("id", sa.Uuid, primary_key=True),
        sa.Column("target_url", sa.String(2048), nullable=False),
        sa.Column("normalized_url", sa.String(2048), nullable=False),
        sa.Column("domain", sa.String(255), nullable=False),
        sa.Column("risk_score", sa.Integer, nullable=False),
        sa.Column("verdict", sa.String(16), nullable=False),
        sa.Column("factors", sa.JSON, nullable=False),
        sa.Column("scanned_by", sa.Uuid, nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.CheckConstraint("verdict IN ('safe','suspicious','dangerous')", name="scan_verdict"),
        sa.CheckConstraint("risk_score >= 0 AND risk_score <= 100", name="scan_risk_score"),
    )
    for col in ("normalized_url", "domain", "created_at"):
        op.create_index(f"ix_url_scan_{col}", "url_scan", [col])

    op.create_table(
        "domain_monitor",
        sa.Column("id", sa.Uuid, primary_key=True),
        sa.Column("monitored_domain", sa.String(255), nullable=False),
        sa.Column("detected_lookalike", sa.String(255), nullable=False, unique=True),
        sa.Column("similarity_score", sa.Float, nullable=False),
        sa.Column("status", sa.String(16), nullable=False),
        sa.Column("source", sa.String(32), nullable=False),
        sa.Column(
            "detected_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.CheckConstraint(
            "status IN ('queued','flagged','investigating','cleared')", name="monitor_status"
        ),
    )
    for col in ("monitored_domain", "detected_at"):
        op.create_index(f"ix_domain_monitor_{col}", "domain_monitor", [col])

    op.create_table(
        "takedown_case",
        sa.Column("id", sa.Uuid, primary_key=True),
        sa.Column("scan_id", sa.Uuid, sa.ForeignKey("url_scan.id"), nullable=True),
        sa.Column("target_domain", sa.String(255), nullable=False),
        sa.Column("status", sa.String(32), nullable=False),
        sa.Column("registrar", sa.String(255), nullable=True),
        sa.Column("evidence_summary", sa.Text, nullable=False),
        sa.Column("created_by", sa.Uuid, nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.CheckConstraint(
            "status IN ('draft','reported','in_progress','resolved')", name="takedown_status"
        ),
    )
    for col in ("target_domain", "created_at"):
        op.create_index(f"ix_takedown_case_{col}", "takedown_case", [col])

    if op.get_bind().dialect.name == "postgresql":
        for table in ("url_scan", "domain_monitor", "takedown_case"):
            op.execute(f"GRANT SELECT, INSERT, UPDATE, DELETE ON {table} TO railraksha")


def downgrade() -> None:
    for table in ("takedown_case", "domain_monitor", "url_scan"):
        op.drop_table(table)
