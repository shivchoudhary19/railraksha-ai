"""Exercise the baseline on a disposable local database; never reset the app database."""

import os
import shutil
import subprocess
import uuid
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

ROOT = Path(__file__).resolve().parent.parent


def main() -> None:
    docker = os.environ.get("DOCKER") or shutil.which("docker")
    if not docker:
        raise SystemExit("Docker is required for fresh PostgreSQL migration checks.")
    name = "railraksha_test_" + uuid.uuid4().hex
    values = dict(
        line.split("=", 1)
        for line in (ROOT / ".env").read_text().splitlines()
        if line and not line.startswith("#")
    )
    parsed = urlsplit(values["MIGRATION_DATABASE_URL"])
    environment = os.environ.copy()
    environment["DATABASE_URL"] = urlunsplit(parsed._replace(path="/" + name))
    prefix = [
        docker,
        "compose",
        "exec",
        "-T",
        "postgres",
        "psql",
        "-U",
        "postgres",
        "-v",
        "ON_ERROR_STOP=1",
    ]

    def sql(statement: str, database: str = "postgres", expected: int = 0) -> str:
        result = subprocess.run(
            [*prefix, "-d", database, "-tAc", statement],
            check=False,
            cwd=ROOT,
            text=True,
            capture_output=True,
        )
        if result.returncode != expected:
            raise RuntimeError(
                "Database assertion failed (details kept out of credential logs)."
            )
        return result.stdout.strip()

    def migrate(revision: str, direction: str = "upgrade") -> None:
        subprocess.run(
            [
                docker,
                "compose",
                "run",
                "--rm",
                "--no-deps",
                "-e",
                "DATABASE_URL",
                "migrate",
                "alembic",
                direction,
                revision,
            ],
            cwd=ROOT,
            env=environment,
            check=True,
        )

    sql(f"CREATE DATABASE {name} OWNER railraksha_owner")
    try:
        migrate("0001_foundation")
        assert sql("SELECT version_num FROM alembic_version", name) == "0001_foundation"
        assert (
            sql("SELECT has_table_privilege('railraksha','audit_log','UPDATE')", name)
            == "f"
        )
        assert (
            sql("SELECT has_table_privilege('railraksha','audit_log','DELETE')", name)
            == "f"
        )
        actor, event = str(uuid.uuid4()), str(uuid.uuid4())
        sql(
            f"INSERT INTO audit_log(id,actor,action,request_id) VALUES ('{event}','{actor}','test.migration','{event}')",
            name,
        )
        migrate("head")
        assert sql("SELECT version_num FROM alembic_version", name) == "0007_webaudit_booking"
        assert sql("SELECT COUNT(*) FROM audit_log", name) == "1"
        assert (
            sql(
                "SELECT has_table_privilege('railraksha','moderation_action','UPDATE')",
                name,
            )
            == "f"
        )
        assert (
            sql(
                "SELECT COUNT(*) FROM pg_indexes WHERE indexname IN ('official_asset_search','report_search')",
                name,
            )
            == "2"
        )
        migrate("0001_foundation", "downgrade")
        assert sql("SELECT COUNT(*) FROM audit_log", name) == "1"
        migrate("head")
        sql("UPDATE audit_log SET action='tampered'", name, expected=1)
        migrate("base", "downgrade")
        assert sql("SELECT to_regclass('public.audit_log') IS NULL", name) == "t"
        migrate("head")
        print(
            "PASS: fresh baseline, repeated upgrade preserving data, append-only audit, rollback/reapply."
        )
        print(
            "PASS: upgrade from Phase 1 preserves its audit data; latest-phase rollback and reapply."
        )
    finally:
        # This name is generated here and only this temporary database is removed.
        sql(f"DROP DATABASE {name} WITH (FORCE)")


if __name__ == "__main__":
    main()
