"""AppGuard APK and application analysis tables."""

import sqlalchemy as sa
from alembic import op

revision = "0005_appguard"
down_revision = "0004_scamlens"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "app_scan",
        sa.Column("id", sa.Uuid, primary_key=True),
        sa.Column("app_name", sa.String(200), nullable=False),
        sa.Column("package_name", sa.String(255), nullable=False),
        sa.Column("version_name", sa.String(50), nullable=True),
        sa.Column("file_sha256", sa.String(64), nullable=True),
        sa.Column("file_size_bytes", sa.Integer, nullable=True),
        sa.Column("cert_fingerprint_sha256", sa.String(64), nullable=True),
        sa.Column("risk_score", sa.Integer, nullable=False),
        sa.Column("verdict", sa.String(20), nullable=False),
        sa.Column("dangerous_permissions", sa.JSON, nullable=False),
        sa.Column("suspicious_indicators", sa.JSON, nullable=False),
        sa.Column("registry_match", sa.JSON, nullable=True),
        sa.Column("explanation_en", sa.Text, nullable=False),
        sa.Column("explanation_hi", sa.Text, nullable=False),
        sa.Column("scanned_by", sa.Uuid, nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.CheckConstraint(
            "verdict IN ('safe','suspicious','dangerous')", name="app_scan_verdict"
        ),
        sa.CheckConstraint(
            "risk_score >= 0 AND risk_score <= 100", name="app_scan_risk_score"
        ),
    )
    op.create_index("ix_app_scan_created_at", "app_scan", ["created_at"])
    op.create_index("ix_app_scan_package_name", "app_scan", ["package_name"])
    op.create_index("ix_app_scan_file_sha256", "app_scan", ["file_sha256"])

    if op.get_bind().dialect.name == "postgresql":
        op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON app_scan TO railraksha")


def downgrade() -> None:
    op.drop_table("app_scan")
