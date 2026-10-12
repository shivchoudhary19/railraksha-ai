import io
import zipfile
from collections.abc import Callable

import httpx
import pytest

from railraksha.appguard import extract_package_from_identifier
from tests.test_registry import headers


def test_extract_package_from_identifier() -> None:
    url = "https://play.google.com/store/apps/details?id=cris.org.in.prs.ima&hl=en_IN"
    assert extract_package_from_identifier(url) == "cris.org.in.prs.ima"
    assert extract_package_from_identifier("com.cris.uts") == "com.cris.uts"


@pytest.mark.asyncio
async def test_check_official_railway_package(
    client: httpx.AsyncClient, token: Callable[..., str]
) -> None:
    auth_headers = headers(token, "citizen")
    resp = await client.post(
        "/v1/appguard/check-package",
        json={"identifier": "cris.org.in.prs.ima"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["verdict"] == "safe"
    assert data["is_official_match"] is True
    assert data["risk_score"] == 0
    assert "IRCTC Rail Connect" in data["app_name"]


@pytest.mark.asyncio
async def test_check_lookalike_railway_package(
    client: httpx.AsyncClient, token: Callable[..., str]
) -> None:
    auth_headers = headers(token, "citizen")
    resp = await client.post(
        "/v1/appguard/check-package",
        json={"identifier": "com.irctc.tatkal.fastbooking.xyz"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["verdict"] in {"suspicious", "dangerous"}
    assert data["is_official_match"] is False
    assert any(ind["category"] == "brand_impersonation" for ind in data["suspicious_indicators"])


@pytest.mark.asyncio
async def test_scan_apk_with_dangerous_permissions(
    client: httpx.AsyncClient, token: Callable[..., str]
) -> None:
    auth_headers = headers(token, "citizen")

    # Build a synthetic APK zip with AndroidManifest.xml
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        manifest_text = (
            'package="com.tatkal.autoclick.stealer" '
            "android.permission.READ_SMS "
            "android.permission.RECEIVE_SMS "
            "android.permission.BIND_ACCESSIBILITY_SERVICE "
            "android.permission.SYSTEM_ALERT_WINDOW"
        )
        z.writestr("AndroidManifest.xml", manifest_text.encode("utf-8"))
        z.writestr("classes.dex", b"DEX DATA tatkal autofill booking bot script")

    apk_bytes = buf.getvalue()
    files = {"file": ("malicious-tatkal.apk", apk_bytes, "application/vnd.android.package-archive")}

    resp = await client.post(
        "/v1/appguard/scan-apk",
        files=files,
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["verdict"] == "dangerous"
    assert data["risk_score"] >= 65
    assert len(data["dangerous_permissions"]) >= 3
    assert any("READ_SMS" in p["permission"] for p in data["dangerous_permissions"])
    assert any("ACCESSIBILITY" in p["permission"] for p in data["dangerous_permissions"])


@pytest.mark.asyncio
async def test_scan_apk_invalid_archive(
    client: httpx.AsyncClient, token: Callable[..., str]
) -> None:
    auth_headers = headers(token, "citizen")
    files = {"file": ("corrupt.apk", b"not-a-valid-zip-content", "application/octet-stream")}
    resp = await client.post("/v1/appguard/scan-apk", files=files, headers=auth_headers)
    assert resp.status_code == 400
    assert "not a valid APK" in resp.json()["error"]["message"]


@pytest.mark.asyncio
async def test_list_official_apps(
    client: httpx.AsyncClient, token: Callable[..., str]
) -> None:
    auth_headers = headers(token, "citizen")
    resp = await client.get("/v1/appguard/official-apps", headers=auth_headers)
    assert resp.status_code == 200
    apps = resp.json()
    assert len(apps) >= 4
    packages = [a["package_name"] for a in apps]
    assert "cris.org.in.prs.ima" in packages
    assert "com.cris.uts" in packages


@pytest.mark.asyncio
async def test_device_checkup_evaluation(
    client: httpx.AsyncClient, token: Callable[..., str]
) -> None:
    auth_headers = headers(token, "citizen")

    # Optimal device setup
    optimal_payload = {
        "platform": "android",
        "screen_lock": True,
        "sideloading_disabled": True,
        "play_protect_active": True,
        "os_updated": True,
        "dangerous_permissions_checked": True,
        "remote_access_absent": True,
        "backup_enabled": True,
    }
    resp = await client.post(
        "/v1/appguard/device-checkup", json=optimal_payload, headers=auth_headers
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["safety_score"] == 100
    assert data["status"] == "optimal"
    assert len(data["remediation_steps"]) == 0

    # Vulnerable device setup
    vulnerable_payload = {
        "platform": "android",
        "screen_lock": False,
        "sideloading_disabled": False,
        "play_protect_active": False,
        "os_updated": False,
        "dangerous_permissions_checked": False,
        "remote_access_absent": False,
        "backup_enabled": False,
    }
    resp = await client.post(
        "/v1/appguard/device-checkup", json=vulnerable_payload, headers=auth_headers
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["safety_score"] <= 40
    assert data["status"] == "critical_risk"
    assert len(data["remediation_steps"]) >= 4
