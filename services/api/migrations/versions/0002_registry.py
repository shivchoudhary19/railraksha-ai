"""Registry, reviewed indicators, reports and private evidence."""

import sqlalchemy as sa
from alembic import op

revision = "0002_registry"
down_revision = "0001_foundation"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "official_asset",
        sa.Column("id", sa.Uuid, primary_key=True),
        sa.Column("kind", sa.String(16), nullable=False),
        sa.Column("value", sa.String(2048), nullable=False),
        sa.Column("normalized_value", sa.String(2048), nullable=False),
        sa.Column("label", sa.String(100), nullable=False),
        sa.Column("source_url", sa.String(2048), nullable=False),
        sa.Column("certificate_sha256", sa.String(64)),
        sa.Column("verified_by", sa.Uuid, nullable=False),
        sa.Column(
            "verified_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column("status", sa.String(16), nullable=False),
        sa.Column("demo", sa.Boolean, nullable=False),
        sa.UniqueConstraint("kind", "normalized_value", name="official_asset_identity"),
        sa.CheckConstraint("status IN ('verified','revoked')", name="asset_status"),
    )
    op.create_index("ix_official_asset_normalized_value", "official_asset", ["normalized_value"])
    op.create_table(
        "report",
        sa.Column("id", sa.Uuid, primary_key=True),
        sa.Column("owner", sa.Uuid, nullable=False),
        sa.Column("kind", sa.String(16), nullable=False),
        sa.Column("normalized_value", sa.String(2048), nullable=False),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("public_excerpt", sa.Text, nullable=False),
        sa.Column("language", sa.String(2), nullable=False),
        sa.Column("location", sa.String(100)),
        sa.Column("status", sa.String(16), nullable=False),
        sa.Column("merged_into", sa.Uuid, sa.ForeignKey("report.id")),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.CheckConstraint(
            "status IN ('pending','approved','rejected','merged')", name="report_status"
        ),
        sa.CheckConstraint("language IN ('en','hi')", name="report_language"),
    )
    for column in ("owner", "normalized_value", "status"):
        op.create_index("ix_report_" + column, "report", [column])
    op.create_table(
        "indicator",
        sa.Column("id", sa.Uuid, primary_key=True),
        sa.Column("kind", sa.String(16), nullable=False),
        sa.Column("normalized_value", sa.String(2048), nullable=False),
        sa.Column("verdict", sa.String(16), nullable=False),
        sa.Column("confidence", sa.Integer, nullable=False),
        sa.Column("source_report", sa.Uuid, sa.ForeignKey("report.id"), nullable=False),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.UniqueConstraint("kind", "normalized_value", name="indicator_identity"),
        sa.CheckConstraint("verdict IN ('known_scam','unknown')", name="indicator_verdict"),
    )
    op.create_index("ix_indicator_normalized_value", "indicator", ["normalized_value"])
    op.create_table(
        "report_evidence",
        sa.Column("id", sa.Uuid, primary_key=True),
        sa.Column("report_id", sa.Uuid, sa.ForeignKey("report.id"), nullable=False),
        sa.Column("object_key", sa.String(160), nullable=False, unique=True),
        sa.Column("sha256", sa.String(64), nullable=False),
        sa.Column("media_type", sa.String(32), nullable=False),
        sa.Column("size", sa.Integer, nullable=False),
        sa.Column("wrapped_key", sa.LargeBinary, nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_report_evidence_report_id", "report_evidence", ["report_id"])
    op.create_table(
        "moderation_action",
        sa.Column("id", sa.Uuid, primary_key=True),
        sa.Column("report_id", sa.Uuid, sa.ForeignKey("report.id"), nullable=False),
        sa.Column("actor", sa.Uuid, nullable=False),
        sa.Column("action", sa.String(16), nullable=False),
        sa.Column("note", sa.String(500), nullable=False),
        sa.Column(
            "occurred_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_moderation_action_report_id", "moderation_action", ["report_id"])
    if op.get_bind().dialect.name == "postgresql":
        op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
        for table in ("official_asset", "indicator", "report", "report_evidence"):
            op.execute(f"GRANT SELECT, INSERT, UPDATE, DELETE ON {table} TO railraksha")
        op.execute("GRANT SELECT, INSERT ON moderation_action TO railraksha")
        op.execute(
            "CREATE INDEX official_asset_search ON official_asset USING gin (label gin_trgm_ops)"
        )
        op.execute(
            "CREATE INDEX report_search ON report USING gin (to_tsvector('simple', public_excerpt))"
        )


def downgrade() -> None:
    for table in ("moderation_action", "report_evidence", "indicator", "report", "official_asset"):
        op.drop_table(table)
