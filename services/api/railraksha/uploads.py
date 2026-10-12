import asyncio
import base64
import hashlib
import io
import secrets
import struct
import uuid
import warnings
from typing import Protocol, cast

import boto3  # type: ignore[import-untyped]
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from fastapi import APIRouter, HTTPException, Request, UploadFile
from PIL import Image, UnidentifiedImageError
from pydantic import BaseModel
from starlette.responses import Response

from railraksha.auth import Principal, moderator_write, operator_user
from railraksha.dependencies import audit
from railraksha.registry import Citizen, Database, Verification, verify
from railraksha.registry_models import Report, ReportEvidence
from railraksha.settings import Settings

router = APIRouter(prefix="/v1", tags=["Private evidence and QR"])
MAX_IMAGE = 5 * 1024 * 1024
MAX_PIXELS = 12_000_000


class Storage(Protocol):
    def put_object(self, *, Bucket: str, Key: str, Body: bytes, ContentType: str) -> object: ...
    def get_object(self, *, Bucket: str, Key: str) -> dict[str, object]: ...
    def delete_object(self, *, Bucket: str, Key: str) -> object: ...


class Readable(Protocol):
    def read(self) -> bytes: ...


def storage(settings: Settings) -> Storage:
    return cast(
        Storage,
        boto3.client(
            "s3",
            endpoint_url=settings.s3_endpoint,
            region_name="garage",
            aws_access_key_id=settings.s3_access_key,
            aws_secret_access_key=settings.s3_secret_key,
        ),
    )


def master_key(settings: Settings) -> bytes:
    try:
        key = base64.urlsafe_b64decode(settings.evidence_master_key + "===")
        if len(key) != 32:
            raise ValueError("Invalid key")
        return key
    except ValueError as exc:
        raise HTTPException(503, "Private storage is not configured") from exc


def encrypt(data: bytes, object_key: str, key: bytes) -> tuple[bytes, bytes]:
    data_key = AESGCM.generate_key(bit_length=256)
    nonce, wrap_nonce = secrets.token_bytes(12), secrets.token_bytes(12)
    aad = object_key.encode()
    return (
        nonce + AESGCM(data_key).encrypt(nonce, data, aad),
        wrap_nonce + AESGCM(key).encrypt(wrap_nonce, data_key, aad),
    )


def decrypt(data: bytes, wrapped: bytes, object_key: str, key: bytes) -> bytes:
    aad = object_key.encode()
    data_key = AESGCM(key).decrypt(wrapped[:12], wrapped[12:], aad)
    return AESGCM(data_key).decrypt(data[:12], data[12:], aad)


async def scan(data: bytes, settings: Settings) -> None:
    writer: asyncio.StreamWriter | None = None
    try:
        async with asyncio.timeout(30):
            reader, writer = await asyncio.open_connection(
                settings.clamav_host, settings.clamav_port
            )
            writer.write(b"zINSTREAM\0")
            for position in range(0, len(data), 65536):
                chunk = data[position : position + 65536]
                writer.write(struct.pack("!I", len(chunk)) + chunk)
                await writer.drain()
            writer.write(b"\0\0\0\0")
            await writer.drain()
            result = await reader.readuntil(b"\0")
            if result.endswith(b" FOUND\0"):
                raise HTTPException(422, "The upload was rejected by the malware scanner")
            if result != b"stream: OK\0":
                raise HTTPException(503, "The malware scan did not complete")
    except (OSError, TimeoutError, asyncio.IncompleteReadError, asyncio.LimitOverrunError) as exc:
        raise HTTPException(503, "The malware scanner is unavailable; try again later") from exc
    finally:
        if writer:
            writer.close()
            await writer.wait_closed()


def clean_image(data: bytes) -> bytes:
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(data)) as image:
                if image.format not in {"PNG", "JPEG"} or image.width * image.height > MAX_PIXELS:
                    raise ValueError("Unsupported image")
                image.load()
                clean = image.convert("RGB")
                output = io.BytesIO()
                clean.save(output, format="PNG")
                if output.tell() > MAX_IMAGE:
                    raise ValueError("Image too large")
                return output.getvalue()
    except (
        ValueError,
        OSError,
        UnidentifiedImageError,
        Image.DecompressionBombError,
        Image.DecompressionBombWarning,
    ) as exc:
        raise HTTPException(
            422, "Use a PNG or JPEG screenshot under 5 MB and 12 megapixels"
        ) from exc


async def read_image(file: UploadFile, settings: Settings) -> bytes:
    data = await file.read(MAX_IMAGE + 1)
    if not data or len(data) > MAX_IMAGE:
        raise HTTPException(413, "The image must be between 1 byte and 5 MB")
    await scan(data, settings)
    return await asyncio.to_thread(clean_image, data)


class EvidenceOutput(BaseModel):
    id: uuid.UUID
    sha256: str
    size: int


async def evidence_access(report: Report | None, user: Principal) -> None:
    if report and report.owner == user.subject:
        return
    if report:
        try:
            await moderator_write(await operator_user(user))
            return
        except HTTPException:
            pass
    raise HTTPException(404, "Evidence not found")


@router.post("/reports/{report_id}/evidence", response_model=EvidenceOutput, status_code=201)
async def upload_evidence(
    report_id: uuid.UUID,
    file: UploadFile,
    request: Request,
    db: Database,
    user: Citizen,
) -> EvidenceOutput:
    report = await db.get(Report, report_id)
    if not report or report.owner != user.subject:
        raise HTTPException(404, "Report not found")
    settings = request.app.state.settings
    key = master_key(settings)
    data = await read_image(file, settings)
    identifier = uuid.uuid4()
    object_key = "evidence/" + str(identifier)
    encrypted, wrapped = encrypt(data, object_key, key)
    bucket = storage(settings)
    try:
        await asyncio.to_thread(
            bucket.put_object,
            Bucket=settings.s3_bucket,
            Key=object_key,
            Body=encrypted,
            ContentType="application/octet-stream",
        )
    except Exception as exc:
        raise HTTPException(503, "Private storage is unavailable") from exc
    evidence = ReportEvidence(
        id=identifier,
        report_id=report_id,
        object_key=object_key,
        sha256=hashlib.sha256(data).hexdigest(),
        size=len(data),
        media_type="image/png",
        wrapped_key=wrapped,
    )
    db.add(evidence)
    audit(db, request, user, "report.evidence_added")
    try:
        await db.commit()
    except Exception:
        await asyncio.to_thread(bucket.delete_object, Bucket=settings.s3_bucket, Key=object_key)
        raise
    return EvidenceOutput(id=identifier, sha256=evidence.sha256, size=len(data))


@router.get("/reports/{report_id}/evidence", response_model=list[EvidenceOutput])
async def list_evidence(report_id: uuid.UUID, db: Database, user: Citizen) -> list[EvidenceOutput]:
    from sqlalchemy import select

    report = await db.get(Report, report_id)
    await evidence_access(report, user)
    rows = await db.scalars(select(ReportEvidence).where(ReportEvidence.report_id == report_id))
    return [EvidenceOutput(id=row.id, sha256=row.sha256, size=row.size) for row in rows]


@router.get("/evidence/{evidence_id}")
async def download_evidence(
    evidence_id: uuid.UUID,
    request: Request,
    db: Database,
    user: Citizen,
) -> Response:
    evidence = await db.get(ReportEvidence, evidence_id)
    report = await db.get(Report, evidence.report_id) if evidence else None
    await evidence_access(report, user)
    if not evidence:
        raise HTTPException(404, "Evidence not found")
    settings = request.app.state.settings
    try:
        result = await asyncio.to_thread(
            storage(settings).get_object, Bucket=settings.s3_bucket, Key=evidence.object_key
        )
        encrypted = await asyncio.to_thread(cast(Readable, result["Body"]).read)
        data = decrypt(encrypted, evidence.wrapped_key, evidence.object_key, master_key(settings))
    except Exception as exc:
        raise HTTPException(503, "Private storage is unavailable") from exc
    return Response(
        data,
        media_type=evidence.media_type,
        headers={
            "Content-Disposition": 'attachment; filename="evidence.png"',
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
        },
    )


def qr_value(data: bytes) -> str:
    from pyzbar.pyzbar import ZBarSymbol, decode  # type: ignore[import-untyped]

    with Image.open(io.BytesIO(data)) as image:
        codes = decode(image, symbols=[ZBarSymbol.QRCODE])
    if len(codes) != 1:
        raise HTTPException(422, "Use an image containing exactly one QR code")
    try:
        value = cast(bytes, codes[0].data).decode("utf-8")
        if len(value) > 2048:
            raise ValueError("QR value too long")
        return value
    except (UnicodeError, ValueError) as exc:
        raise HTTPException(422, "The QR identifier is not supported") from exc


@router.post("/verify/qr", response_model=Verification)
async def verify_qr(
    file: UploadFile, request: Request, db: Database, _user: Citizen
) -> Verification:
    data = await read_image(file, request.app.state.settings)
    value = await asyncio.to_thread(qr_value, data)
    if value.startswith("upi://"):
        return await verify(db, "upi", value)
    if value.startswith(("https://", "http://")):
        return await verify(db, "url", value)
    raise HTTPException(422, "This QR code must contain a URL or UPI payment identifier")
