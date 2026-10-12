"""FairQueue anti-bot and Tatkal fairness tables."""

import sqlalchemy as sa
from alembic import op

revision = "0008_fairqueue"
down_revision = "0007_webaudit_booking"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Tatkal Windows
    op.create_table(
        "fairqueue_tatkal_windows",
        sa.Column("id", sa.Uuid, primary_key=True),
        sa.Column("window_code", sa.String(64), unique=True, nullable=False),
        sa.Column("train_number", sa.String(10), nullable=False),
        sa.Column("travel_date", sa.String(20), nullable=False),
        sa.Column("total_quota_seats", sa.Integer, nullable=False, server_default="50"),
        sa.Column("total_human_admitted", sa.Integer, nullable=False, server_default="0"),
        sa.Column("total_bots_blocked", sa.Integer, nullable=False, server_default="0"),
        sa.Column("window_status", sa.String(20), nullable=False, server_default="open"),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_fairqueue_windows_code", "fairqueue_tatkal_windows", ["window_code"])
    op.create_index("ix_fairqueue_windows_train", "fairqueue_tatkal_windows", ["train_number"])

    # 2. Queue Entries
    op.create_table(
        "fairqueue_entries",
        sa.Column("id", sa.Uuid, primary_key=True),
        sa.Column("window_code", sa.String(64), nullable=False),
        sa.Column("session_id", sa.String(64), nullable=False),
        sa.Column("user_id", sa.Uuid, nullable=False),
        sa.Column("assigned_rank", sa.Integer, nullable=False, server_default="0"),
        sa.Column("status", sa.String(20), nullable=False, server_default="waiting"),
        sa.Column("bot_risk_score", sa.Integer, nullable=False, server_default="0"),
        sa.Column("risk_reasons", sa.JSON, nullable=False),
        sa.Column("challenge_type", sa.String(32), nullable=False, server_default="none"),
        sa.Column("challenge_solved", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("admitted_seat", sa.Integer, nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_fairqueue_entries_window", "fairqueue_entries", ["window_code"])
    op.create_index("ix_fairqueue_entries_session", "fairqueue_entries", ["session_id"])
    op.create_index("ix_fairqueue_entries_user", "fairqueue_entries", ["user_id"])

    # 3. Session Signals
    op.create_table(
        "fairqueue_signals",
        sa.Column("id", sa.Uuid, primary_key=True),
        sa.Column("session_id", sa.String(64), nullable=False),
        sa.Column("form_fill_ms", sa.Integer, nullable=False),
        sa.Column("timing_entropy", sa.Float, nullable=False),
        sa.Column("is_headless", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("asn_type", sa.String(32), nullable=False, server_default="residential"),
        sa.Column("device_hash", sa.String(64), nullable=False),
        sa.Column("request_velocity", sa.Integer, nullable=False, server_default="1"),
        sa.Column("is_bot", sa.Boolean, nullable=False, server_default="false"),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_fairqueue_signals_session", "fairqueue_signals", ["session_id"])

    if op.get_bind().dialect.name == "postgresql":
        op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON fairqueue_tatkal_windows TO railraksha")
        op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON fairqueue_entries TO railraksha")
        op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON fairqueue_signals TO railraksha")


def downgrade() -> None:
    op.drop_table("fairqueue_signals")
    op.drop_table("fairqueue_entries")
    op.drop_table("fairqueue_tatkal_windows")
