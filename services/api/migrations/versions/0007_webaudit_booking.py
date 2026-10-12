"""WebAudit and Booking Blueprint tables."""

import sqlalchemy as sa
from alembic import op

revision = "0007_webaudit_booking"
down_revision = "0006_shield"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Audit Assets
    op.create_table(
        "audit_assets",
        sa.Column("id", sa.Uuid, primary_key=True),
        sa.Column("domain", sa.String(255), unique=True, nullable=False),
        sa.Column("verification_token", sa.String(64), nullable=False),
        sa.Column("verified", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("verification_method", sa.String(32), nullable=False, server_default="dns_txt"),
        sa.Column("owner_id", sa.Uuid, nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_audit_assets_domain", "audit_assets", ["domain"])
    op.create_index("ix_audit_assets_owner_id", "audit_assets", ["owner_id"])

    # 2. Audit Scans
    op.create_table(
        "audit_scans",
        sa.Column("id", sa.Uuid, primary_key=True),
        sa.Column("domain", sa.String(255), nullable=False),
        sa.Column("scan_type", sa.String(32), nullable=False, server_default="passive_public"),
        sa.Column("overall_score", sa.Integer, nullable=False),
        sa.Column("grade", sa.String(4), nullable=False),
        sa.Column("tls_score", sa.Integer, nullable=False),
        sa.Column("headers_score", sa.Integer, nullable=False),
        sa.Column("dns_score", sa.Integer, nullable=False),
        sa.Column("files_score", sa.Integer, nullable=False),
        sa.Column("findings", sa.JSON, nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_audit_scans_domain", "audit_scans", ["domain"])
    op.create_index("ix_audit_scans_created_at", "audit_scans", ["created_at"])

    # 3. Booking Tickets
    op.create_table(
        "booking_tickets",
        sa.Column("id", sa.Uuid, primary_key=True),
        sa.Column("pnr", sa.String(10), unique=True, nullable=False),
        sa.Column("train_number", sa.String(10), nullable=False),
        sa.Column("train_name", sa.String(100), nullable=False),
        sa.Column("from_station", sa.String(10), nullable=False),
        sa.Column("to_station", sa.String(10), nullable=False),
        sa.Column("travel_date", sa.String(20), nullable=False),
        sa.Column("journey_class", sa.String(10), nullable=False),
        sa.Column("quota", sa.String(20), nullable=False, server_default="GENERAL"),
        sa.Column("passenger_name", sa.String(100), nullable=False),
        sa.Column("passenger_age", sa.Integer, nullable=False),
        sa.Column("passenger_gender", sa.String(10), nullable=False),
        sa.Column("fare_inr", sa.Integer, nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="confirmed"),
        sa.Column("refund_amount", sa.Integer, nullable=False, server_default="0"),
        sa.Column("signature", sa.String(128), nullable=False),
        sa.Column("qr_payload", sa.String(512), nullable=False),
        sa.Column("user_id", sa.Uuid, nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_booking_tickets_pnr", "booking_tickets", ["pnr"])
    op.create_index("ix_booking_tickets_user_id", "booking_tickets", ["user_id"])

    # 4. Booking Grievances
    op.create_table(
        "booking_grievances",
        sa.Column("id", sa.Uuid, primary_key=True),
        sa.Column("tracking_id", sa.String(20), unique=True, nullable=False),
        sa.Column("pnr", sa.String(10), nullable=False),
        sa.Column("category", sa.String(50), nullable=False),
        sa.Column("description", sa.String(2000), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="registered"),
        sa.Column("user_id", sa.Uuid, nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_booking_grievances_tracking_id", "booking_grievances", ["tracking_id"])
    op.create_index("ix_booking_grievances_pnr", "booking_grievances", ["pnr"])

    if op.get_bind().dialect.name == "postgresql":
        op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON audit_assets TO railraksha")
        op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON audit_scans TO railraksha")
        op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON booking_tickets TO railraksha")
        op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON booking_grievances TO railraksha")


def downgrade() -> None:
    op.drop_table("booking_grievances")
    op.drop_table("booking_tickets")
    op.drop_table("audit_scans")
    op.drop_table("audit_assets")
