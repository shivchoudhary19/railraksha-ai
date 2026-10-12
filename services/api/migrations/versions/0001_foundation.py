"""Foundation: profiles and append-only security audit records."""

import sqlalchemy as sa
from alembic import op

revision = "0001_foundation"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "user_profile",
        sa.Column("subject", sa.Uuid, primary_key=True),
        sa.Column("display_name", sa.String(80), nullable=False),
        sa.Column("language", sa.String(2), nullable=False),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.CheckConstraint("language IN ('en', 'hi')", name="profile_language"),
    )
    op.create_table(
        "audit_log",
        sa.Column("id", sa.Uuid, primary_key=True),
        sa.Column("actor", sa.Uuid, nullable=False),
        sa.Column("action", sa.String(40), nullable=False),
        sa.Column("request_id", sa.String(36), nullable=False),
        sa.Column(
            "occurred_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_audit_log_actor", "audit_log", ["actor"])
    op.create_index("ix_audit_log_occurred_at", "audit_log", ["occurred_at"])
    if op.get_bind().dialect.name == "postgresql":
        op.execute("GRANT SELECT, INSERT, UPDATE ON user_profile TO railraksha")
        op.execute("GRANT SELECT, INSERT ON audit_log TO railraksha")
        op.execute(
            "CREATE FUNCTION deny_audit_change() RETURNS trigger LANGUAGE plpgsql AS $$ "
            "BEGIN RAISE EXCEPTION 'Audit records are append-only'; END $$"
        )
        op.execute(
            "CREATE TRIGGER audit_append_only BEFORE UPDATE OR DELETE ON audit_log "
            "FOR EACH ROW EXECUTE FUNCTION deny_audit_change()"
        )


def downgrade() -> None:
    if op.get_bind().dialect.name == "postgresql":
        op.execute("DROP TRIGGER audit_append_only ON audit_log")
        op.execute("DROP FUNCTION deny_audit_change()")
    op.drop_table("audit_log")
    op.drop_table("user_profile")
