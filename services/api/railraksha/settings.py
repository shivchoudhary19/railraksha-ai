from functools import lru_cache
from typing import Literal

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    app_env: Literal["development", "test", "production"] = "development"
    database_url: str = "sqlite+aiosqlite:///:memory:"
    redis_url: str = "redis://localhost:6379/0"
    oidc_issuer: str = "http://localhost:8081/realms/railraksha"
    oidc_internal_issuer: str = "http://localhost:8081/realms/railraksha"
    oidc_api_audience: str = "railraksha-api"
    allowed_origins: list[str] = ["http://localhost:3000"]
    allowed_hosts: list[str] = ["localhost", "127.0.0.1", "api", "testserver"]
    rate_limit: int = 100
    rate_window: int = 60
    evidence_master_key: str = ""
    s3_endpoint: str = "http://storage:3900"
    s3_access_key: str = ""
    s3_secret_key: str = ""
    s3_bucket: str = "railraksha"
    clamav_host: str = "clamav"
    clamav_port: int = 3310

    @model_validator(mode="after")
    def production_safety(self) -> "Settings":
        if self.app_env == "production":
            if not self.oidc_issuer.startswith("https://"):
                raise ValueError("Production requires an HTTPS OIDC issuer")
            if not self.database_url.startswith("postgresql+asyncpg://"):
                raise ValueError("Production requires PostgreSQL")
            if "*" in self.allowed_hosts or "*" in self.allowed_origins:
                raise ValueError("Production requires explicit hosts and origins")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
