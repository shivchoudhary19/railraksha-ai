import time
import uuid
from dataclasses import dataclass
from typing import Annotated

import httpx
import jwt
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

ROLES = frozenset(
    {
        "citizen",
        "student",
        "verified_reporter",
        "analyst",
        "soc_lead",
        "rpf_cyber",
        "asset_owner",
        "partner_dev",
        "admin",
        "super_admin",
    }
)
OPERATOR_ROLES = frozenset({"analyst", "soc_lead", "rpf_cyber", "admin", "super_admin"})
bearer = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class Principal:
    subject: uuid.UUID
    name: str
    roles: frozenset[str]
    methods: frozenset[str] = frozenset()
    authenticated_at: int = 0


class KeySet:
    def __init__(self, url: str, client: httpx.AsyncClient) -> None:
        self.url = url
        self.client = client
        self.keys: dict[str, jwt.PyJWK] = {}
        self.expires = 0.0

    async def get(self, kid: str) -> jwt.PyJWK:
        if time.monotonic() > self.expires or kid not in self.keys:
            response = await self.client.get(self.url)
            response.raise_for_status()
            payload = response.json()
            if not isinstance(payload, dict) or not payload.get("keys"):
                raise jwt.InvalidTokenError("Signing keys unavailable")
            keys = jwt.PyJWKSet.from_dict(payload).keys
            self.keys = {key.key_id: key for key in keys if key.key_id}
            self.expires = time.monotonic() + 60
        if kid not in self.keys:
            raise jwt.InvalidTokenError("Unknown signing key")
        return self.keys[kid]


async def current_user(
    request: Request,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
) -> Principal:
    if not credentials:
        raise HTTPException(401, "Sign in to continue", headers={"WWW-Authenticate": "Bearer"})
    settings = request.app.state.settings
    try:
        header = jwt.get_unverified_header(credentials.credentials)
        if header.get("alg") != "RS256" or not isinstance(header.get("kid"), str):
            raise jwt.InvalidTokenError("Unsupported signing key")
        key = await request.app.state.keys.get(header["kid"])
        claims = jwt.decode(
            credentials.credentials,
            key.key,
            algorithms=["RS256"],
            audience=settings.oidc_api_audience,
            issuer=settings.oidc_issuer,
            options={"require": ["exp", "iat", "iss", "aud", "sub"]},
        )
        if claims.get("email_verified") is not True:
            raise HTTPException(403, "Verify your email before continuing")
        realm = claims.get("realm_access", {})
        raw_roles = realm.get("roles", []) if isinstance(realm, dict) else []
        if not isinstance(raw_roles, list):
            raise jwt.InvalidTokenError("Invalid roles")
        roles = frozenset(role for role in raw_roles if isinstance(role, str) and role in ROLES)
        methods = claims.get("amr", [])
        authenticated_at = claims.get("auth_time", 0)
        if not isinstance(methods, list) or not all(isinstance(item, str) for item in methods):
            raise jwt.InvalidTokenError("Invalid authentication methods")
        if not isinstance(authenticated_at, int) or isinstance(authenticated_at, bool):
            raise jwt.InvalidTokenError("Invalid authentication time")
        return Principal(
            uuid.UUID(claims["sub"]),
            str(claims.get("name", "")),
            roles,
            frozenset(methods),
            authenticated_at,
        )
    except HTTPException:
        raise
    except (jwt.InvalidTokenError, ValueError, KeyError, TypeError) as exc:
        raise HTTPException(401, "Your session is invalid or expired") from exc
    except httpx.HTTPError as exc:
        raise HTTPException(503, "Sign-in service is temporarily unavailable") from exc


async def operator_user(user: Annotated[Principal, Depends(current_user)]) -> Principal:
    if not user.roles.intersection(OPERATOR_ROLES):
        raise HTTPException(403, "This page is for authorized operators")
    return user


async def admin_user(user: Annotated[Principal, Depends(current_user)]) -> Principal:
    if not user.roles.intersection({"admin", "super_admin"}):
        raise HTTPException(403, "Administrator access required")
    return user


async def moderator_write(user: Annotated[Principal, Depends(operator_user)]) -> Principal:
    if not user.methods.intersection({"otp", "webauthn", "webauthn-passwordless"}):
        raise HTTPException(403, "Sign in again using an authenticator or verified passkey")
    age = int(time.time()) - user.authenticated_at
    if not 0 <= age <= 600:
        raise HTTPException(403, "Recent authentication is required; sign in again")
    return user


async def registry_editor(user: Annotated[Principal, Depends(moderator_write)]) -> Principal:
    if not user.roles.intersection({"analyst", "admin", "super_admin"}):
        raise HTTPException(403, "Registry editor access required")
    return user
