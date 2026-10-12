"""RailSOC: Security Operations Center, SIEM Alerts, Incidents and OT Signalling tables."""

import sqlalchemy as sa
from alembic import op

revision = "0010_railsoc"
down_revision = "0009_aithreat"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. RailSOC Events
    op.create_table(
        "railsoc_events",
        sa.Column("id", sa.Uuid, primary_key=True),
        sa.Column("event_id", sa.String(64), nullable=False),
        sa.Column("source", sa.String(64), nullable=False),
        sa.Column("event_type", sa.String(64), nullable=False),
        sa.Column("severity", sa.String(16), nullable=False, server_default="low"),
        sa.Column("payload", sa.JSON, nullable=False),
        sa.Column(
            "timestamp", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_railsoc_events_event_id", "railsoc_events", ["event_id"], unique=True)
    op.create_index("ix_railsoc_events_source", "railsoc_events", ["source"])
    op.create_index("ix_railsoc_events_type", "railsoc_events", ["event_type"])
    op.create_index("ix_railsoc_events_time", "railsoc_events", ["timestamp"])

    # 2. RailSOC Alerts (Sigma Rule Matches + MITRE ATT&CK)
    op.create_table(
        "railsoc_alerts",
        sa.Column("id", sa.Uuid, primary_key=True),
        sa.Column("alert_id", sa.String(64), nullable=False),
        sa.Column("rule_id", sa.String(64), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("severity", sa.String(16), nullable=False, server_default="medium"),
        sa.Column("mitre_attack_id", sa.String(32), nullable=False),
        sa.Column("mitre_tactic", sa.String(64), nullable=False),
        sa.Column("status", sa.String(32), nullable=False, server_default="new"),
        sa.Column("ioc_indicators", sa.JSON, nullable=False),
        sa.Column("evidence_data", sa.JSON, nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_railsoc_alerts_alert_id", "railsoc_alerts", ["alert_id"], unique=True)
    op.create_index("ix_railsoc_alerts_rule_id", "railsoc_alerts", ["rule_id"])
    op.create_index("ix_railsoc_alerts_severity", "railsoc_alerts", ["severity"])
    op.create_index("ix_railsoc_alerts_mitre", "railsoc_alerts", ["mitre_attack_id"])
    op.create_index("ix_railsoc_alerts_status", "railsoc_alerts", ["status"])

    # 3. RailSOC Incidents (CERT-In Dossiers & SOAR Playbooks)
    op.create_table(
        "railsoc_incidents",
        sa.Column("id", sa.Uuid, primary_key=True),
        sa.Column("incident_id", sa.String(64), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("severity", sa.String(16), nullable=False),
        sa.Column("status", sa.String(32), nullable=False, server_default="active"),
        sa.Column("cert_in_reported", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("cert_in_dossier", sa.JSON, nullable=True),
        sa.Column("playbook_actions_taken", sa.JSON, nullable=False),
        sa.Column("assigned_analyst", sa.String(128), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index(
        "ix_railsoc_incidents_incident_id", "railsoc_incidents", ["incident_id"], unique=True
    )
    op.create_index("ix_railsoc_incidents_status", "railsoc_incidents", ["status"])

    # 4. OT / Signalling Equipment Nodes
    op.create_table(
        "railsoc_ot_nodes",
        sa.Column("id", sa.Uuid, primary_key=True),
        sa.Column("node_id", sa.String(64), nullable=False),
        sa.Column("system_type", sa.String(32), nullable=False),
        sa.Column("location_zone", sa.String(64), nullable=False),
        sa.Column("ip_address", sa.String(45), nullable=False),
        sa.Column("status", sa.String(16), nullable=False, server_default="healthy"),
        sa.Column("last_telemetry", sa.JSON, nullable=False),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_railsoc_ot_node_id", "railsoc_ot_nodes", ["node_id"], unique=True)
    op.create_index("ix_railsoc_ot_status", "railsoc_ot_nodes", ["status"])

    # Grant permissions to railraksha app user
    op.execute(
        "GRANT ALL PRIVILEGES ON TABLE railsoc_events, railsoc_alerts, "
        "railsoc_incidents, railsoc_ot_nodes TO railraksha"
    )


def downgrade() -> None:
    op.drop_table("railsoc_ot_nodes")
    op.drop_table("railsoc_incidents")
    op.drop_table("railsoc_alerts")
    op.drop_table("railsoc_events")
