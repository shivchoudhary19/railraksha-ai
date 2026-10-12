import asyncio
import base64
import io
import secrets
import struct
import sys
import types
import uuid
from collections.abc import Callable

import httpx
import pytest
from cryptography.exceptions import InvalidTag
from fastapi import FastAPI, HTTPException
from PIL import Image, PngImagePlugin

from railraksha import uploads
from railraksha.settings import Settings
from tests.test_registry import REPORT, headers, privileged


def png() -> bytes:
    image = Image.new("RGB", (50, 50), "white")
    output = io.BytesIO()
    metadata = PngImagePlugin.PngInfo()
    metadata.add_text("Private", "DEMO location")
    image.save(output, format="PNG", pnginfo=metadata)
    return output.getvalue()


def test_envelope_encryption_binds_key_and_object() -> None:
    data, key = b"DEMO private evidence", secrets.token_bytes(32)
    encrypted, wrapped = uploads.encrypt(data, "evidence/demo", key)
    assert data not in encrypted and key not in wrapped
    assert uploads.decrypt(encrypted, wrapped, "evidence/demo", key) == data
    for other_key, other_object in [
        (key, "evidence/other"),
        (secrets.token_bytes(32), "evidence/demo"),
    ]:
        with pytest.raises(InvalidTag):
            uploads.decrypt(encrypted, wrapped, other_object, other_key)


def test_image_metadata_removed_and_bad_file_rejected() -> None:
    cleaned = uploads.clean_image(png())
    with Image.open(io.BytesIO(cleaned)) as image:
        assert image.info == {} and image.format == "PNG"
    with pytest.raises(HTTPException, match="PNG or JPEG"):
        uploads.clean_image(b"<html>fake.png</html>")
    output = io.BytesIO()
    Image.new("RGB", (3500, 3500)).save(output, format="PNG")
    with pytest.raises(HTTPException):
        uploads.clean_image(output.getvalue())
    with pytest.raises(HTTPException):
        uploads.master_key(Settings(_env_file=None, evidence_master_key="wrong"))


class Writer:
    def __init__(self) -> None:
        self.data = bytearray()
        self.closed = False

    def write(self, data: bytes) -> None:
        self.data.extend(data)

    async def drain(self) -> None:
        pass

    def close(self) -> None:
        self.closed = True

    async def wait_closed(self) -> None:
        pass


@pytest.mark.parametrize(
    ("answer", "status"),
    [
        (b"stream: OK\0", 0),
        (b"stream: Eicar-Test-Signature FOUND\0", 422),
        (b"stream: ERROR\0", 503),
        (b"", 503),
    ],
)
async def test_clamd_framing_and_fail_closed(
    monkeypatch: pytest.MonkeyPatch, answer: bytes, status: int
) -> None:
    reader, writer = asyncio.StreamReader(), Writer()
    reader.feed_data(answer)
    reader.feed_eof()

    async def connect(*_args: object) -> tuple[asyncio.StreamReader, Writer]:
        return reader, writer

    monkeypatch.setattr(asyncio, "open_connection", connect)
    data = b"DEMO file"
    if status:
        with pytest.raises(HTTPException) as error:
            await uploads.scan(
                data,
                Settings(
                    _env_file=None,
                ),
            )
        assert error.value.status_code == status
    else:
        await uploads.scan(
            data,
            Settings(
                _env_file=None,
            ),
        )
    assert writer.data == b"zINSTREAM\0" + struct.pack("!I", len(data)) + data + b"\0\0\0\0"
    assert writer.closed


async def test_scan_connection_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    async def connect(*_args: object) -> None:
        raise OSError("DEMO unavailable")

    monkeypatch.setattr(asyncio, "open_connection", connect)
    with pytest.raises(HTTPException) as error:
        await uploads.scan(
            b"demo",
            Settings(
                _env_file=None,
            ),
        )
    assert error.value.status_code == 503


class Bucket:
    def __init__(self) -> None:
        self.objects: dict[str, bytes] = {}

    def put_object(self, *, Bucket: str, Key: str, Body: bytes, ContentType: str) -> None:
        self.objects[Key] = Body

    def get_object(self, *, Bucket: str, Key: str) -> dict[str, object]:
        return {"Body": io.BytesIO(self.objects[Key])}

    def delete_object(self, *, Bucket: str, Key: str) -> None:
        self.objects.pop(Key, None)


async def test_private_evidence_roundtrip_owner_and_recent_mfa_only(
    app: FastAPI,
    client: httpx.AsyncClient,
    token: Callable[..., str],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    bucket = Bucket()
    monkeypatch.setattr(uploads, "storage", lambda _settings: bucket)

    async def clean_scan(_data: bytes, _settings: Settings) -> None:
        pass

    monkeypatch.setattr(uploads, "scan", clean_scan)
    app.state.settings.evidence_master_key = base64.urlsafe_b64encode(
        secrets.token_bytes(32)
    ).decode()
    auth = headers(token)
    report = (await client.post("/v1/reports", headers=auth, json=REPORT)).json()["id"]
    other = headers(token, sub=str(uuid.uuid4()))
    endpoint = f"/v1/reports/{report}/evidence"
    assert (
        await client.post(endpoint, headers=other, files={"file": ("demo.png", png(), "image/png")})
    ).status_code == 404
    response = await client.post(
        endpoint, headers=auth, files={"file": ("private-name.png", png(), "image/png")}
    )
    assert response.status_code == 201
    identifier = response.json()["id"]
    assert (await client.get(endpoint, headers=auth)).json()[0]["id"] == identifier
    encrypted = next(iter(bucket.objects.values()))
    assert b"DEMO location" not in encrypted
    for denied in [other, headers(token, "analyst", sub=str(uuid.uuid4()))]:
        assert (await client.get(endpoint, headers=denied)).status_code == 404
        assert (await client.get("/v1/evidence/" + identifier, headers=denied)).status_code == 404
    for permitted in [auth, privileged(token)]:
        downloaded = await client.get("/v1/evidence/" + identifier, headers=permitted)
        assert downloaded.status_code == 200 and downloaded.content == uploads.clean_image(png())
        assert downloaded.headers["cache-control"] == "no-store"
    assert (await client.get(f"/v1/evidence/{uuid.uuid4()}", headers=auth)).status_code == 404
    assert (
        await client.post(endpoint, headers=auth, files={"file": ("bad.png", b"html")})
    ).status_code == 422
    assert (
        await client.post(endpoint, headers=auth, files={"file": ("empty.png", b"")})
    ).status_code == 413


async def test_qr_only_supported_single_identifier(
    client: httpx.AsyncClient,
    token: Callable[..., str],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    module = types.ModuleType("pyzbar.pyzbar")
    module.ZBarSymbol = types.SimpleNamespace(QRCODE=64)  # type: ignore[attr-defined]
    codes = [types.SimpleNamespace(data=b"https://demo.railraksha.example/")]
    module.decode = lambda *_args, **_kwargs: codes  # type: ignore[attr-defined]
    monkeypatch.setitem(sys.modules, "pyzbar.pyzbar", module)

    async def clean_scan(_data: bytes, _settings: Settings) -> None:
        pass

    monkeypatch.setattr(uploads, "scan", clean_scan)
    response = await client.post(
        "/v1/verify/qr", headers=headers(token), files={"file": ("qr.png", png())}
    )
    assert response.status_code == 200 and response.json()["verdict"] == "unknown"
    for value in (b"upi://pay?pa=railraksha-demo@demo", b"unsupported", b"\xff", b"x" * 2049):
        codes[0].data = value
        response = await client.post(
            "/v1/verify/qr", headers=headers(token), files={"file": ("qr.png", png())}
        )
        assert response.status_code == (200 if value.startswith(b"upi://") else 422)
    codes.clear()
    assert (
        await client.post(
            "/v1/verify/qr", headers=headers(token), files={"file": ("qr.png", png())}
        )
    ).status_code == 422


async def test_body_bound_is_checked_before_multipart_parsing(
    client: httpx.AsyncClient, token: Callable[..., str]
) -> None:
    auth = headers(token)
    assert (await client.post("/v1/reports", headers=auth, content=b"x" * 65537)).status_code == 413
    assert (
        await client.post("/v1/verify/qr", headers=auth, content=b"x" * (6 * 1024 * 1024))
    ).status_code == 413
