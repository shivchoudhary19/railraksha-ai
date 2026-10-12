import time
import uuid
from collections.abc import Callable

import httpx
import jwt
import pytest
from fastapi import FastAPI
from redis.exceptions import RedisError
from sqlalchemy import select

from railraksha.auth import KeySet
from railraksha.models import AuditEvent
from railraksha.settings import Settings


async def test_health_and_headers(client: httpx.AsyncClient) -> None:
    response = await client.get("/health")
    assert response.json() == {"status": "ok", "service": "railraksha-api"}
    assert response.headers["x-content-type-options"] == "nosniff"
    uuid.UUID(response.headers["x-request-id"])


async def test_readiness(client: httpx.AsyncClient) -> None:
    assert (await client.get("/ready")).json() == {"status": "ready"}


async def test_readiness_failure(app: FastAPI, client: httpx.AsyncClient) -> None:
    async def broken() -> bool:
        raise RedisError("offline")

    app.state.redis.ping = broken
    assert (await client.get("/ready")).status_code == 503


async def test_anonymous_is_denied(client: httpx.AsyncClient) -> None:
    for route in ["/v1/me", "/v1/operator", "/v1/profile"]:
        response = await client.get(route)
        assert response.status_code == 401
        assert response.json()["error"]["request_id"]


@pytest.mark.parametrize("name", ["", "A" * 100, "<DEMO>\x7f"])
async def test_profile_accepts_safe_defaults_from_provider(
    client: httpx.AsyncClient, token: Callable[..., str], name: str
) -> None:
    response = await client.get(
        "/v1/profile", headers={"Authorization": "Bearer " + token(name=name)}
    )
    assert response.status_code == 200
    value = response.json()["display_name"]
    assert 1 <= len(value) <= 80
    assert "<" not in value and "\x7f" not in value


@pytest.mark.parametrize(
    "changes",
    [
        {"aud": "another-service"},
        {"iss": "https://other.invalid"},
        {"exp": 1},
        {"sub": "not-a-uuid"},
        {"realm_access": {"roles": "admin"}},
        {"iat": int(time.time()) + 1000},
    ],
)
async def test_invalid_claims(
    client: httpx.AsyncClient, token: Callable[..., str], changes: dict[str, object]
) -> None:
    assert (
        await client.get("/v1/me", headers={"Authorization": "Bearer " + token(**changes)})
    ).status_code == 401


async def test_signature_and_algorithm(client: httpx.AsyncClient) -> None:
    bad = jwt.encode(
        {"sub": str(uuid.uuid4()), "exp": int(time.time()) + 60},
        "test-only-random-long-key-for-hmac",
        algorithm="HS256",
        headers={"kid": "test-key"},
    )
    for value in ["not-a-token", bad]:
        assert (
            await client.get("/v1/me", headers={"Authorization": "Bearer " + value})
        ).status_code == 401


async def test_email_verification(client: httpx.AsyncClient, token: Callable[..., str]) -> None:
    assert (
        await client.get(
            "/v1/me", headers={"Authorization": "Bearer " + token(email_verified=False)}
        )
    ).status_code == 403


@pytest.mark.parametrize(
    "role", ["citizen", "student", "partner_dev", "asset_owner", "verified_reporter"]
)
async def test_operator_denies_regular_roles(
    client: httpx.AsyncClient, token: Callable[..., str], role: str
) -> None:
    assert (
        await client.get(
            "/v1/operator",
            headers={"Authorization": "Bearer " + token(realm_access={"roles": [role]})},
        )
    ).status_code == 403


@pytest.mark.parametrize("role", ["analyst", "soc_lead", "rpf_cyber", "admin", "super_admin"])
async def test_operator_allows_assigned_roles(
    client: httpx.AsyncClient, token: Callable[..., str], role: str
) -> None:
    response = await client.get(
        "/v1/operator", headers={"Authorization": "Bearer " + token(realm_access={"roles": [role]})}
    )
    assert response.status_code == 200
    assert response.json()["roles"] == [role]


async def test_me_filters_unknown_roles(
    client: httpx.AsyncClient, token: Callable[..., str]
) -> None:
    response = await client.get(
        "/v1/me",
        headers={
            "Authorization": "Bearer " + token(realm_access={"roles": ["citizen", "unrelated"]})
        },
    )
    assert response.json()["roles"] == ["citizen"]


async def test_profile_round_trip_and_audit(
    app: FastAPI, client: httpx.AsyncClient, token: Callable[..., str]
) -> None:
    headers = {"Authorization": "Bearer " + token()}
    default = await client.get("/v1/profile", headers=headers)
    assert default.json()["display_name"] == "Demo Citizen"
    for name, language in [("Demo Name", "hi"), ("Another Demo", "en")]:
        response = await client.put(
            "/v1/profile", headers=headers, json={"display_name": name, "language": language}
        )
        assert response.status_code == 200
        stored = (await client.get("/v1/profile", headers=headers)).json()
        assert stored["display_name"] == name
        assert stored["language"] == language
    async with app.state.sessions() as db:
        audit = (await db.execute(select(AuditEvent))).scalars().all()
        assert [event.action for event in audit] == ["profile.updated", "profile.updated"]


@pytest.mark.parametrize(
    "body",
    [
        {"display_name": " ", "language": "en"},
        {"display_name": "<script>", "language": "en"},
        {"display_name": "Demo", "language": "unknown"},
        {"display_name": "Demo", "language": "en", "roles": ["admin"]},
        {"display_name": "x" * 81, "language": "en"},
    ],
)
async def test_profile_validation(
    client: httpx.AsyncClient, token: Callable[..., str], body: dict[str, object]
) -> None:
    response = await client.put(
        "/v1/profile", headers={"Authorization": "Bearer " + token()}, json=body
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "invalid_input"
    assert "<script>" not in response.text


async def test_profile_isolation(client: httpx.AsyncClient, token: Callable[..., str]) -> None:
    one = {"Authorization": "Bearer " + token()}
    two = {"Authorization": "Bearer " + token(sub=str(uuid.uuid4()), name="Other demo")}
    await client.put(
        "/v1/profile", headers=one, json={"display_name": "Private demo", "language": "hi"}
    )
    assert (await client.get("/v1/profile", headers=two)).json()["display_name"] == "Other demo"


async def test_session_events(
    app: FastAPI, client: httpx.AsyncClient, token: Callable[..., str]
) -> None:
    headers = {"Authorization": "Bearer " + token()}
    for action in ["session.login", "session.logout"]:
        assert (
            await client.post("/v1/session-events", headers=headers, json={"action": action})
        ).status_code == 201
    assert (
        await client.post("/v1/session-events", headers=headers, json={"action": "arbitrary"})
    ).status_code == 422


async def test_rate_limit(app: FastAPI, client: httpx.AsyncClient) -> None:
    app.state.settings.rate_limit = 2
    await client.get("/v1/me")
    await client.get("/v1/me")
    response = await client.get("/v1/me")
    assert response.status_code == 429
    assert int(response.headers["retry-after"]) > 0
    assert (await client.get("/health")).status_code == 200


async def test_limiter_fails_closed(app: FastAPI, client: httpx.AsyncClient) -> None:
    async def broken(*_args: object) -> object:
        raise RedisError("unavailable")

    app.state.redis.eval = broken
    assert (await client.get("/v1/me")).status_code == 503
    assert (await client.get("/health")).status_code == 200


async def test_openapi_and_docs(client: httpx.AsyncClient) -> None:
    assert (await client.get("/api/docs")).status_code == 200
    schema = (await client.get("/api/openapi.json")).json()
    assert "/v1/profile" in schema["paths"]
    assert schema["paths"]["/v1/operator"]["get"]["security"]


async def test_docs_are_admin_only_in_production(
    app: FastAPI, client: httpx.AsyncClient, token: Callable[..., str]
) -> None:
    app.state.settings.app_env = "production"
    assert (await client.get("/api/docs")).status_code == 401
    assert (
        await client.get("/api/openapi.json", headers={"Authorization": "Bearer " + token()})
    ).status_code == 403
    assert (
        await client.get(
            "/api/openapi.json",
            headers={"Authorization": "Bearer " + token(realm_access={"roles": ["admin"]})},
        )
    ).status_code == 200


async def test_jwks_failure(
    app: FastAPI, client: httpx.AsyncClient, token: Callable[..., str]
) -> None:
    async def failed(_kid: str) -> jwt.PyJWK:
        raise httpx.ConnectError("offline")

    app.state.keys.get = failed
    assert (
        await client.get("/v1/me", headers={"Authorization": "Bearer " + token()})
    ).status_code == 503


async def test_unknown_key() -> None:
    async with httpx.AsyncClient(
        transport=httpx.MockTransport(lambda _: httpx.Response(200, json={"keys": []}))
    ) as client:
        with pytest.raises(jwt.InvalidTokenError):
            await KeySet("https://identity.invalid/certs", client).get("unknown")


@pytest.mark.parametrize(
    "kwargs",
    [
        {"app_env": "production"},
        {"app_env": "production", "oidc_issuer": "https://identity.example"},
        {
            "app_env": "production",
            "oidc_issuer": "https://identity.example",
            "database_url": "postgresql+asyncpg://localhost/app",
            "allowed_hosts": ["*"],
        },
    ],
)
def test_production_config_fails_closed(kwargs: dict[str, object]) -> None:
    with pytest.raises(ValueError):
        Settings(_env_file=None, **kwargs)
