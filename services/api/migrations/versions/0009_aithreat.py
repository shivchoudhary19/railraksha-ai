"""AI Threat Defense, LLM Firewall and Assistant tables."""

import sqlalchemy as sa
from alembic import op

revision = "0009_aithreat"
down_revision = "0008_fairqueue"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. AI Firewall Audits
    op.create_table(
        "ai_firewall_audits",
        sa.Column("id", sa.Uuid, primary_key=True),
        sa.Column("session_id", sa.String(64), nullable=False),
        sa.Column("user_id", sa.Uuid, nullable=True),
        sa.Column("prompt_hash", sa.String(64), nullable=False),
        sa.Column("threat_verdict", sa.String(32), nullable=False),
        sa.Column("risk_score", sa.Integer, nullable=False, server_default="0"),
        sa.Column("redacted_pii_types", sa.JSON, nullable=False),
        sa.Column("injection_technique", sa.String(64), nullable=True),
        sa.Column("blocked_canary_leak", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("latency_ms", sa.Integer, nullable=False, server_default="15"),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_ai_firewall_session", "ai_firewall_audits", ["session_id"])
    op.create_index("ix_ai_firewall_user", "ai_firewall_audits", ["user_id"])
    op.create_index("ix_ai_firewall_verdict", "ai_firewall_audits", ["threat_verdict"])
    op.create_index("ix_ai_firewall_prompt_hash", "ai_firewall_audits", ["prompt_hash"])

    # 2. AI Assistant FAQs (Official Knowledge Base)
    op.create_table(
        "ai_assistant_faqs",
        sa.Column("id", sa.Uuid, primary_key=True),
        sa.Column("category", sa.String(64), nullable=False),
        sa.Column("question_en", sa.String(255), nullable=False),
        sa.Column("question_hi", sa.String(255), nullable=False),
        sa.Column("answer_en", sa.Text, nullable=False),
        sa.Column("answer_hi", sa.Text, nullable=False),
        sa.Column("source_citation", sa.String(128), nullable=False),
        sa.Column("keywords", sa.JSON, nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_ai_faqs_category", "ai_assistant_faqs", ["category"])

    # 3. Deepfake Evaluations
    op.create_table(
        "deepfake_evaluations",
        sa.Column("id", sa.Uuid, primary_key=True),
        sa.Column("media_type", sa.String(32), nullable=False),
        sa.Column("filename", sa.String(255), nullable=False),
        sa.Column("synthetic_likelihood", sa.Float, nullable=False),
        sa.Column("risk_verdict", sa.String(32), nullable=False),
        sa.Column("c2pa_status", sa.String(32), nullable=False, server_default="absent"),
        sa.Column("metadata_signals", sa.JSON, nullable=False),
        sa.Column("safety_advice_en", sa.String(255), nullable=False),
        sa.Column("safety_advice_hi", sa.String(255), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_deepfake_verdict", "deepfake_evaluations", ["risk_verdict"])

    if op.get_bind().dialect.name == "postgresql":
        op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON ai_firewall_audits TO railraksha")
        op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON ai_assistant_faqs TO railraksha")
        op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON deepfake_evaluations TO railraksha")


def downgrade() -> None:
    op.drop_table("deepfake_evaluations")
    op.drop_table("ai_assistant_faqs")
    op.drop_table("ai_firewall_audits")
