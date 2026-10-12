"""Student Safe Zone: Job/Recruitment Scam Audits, Academy Certifications and Breach Defense tables."""

import sqlalchemy as sa
from alembic import op

revision = "0011_student"
down_revision = "0010_railsoc"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Student Certificates
    op.create_table(
        "student_certificates",
        sa.Column("id", sa.Uuid, primary_key=True),
        sa.Column("certificate_id", sa.String(64), nullable=False),
        sa.Column("student_name", sa.String(128), nullable=False),
        sa.Column("student_email", sa.String(256), nullable=False),
        sa.Column("course_module", sa.String(128), nullable=False),
        sa.Column("score", sa.Integer, nullable=False),
        sa.Column("signature", sa.String(128), nullable=False),
        sa.Column(
            "issued_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("is_valid", sa.Boolean, server_default=sa.true(), nullable=False),
    )
    op.create_index(
        "ix_student_certificates_cert_id",
        "student_certificates",
        ["certificate_id"],
        unique=True,
    )
    op.create_index(
        "ix_student_certificates_email",
        "student_certificates",
        ["student_email"],
    )

    # 2. Recruitment Scam Audits
    op.create_table(
        "student_scam_audits",
        sa.Column("id", sa.Uuid, primary_key=True),
        sa.Column("query_text", sa.Text, nullable=False),
        sa.Column("risk_verdict", sa.String(32), nullable=False),
        sa.Column("risk_score", sa.Integer, nullable=False),
        sa.Column("red_flags", sa.JSON, nullable=False),
        sa.Column("matched_official_portal", sa.String(256), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_student_scam_audits_verdict",
        "student_scam_audits",
        ["risk_verdict"],
    )

    # Grant permissions to application role
    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON student_certificates TO railraksha;")
    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON student_scam_audits TO railraksha;")


def downgrade() -> None:
    op.drop_table("student_scam_audits")
    op.drop_table("student_certificates")
