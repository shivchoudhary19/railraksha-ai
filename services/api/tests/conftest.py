import json
import time
import uuid
from collections.abc import AsyncIterator, Callable
from typing import Any

import fakeredis.aioredis
import httpx
import jwt
import pytest
import pytest_asyncio
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import FastAPI

from railraksha.auth import KeySet
from railraksha.main import create_app
from railraksha.models import Base
from railraksha.settings import Settings

SUBJECT = str(uuid.uuid4())
ISSUER = "http://localhost:8081/realms/railraksha"


@pytest.fixture(scope="session")
def signing_key() -> rsa.RSAPrivateKey:
    return rsa.generate_private_key(public_exponent=65537, key_size=2048)


@pytest.fixture
def token(signing_key: rsa.RSAPrivateKey) -> Callable[..., str]:
    def build(**changes: Any) -> str:  # Test claim overrides deliberately exercise invalid shapes.
        claims: dict[str, Any] = {
            "sub": SUBJECT,
            "iss": ISSUER,
            "aud": "railraksha-api",
            "exp": int(time.time()) + 300,
            "iat": int(time.time()),
            "name": "Demo Citizen",
            "email_verified": True,
            "realm_access": {"roles": ["citizen"]},
        }
        claims.update(changes)
        return jwt.encode(claims, signing_key, algorithm="RS256", headers={"kid": "test-key"})

    return build


@pytest_asyncio.fixture
async def app(signing_key: rsa.RSAPrivateKey) -> AsyncIterator[FastAPI]:
    app = create_app(Settings(_env_file=None, app_env="test"))
    public = json.loads(jwt.algorithms.RSAAlgorithm.to_jwk(signing_key.public_key()))
    public.update({"kid": "test-key", "alg": "RS256"})

    def transport(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/certs"):
            return httpx.Response(200, json={"keys": [public]})
        return httpx.Response(200, json={"issuer": ISSUER})

    async with app.router.lifespan_context(app):
        app.state.redis = fakeredis.aioredis.FakeRedis(decode_responses=True)
        async with app.state.engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)
        async with httpx.AsyncClient(transport=httpx.MockTransport(transport)) as client:
            app.state.http = client
            app.state.keys = KeySet(ISSUER + "/protocol/openid-connect/certs", client)
            yield app


@pytest_asyncio.fixture
async def client(app: FastAPI) -> AsyncIterator[httpx.AsyncClient]:
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://testserver"
    ) as client:
        yield client
