"""RailRaksha Shield signed threat list tables."""

import sqlalchemy as sa
from alembic import op

revision = "0006_shield"
down_revision = "0005_appguard"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "threat_list_version",
        sa.Column("id", sa.Uuid, primary_key=True),
        sa.Column("version", sa.Integer, nullable=False, unique=True),
        sa.Column("signature", sa.String(128), nullable=False),
        sa.Column("entries_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("sha256_checksum", sa.String(64), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_threat_list_version_version", "threat_list_version", ["version"])
    op.create_index("ix_threat_list_version_created_at", "threat_list_version", ["created_at"])

    if op.get_bind().dialect.name == "postgresql":
        op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON threat_list_version TO railraksha")


def downgrade() -> None:
    op.drop_table("threat_list_version")
