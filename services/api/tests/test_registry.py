import time
import uuid
from collections.abc import Callable

import httpx
import pytest
from fastapi import FastAPI
from sqlalchemy import select

from railraksha.models import AuditEvent
from railraksha.normalization import normalize, redact
from railraksha.registry import seed_demo
from railraksha.registry_models import ModerationAction


@pytest.mark.parametrize(
    ("kind", "value", "expected"),
    [
        ("domain", " IRCTC.CO.IN. ", "irctc.co.in"),
        ("domain", "bücher.example", "xn--bcher-kva.example"),
        (
            "url",
            "HTTPS://Example.COM:443/a?utm_source=x&b=2&a=1#section",
            "https://example.com/a?a=1&b=2",
        ),
        ("url", "https://example.com:80/", "https://example.com:80/"),
        ("url", "http://example.com:443/", "http://example.com:443/"),
        ("url", "https://example.com:8443/", "https://example.com:8443/"),
        ("social", "https://example.com/profile?fbclid=x", "https://example.com/profile"),
        ("email", "DEMO@BÜCHER.EXAMPLE", "demo@xn--bcher-kva.example"),
        ("phone", "+91 98765 43210", "+919876543210"),
        ("phone", "1930", "1930"),
        ("upi", "upi://pay?pa=RailRaksha-Demo%40Demo&am=500", "railraksha-demo@demo"),
        ("app", "Test.Demo.App", "Test.Demo.App"),
    ],
)
def test_normalization(kind: str, value: str, expected: str) -> None:
    assert normalize(kind, value) == expected  # type: ignore[arg-type]


@pytest.mark.parametrize(
    ("kind", "value"),
    [
        ("url", "file:///etc/passwd"),
        ("url", "https://user:pass@example.com"),
        ("url", "https://example.com\\other"),
        ("url", "https://example.com:99999"),
        ("url", "https://example.com/" + "अ" * 2040),
        ("domain", "localhost"),
        ("domain", "example.com/path"),
        ("domain", "☃.example"),
        ("domain", "a" * 255 + ".example"),
        ("phone", "000"),
        ("phone", "invalid"),
        ("email", "bad email@example.com"),
        ("upi", "upi://pay?am=100"),
        ("app", "../package.apk"),
        ("domain", "example.com\n" + "x"),
        ("domain", ""),
    ],
)
def test_normalization_rejects_malformed_identifiers(kind: str, value: str) -> None:
    with pytest.raises(ValueError):
        normalize(kind, value)  # type: ignore[arg-type]


def test_redaction() -> None:
    result = redact("OTP 1234, phone +91 98765 43210, demo@bank, ABCDE1234F https://secret.example")
    assert not any(value in result for value in ("1234", "98765", "demo@", "ABCDE", "secret"))


def headers(token: Callable[..., str], role: str = "citizen", **changes: object) -> dict[str, str]:
    return {"Authorization": "Bearer " + token(realm_access={"roles": [role]}, **changes)}


def privileged(token: Callable[..., str], role: str = "analyst") -> dict[str, str]:
    return headers(token, role, amr=["otp"], auth_time=int(time.time()))


REPORT = {
    "kind": "url",
    "value": "https://fake.railraksha.example/refund",
    "description": "DEMO Shiv was asked to send OTP 1234 to demo@example.test",
    "language": "hi",
    "consent_to_store": True,
}
ASSET = {
    "kind": "domain",
    "value": "DEMO.RAILRAKSHA.EXAMPLE",
    "label": "DEMO trusted source",
    "source_url": "http://localhost:3000/en/about",
    "demo": True,
}


async def test_report_review_changes_verdict_without_leaking_reporter(
    app: FastAPI,
    client: httpx.AsyncClient,
    token: Callable[..., str],
) -> None:
    auth = headers(token)
    response = await client.post(
        "/v1/verify", headers=auth, json={"kind": "url", "value": REPORT["value"]}
    )
    assert response.json()["verdict"] == "unknown"
    created = await client.post("/v1/reports", headers=auth, json=REPORT)
    assert created.status_code == 201
    identifier = created.json()["id"]
    assert (await client.get("/v1/reports", headers=auth)).json()[0]["id"] == identifier
    other = headers(token, sub=str(uuid.uuid4()))
    assert (await client.get("/v1/reports/" + identifier, headers=other)).status_code == 404
    assert (await client.get("/v1/reports", headers=other)).json() == []
    assert (await client.get("/v1/reports/" + identifier, headers=auth)).json()[
        "status"
    ] == "pending"
    for insufficient in [
        auth,
        headers(token, "analyst"),
        headers(token, "analyst", amr=["otp"], auth_time=int(time.time()) - 601),
    ]:
        assert (await client.get("/v1/moderation", headers=insufficient)).status_code == 403
    moderator = privileged(token)
    assert len((await client.get("/v1/moderation", headers=moderator)).json()) == 1
    response = await client.post(
        "/v1/moderation/" + identifier,
        headers=moderator,
        json={"action": "approve", "note": "Reviewed synthetic fixture"},
    )
    assert response.status_code == 200
    assert (
        await client.post(
            "/v1/verify", headers=auth, json={"kind": "url", "value": REPORT["value"]}
        )
    ).json()["verdict"] == "known_scam"
    public = (await client.get("/v1/scams/recent")).json()
    assert len(public) == 1
    assert not any(
        value in str(public) for value in ("Shiv", "1234", "demo@", identifier, REPORT["value"])
    )
    assert (
        await client.post(
            "/v1/moderation/" + identifier,
            headers=moderator,
            json={"action": "reject", "note": "Repeat action"},
        )
    ).status_code == 409
    async with app.state.sessions() as db:
        assert len((await db.scalars(select(ModerationAction))).all()) == 1
        assert {row.action for row in (await db.scalars(select(AuditEvent))).all()} == {
            "report.create",
            "report.approve",
        }


async def test_registry_duplicate_revoke_conflict_and_domain_scope(
    client: httpx.AsyncClient,
    token: Callable[..., str],
) -> None:
    auth, editor = headers(token), privileged(token)
    assert (
        await client.post("/v1/registry", headers=privileged(token, "soc_lead"), json=ASSET)
    ).status_code == 403
    response = await client.post("/v1/registry", headers=editor, json=ASSET)
    assert response.status_code == 201
    identifier = response.json()["id"]
    assert (await client.post("/v1/registry", headers=editor, json=ASSET)).status_code == 409
    assert len((await client.get("/v1/registry?search=trusted", headers=auth)).json()) == 1
    result = (
        await client.post(
            "/v1/verify",
            headers=auth,
            json={"kind": "url", "value": "https://demo.railraksha.example/path"},
        )
    ).json()
    assert (
        result["verdict"] == "official" and result["scope"] == "domain" and result["asset"]["demo"]
    )
    report = await client.post(
        "/v1/reports", headers=auth, json={**REPORT, "kind": "domain", "value": ASSET["value"]}
    )
    assert (
        await client.post(
            "/v1/moderation/" + report.json()["id"],
            headers=editor,
            json={"action": "approve", "note": "Conflicting identifier"},
        )
    ).status_code == 409
    assert (
        await client.post(f"/v1/registry/{identifier}/revoke", headers=editor)
    ).status_code == 200
    assert (
        await client.post(
            "/v1/moderation/" + report.json()["id"],
            headers=editor,
            json={"action": "approve", "note": "Registry revoked after review"},
        )
    ).status_code == 200
    assert (
        await client.post(f"/v1/registry/{uuid.uuid4()}/revoke", headers=editor)
    ).status_code == 404


async def test_merge_reject_and_private_message_hash(
    client: httpx.AsyncClient,
    token: Callable[..., str],
) -> None:
    auth, moderator = headers(token), privileged(token)
    first = (await client.post("/v1/reports", headers=auth, json=REPORT)).json()["id"]
    second = (await client.post("/v1/reports", headers=auth, json=REPORT)).json()["id"]
    for target in (second, str(uuid.uuid4())):
        assert (
            await client.post(
                "/v1/moderation/" + second,
                headers=moderator,
                json={"action": "merge", "note": "Duplicate fixture", "merge_into": target},
            )
        ).status_code == 422
    merged = await client.post(
        "/v1/moderation/" + second,
        headers=moderator,
        json={"action": "merge", "note": "Duplicate fixture", "merge_into": first},
    )
    assert merged.json()["merged_into"] == first
    assert (
        await client.post(
            "/v1/moderation/" + first,
            headers=moderator,
            json={"action": "reject", "note": "Insufficient evidence"},
        )
    ).json()["status"] == "rejected"
    assert (
        await client.post(
            f"/v1/moderation/{uuid.uuid4()}",
            headers=moderator,
            json={"action": "reject", "note": "Missing report"},
        )
    ).status_code == 404
    response = await client.post(
        "/v1/reports", headers=auth, json={**REPORT, "kind": "message", "value": "secret OTP 1234"}
    )
    assert len(response.json()["normalized_value"]) == 64
    assert "1234" not in response.json()["normalized_value"]
    assert (
        await client.post("/v1/reports", headers=auth, json={**REPORT, "consent_to_store": False})
    ).status_code == 422
    assert (
        await client.post(
            "/v1/moderation/" + first,
            headers=moderator,
            json={"action": "merge", "note": "Missing target"},
        )
    ).status_code == 422


async def test_seed_idempotent(
    app: FastAPI, client: httpx.AsyncClient, token: Callable[..., str]
) -> None:
    await seed_demo(app.state.sessions)
    await seed_demo(app.state.sessions)
    assert len((await client.get("/v1/registry", headers=headers(token))).json()) == 3


@pytest.mark.parametrize("claims", [{"amr": "otp"}, {"auth_time": True}, {"amr": [42]}])
async def test_auth_claims_are_strict(
    client: httpx.AsyncClient, token: Callable[..., str], claims: dict[str, object]
) -> None:
    assert (await client.get("/v1/me", headers=headers(token, **claims))).status_code == 401
