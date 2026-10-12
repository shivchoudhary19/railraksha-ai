"""Create development-only secrets once, without printing them."""

import os
import secrets
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SECRET_KEYS = [
    "POSTGRES_PASSWORD",
    "APP_DB_PASSWORD",
    "OWNER_DB_PASSWORD",
    "KEYCLOAK_DB_PASSWORD",
    "KEYCLOAK_ADMIN_PASSWORD",
    "OIDC_CLIENT_SECRET",
    "REDIS_PASSWORD",
    "DEMO_PASSWORD",
    "GARAGE_ADMIN_TOKEN",
    "GARAGE_DEFAULT_SECRET_KEY",
]


def bootstrap() -> None:
    target = ROOT / ".env"
    if not target.exists():
        values = dict(
            line.split("=", 1)
            for line in (ROOT / ".env.example").read_text().splitlines()
            if line and not line.startswith("#")
        )
        for key in SECRET_KEYS:
            values[key] = secrets.token_urlsafe(36)
        values["GARAGE_RPC_SECRET"] = secrets.token_hex(32)
        values["GARAGE_DEFAULT_ACCESS_KEY"] = "GK" + secrets.token_hex(16)
        values["DATABASE_URL"] = (
            f"postgresql+asyncpg://railraksha:{values['APP_DB_PASSWORD']}@postgres:5432/railraksha"
        )
        values["MIGRATION_DATABASE_URL"] = (
            f"postgresql+asyncpg://railraksha_owner:{values['OWNER_DB_PASSWORD']}@postgres:5432/railraksha"
        )
        values["REDIS_URL"] = f"redis://:{values['REDIS_PASSWORD']}@redis:6379/0"
        with os.fdopen(
            os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600), "w"
        ) as file:
            file.write(
                "\n".join(f"{key}={value}" for key, value in values.items()) + "\n"
            )
        print("Created .env with random local development secrets (not displayed).")
    values = dict(
        line.split("=", 1)
        for line in target.read_text().splitlines()
        if line and not line.startswith("#")
    )
    if not values.get("EVIDENCE_MASTER_KEY"):
        values["EVIDENCE_MASTER_KEY"] = secrets.token_urlsafe(32)
        with target.open("a") as file:
            file.write("EVIDENCE_MASTER_KEY=" + values["EVIDENCE_MASTER_KEY"] + "\n")
    local = ROOT / ".local"
    local.mkdir(exist_ok=True)
    config = f'''metadata_dir = "/var/lib/garage/meta"
data_dir = "/var/lib/garage/data"
db_engine = "sqlite"
replication_factor = 1
rpc_bind_addr = "0.0.0.0:3901"
rpc_public_addr = "127.0.0.1:3901"
rpc_secret = "{values["GARAGE_RPC_SECRET"]}"
[s3_api]
s3_region = "garage"
api_bind_addr = "0.0.0.0:3900"
root_domain = ".s3.garage.localhost"
[admin]
api_bind_addr = "0.0.0.0:3903"
admin_token = "{values["GARAGE_ADMIN_TOKEN"]}"
'''
    config_file = local / "garage.toml"
    config_file.write_text(config)
    config_file.chmod(0o600)
    print("Local configuration is ready. Demo usernames are listed in README.md.")


if __name__ == "__main__":
    bootstrap()
