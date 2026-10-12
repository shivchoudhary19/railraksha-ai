"""Idempotently configure signed, ten-minute MFA references in the local realm."""

import json
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parent.parent


def configure() -> None:
    values = dict(
        line.split("=", 1)
        for line in (ROOT / ".env").read_text().splitlines()
        if line and not line.startswith("#")
    )
    with httpx.Client(
        base_url="http://localhost:8081", trust_env=False, timeout=20
    ) as client:
        response = client.post(
            "/realms/master/protocol/openid-connect/token",
            data={
                "grant_type": "password",
                "client_id": "admin-cli",
                "username": values["KEYCLOAK_ADMIN"],
                "password": values["KEYCLOAK_ADMIN_PASSWORD"],
            },
        )
        response.raise_for_status()
        client.headers["Authorization"] = "Bearer " + response.json()["access_token"]
        base = "/admin/realms/railraksha"
        response = client.get(base + "/authentication/flows/browser/executions")
        response.raise_for_status()
        references = {"auth-otp-form": "otp", "webauthn-authenticator": "webauthn"}
        for execution in response.json():
            if execution.get("providerId") not in references:
                continue
            config = {
                "alias": "railraksha-" + references[execution["providerId"]],
                "config": {
                    "default.reference.value": references[execution["providerId"]],
                    "default.reference.maxAge": "600",
                },
            }
            config_id = execution.get("authenticationConfig")
            if config_id:
                response = client.get(base + "/authentication/config/" + config_id)
                response.raise_for_status()
                existing = response.json()
                config["config"] = {**existing.get("config", {}), **config["config"]}
                response = client.put(
                    base + "/authentication/config/" + config_id, json=config
                )
            else:
                response = client.post(
                    base + "/authentication/executions/" + execution["id"] + "/config",
                    json=config,
                )
            response.raise_for_status()
        response = client.get(base + "/clients", params={"clientId": "railraksha-web"})
        response.raise_for_status()
        client_id = response.json()[0]["id"]
        path = base + "/clients/" + client_id + "/protocol-mappers/models"
        response = client.get(path)
        response.raise_for_status()
        mapper = {
            "name": "railraksha-amr",
            "protocol": "openid-connect",
            "protocolMapper": "oidc-amr-mapper",
            "config": {
                "access.token.claim": "true",
                "id.token.claim": "true",
                "introspection.token.claim": "true",
            },
        }
        existing = next(
            (m for m in response.json() if m["name"] == mapper["name"]), None
        )
        if existing:
            mapper["id"] = existing["id"]
            response = client.put(path + "/" + existing["id"], json=mapper)
        else:
            response = client.post(path, json=mapper)
        response.raise_for_status()
    (ROOT / ".local" / "identity-configuration.json").write_text(
        json.dumps(
            {"signed_amr": True, "reference_max_age_seconds": 600, "configured": True}
        )
        + "\n"
    )
    print("Identity configured: signed MFA references expire after ten minutes.")


if __name__ == "__main__":
    configure()
