"""Privacy Vault & DPDP Compliance Toolkit: PII Vault, Consent, DSR, Audit Chain, and Retention tables."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0012_privacy"
down_revision = "0011_student"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. PII Vault
    op.create_table(
        "privacy_pii_vault",
        sa.Column("id", sa.Uuid, primary_key=True),
        sa.Column("vault_token", sa.String(64), nullable=False),
        sa.Column("encrypted_data", sa.Text, nullable=False),
        sa.Column("data_hash", sa.String(64), nullable=False),
        sa.Column("key_version", sa.Integer, server_default="1", nullable=False),
        sa.Column(
            "classification",
            sa.String(64),
            server_default="CONFIDENTIAL_PII",
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_privacy_pii_vault_token",
        "privacy_pii_vault",
        ["vault_token"],
        unique=True,
    )
    op.create_index(
        "ix_privacy_pii_vault_hash",
        "privacy_pii_vault",
        ["data_hash"],
        unique=False,
    )

    # 2. Consent Records
    op.create_table(
        "privacy_consent_records",
        sa.Column("id", sa.Uuid, primary_key=True),
        sa.Column("consent_id", sa.String(64), nullable=False),
        sa.Column("principal_id", sa.String(128), nullable=False),
        sa.Column("purpose_code", sa.String(64), nullable=False),
        sa.Column("is_given", sa.Boolean, server_default=sa.true(), nullable=False),
        sa.Column(
            "legal_basis",
            sa.String(128),
            server_default="DPDP Act 2023 Section 6(1)",
            nullable=False,
        ),
        sa.Column(
            "consent_receipt",
            postgresql.JSONB,
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.Column(
            "given_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("withdrawn_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_privacy_consent_id",
        "privacy_consent_records",
        ["consent_id"],
        unique=True,
    )
    op.create_index(
        "ix_privacy_consent_principal_purpose",
        "privacy_consent_records",
        ["principal_id", "purpose_code"],
        unique=False,
    )

    # 3. DSR Requests
    op.create_table(
        "privacy_dsr_requests",
        sa.Column("id", sa.Uuid, primary_key=True),
        sa.Column("request_id", sa.String(64), nullable=False),
        sa.Column("principal_id", sa.String(128), nullable=False),
        sa.Column("request_type", sa.String(32), nullable=False),
        sa.Column("status", sa.String(32), server_default="completed", nullable=False),
        sa.Column("sla_due_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "details",
            postgresql.JSONB,
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.Column("response_summary", sa.Text, server_default="", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_privacy_dsr_request_id",
        "privacy_dsr_requests",
        ["request_id"],
        unique=True,
    )
    op.create_index(
        "ix_privacy_dsr_principal",
        "privacy_dsr_requests",
        ["principal_id"],
        unique=False,
    )

    # 4. Immutable Audit Chain
    op.create_table(
        "privacy_immutable_audit_chain",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("action", sa.String(64), nullable=False),
        sa.Column("principal_id", sa.String(128), nullable=False),
        sa.Column("previous_hash", sa.String(64), nullable=False),
        sa.Column("current_hash", sa.String(64), nullable=False),
        sa.Column(
            "metadata_payload",
            postgresql.JSONB,
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_privacy_audit_current_hash",
        "privacy_immutable_audit_chain",
        ["current_hash"],
        unique=False,
    )

    # 5. Data Retention Policies
    op.create_table(
        "privacy_retention_policies",
        sa.Column("id", sa.Uuid, primary_key=True),
        sa.Column("policy_id", sa.String(64), nullable=False),
        sa.Column("data_category", sa.String(64), nullable=False),
        sa.Column("retention_days", sa.Integer, nullable=False),
        sa.Column("legal_hold", sa.Boolean, server_default=sa.false(), nullable=False),
        sa.Column("auto_purge_enabled", sa.Boolean, server_default=sa.true(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_privacy_retention_policy_id",
        "privacy_retention_policies",
        ["policy_id"],
        unique=True,
    )
    op.create_index(
        "ix_privacy_retention_category",
        "privacy_retention_policies",
        ["data_category"],
        unique=True,
    )

    # Grant permissions to application role
    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON privacy_pii_vault TO railraksha;")
    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON privacy_consent_records TO railraksha;")
    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON privacy_dsr_requests TO railraksha;")
    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON privacy_immutable_audit_chain TO railraksha;")
    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON privacy_retention_policies TO railraksha;")
    op.execute("GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO railraksha;")


def downgrade() -> None:
    op.drop_table("privacy_retention_policies")
    op.drop_table("privacy_immutable_audit_chain")
    op.drop_table("privacy_dsr_requests")
    op.drop_table("privacy_consent_records")
    op.drop_table("privacy_pii_vault")
