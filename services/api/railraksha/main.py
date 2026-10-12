import hashlib
import time
import unicodedata
import uuid
from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import asynccontextmanager
from typing import Annotated, Literal, cast

import httpx
import structlog
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel, ConfigDict, Field, field_validator
from redis.asyncio import Redis
from redis.exceptions import RedisError
from sqlalchemy import func, text
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware
from starlette.responses import Response

from railraksha.aithreat import router as aithreat_router
from railraksha.appguard import router as appguard_router
from railraksha.railsoc import router as railsoc_router
from railraksha.student import router as student_router
from railraksha.privacy import router as privacy_router
from railraksha.resilience import router as resilience_router
from railraksha.partner import router as partner_router
from railraksha.advanced_rd import router as advanced_rd_router
from railraksha.auth import KeySet, Principal, admin_user, bearer, current_user, operator_user
from railraksha.booking import router as booking_router
from railraksha.dependencies import database
from railraksha.fairqueue import router as fairqueue_router
from railraksha.limits import allowed
from railraksha.models import AuditEvent, Profile
from railraksha.phishradar import router as phishradar_router
from railraksha.registry import router as registry_router
from railraksha.registry import seed_demo
from railraksha.scamlens import router as scamlens_router
from railraksha.settings import Settings, get_settings
from railraksha.shield import router as shield_router
from railraksha.uploads import router as uploads_router
from railraksha.webaudit import router as webaudit_router

structlog.configure(
    processors=[structlog.processors.TimeStamper(fmt="iso"), structlog.processors.JSONRenderer()]
)
log = structlog.get_logger()


class ProfileInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    display_name: str = Field(min_length=1, max_length=80)
    language: Literal["en", "hi"]

    @field_validator("display_name")
    @classmethod
    def plain_name(cls, value: str) -> str:
        value = value.strip()
        if not value or any(unicodedata.category(c) == "Cc" or c in "<>" for c in value):
            raise ValueError("Use a name without markup or control characters")
        return value


class ProfileOutput(ProfileInput):
    subject: uuid.UUID


class SessionEventInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    action: Literal["session.login", "session.logout"]


def problem(request: Request, status: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(
        status_code=status,
        headers={
            "X-Request-ID": getattr(request.state, "request_id", "unavailable"),
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "no-store",
        },
        content={
            "error": {
                "code": code,
                "message": message,
                "request_id": getattr(request.state, "request_id", "unavailable"),
            }
        },
    )


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        app.state.settings = settings
        app.state.engine = create_async_engine(settings.database_url, pool_pre_ping=True)
        app.state.sessions = async_sessionmaker(app.state.engine, expire_on_commit=False)
        if settings.app_env == "development":
            await seed_demo(app.state.sessions)
        app.state.redis = Redis.from_url(settings.redis_url, socket_connect_timeout=2)
        async with httpx.AsyncClient(timeout=5, follow_redirects=False) as client:
            app.state.http = client
            app.state.keys = KeySet(
                settings.oidc_internal_issuer + "/protocol/openid-connect/certs", client
            )
            yield
        await app.state.redis.aclose()
        await app.state.engine.dispose()

    app = FastAPI(
        title="RailRaksha AI",
        version="0.1.0",
        lifespan=lifespan,
        docs_url=None,
        redoc_url=None,
        openapi_url=None,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_methods=["GET", "PUT", "POST"],
        allow_headers=["Authorization", "Content-Type"],
        allow_credentials=False,
    )
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.allowed_hosts)

    @app.middleware("http")
    async def request_context(
        request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        request.state.request_id = str(uuid.uuid4())
        started = time.monotonic()
        response: Response
        # Health probes stay independent of Redis; all application endpoints fail closed.
        if request.url.path not in {"/health", "/ready"}:
            address = request.client.host if request.client else "unknown"
            key = "api:rate:" + hashlib.sha256(address.encode()).hexdigest()
            try:
                if not await allowed(
                    app.state.redis, key, settings.rate_limit, settings.rate_window
                ):
                    response = problem(request, 429, "rate_limited", "Please wait before retrying")
                    response.headers["Retry-After"] = str(settings.rate_window)
                    return response
            except RedisError:
                return problem(request, 503, "dependency_unavailable", "Please try again shortly")
        if request.method in {"POST", "PUT", "PATCH"}:
            upload = request.url.path.endswith(("/evidence", "/qr", "/scan-apk"))
            if request.url.path.endswith("/scan-apk"):
                maximum = 50 * 1024 * 1024 + 65536
            elif upload:
                maximum = 5 * 1024 * 1024 + 65536
            else:
                maximum = 65536
            size, chunks = 0, []
            async for chunk in request.stream():
                size += len(chunk)
                if size > maximum:
                    return problem(request, 413, "body_too_large", "This request is too large")
                chunks.append(chunk)
            request._body = b"".join(chunks)
        response = await call_next(request)
        response.headers.update(
            {
                "X-Request-ID": request.state.request_id,
                "X-Content-Type-Options": "nosniff",
                "Referrer-Policy": "no-referrer",
                "Cache-Control": "no-store",
            }
        )
        # Do not log query strings, bodies, credentials, IPs, names, or emails.
        log.info(
            "http_request",
            request_id=request.state.request_id,
            method=request.method,
            route=getattr(request.scope.get("route"), "path", "unmatched"),
            status=response.status_code,
            duration_ms=round((time.monotonic() - started) * 1000),
        )
        return response

    @app.exception_handler(StarletteHTTPException)
    async def http_error(request: Request, exc: StarletteHTTPException) -> JSONResponse:
        response = problem(request, exc.status_code, f"http_{exc.status_code}", str(exc.detail))
        if exc.headers:
            response.headers.update(exc.headers)
        return response

    @app.exception_handler(RequestValidationError)
    async def validation_error(request: Request, _exc: RequestValidationError) -> JSONResponse:
        return problem(request, 422, "invalid_input", "Check the fields and try again")

    @app.exception_handler(Exception)
    async def unexpected_error(request: Request, _exc: Exception) -> JSONResponse:
        log.error("internal_error", request_id=getattr(request.state, "request_id", "unavailable"))
        return problem(request, 500, "internal_error", "Something went wrong; please try again")

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok", "service": "railraksha-api"}

    @app.get("/ready")
    async def ready(request: Request) -> dict[str, str]:
        try:
            async with app.state.engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
            await app.state.redis.ping()
            response = await app.state.http.get(
                settings.oidc_internal_issuer + "/.well-known/openid-configuration"
            )
            response.raise_for_status()
        except Exception as exc:
            raise HTTPException(503, "A required service is not ready") from exc
        return {"status": "ready"}

    @app.get("/v1/me")
    async def me(user: Annotated[Principal, Depends(current_user)]) -> dict[str, object]:
        return {"subject": str(user.subject), "name": user.name, "roles": sorted(user.roles)}

    @app.get("/v1/operator")
    async def operator(user: Annotated[Principal, Depends(operator_user)]) -> dict[str, object]:
        return {"roles": sorted(user.roles), "message": "No operator activity yet"}

    @app.get("/v1/profile", response_model=ProfileOutput)
    async def get_profile(
        user: Annotated[Principal, Depends(current_user)],
        db: Annotated[AsyncSession, Depends(database)],
    ) -> ProfileOutput:
        profile = await db.get(Profile, user.subject)
        default_name = (
            "".join(c for c in user.name if unicodedata.category(c) != "Cc" and c not in "<>")[
                :80
            ].strip()
            or "RailRaksha user"
        )
        return ProfileOutput(
            subject=user.subject,
            display_name=profile.display_name if profile else default_name,
            language=cast(Literal["en", "hi"], profile.language) if profile else "en",
        )

    @app.put("/v1/profile", response_model=ProfileOutput)
    async def update_profile(
        payload: ProfileInput,
        request: Request,
        user: Annotated[Principal, Depends(current_user)],
        db: Annotated[AsyncSession, Depends(database)],
    ) -> ProfileOutput:
        values = {"subject": user.subject, **payload.model_dump()}
        insert = sqlite_insert if db.bind and db.bind.dialect.name == "sqlite" else pg_insert
        statement = insert(Profile).values(**values)
        statement = statement.on_conflict_do_update(
            index_elements=[Profile.subject],
            set_={**payload.model_dump(), "updated_at": func.now()},
        )
        await db.execute(statement)
        db.add(
            AuditEvent(
                actor=user.subject, action="profile.updated", request_id=request.state.request_id
            )
        )
        await db.commit()
        return ProfileOutput(**values)

    @app.post("/v1/session-events", status_code=201)
    async def session_event(
        payload: SessionEventInput,
        request: Request,
        user: Annotated[Principal, Depends(current_user)],
        db: Annotated[AsyncSession, Depends(database)],
    ) -> dict[str, str]:
        db.add(
            AuditEvent(
                actor=user.subject, action=payload.action, request_id=request.state.request_id
            )
        )
        await db.commit()
        return {"status": "recorded"}

    async def docs_guard(request: Request) -> None:
        if settings.app_env == "production":
            credentials = await bearer(request)
            await admin_user(await current_user(request, credentials))

    @app.get("/api/openapi.json", include_in_schema=False, dependencies=[Depends(docs_guard)])
    async def schema() -> dict[str, object]:
        return app.openapi()

    @app.get("/api/docs", include_in_schema=False, dependencies=[Depends(docs_guard)])
    async def docs() -> HTMLResponse:
        return get_swagger_ui_html(openapi_url="/api/openapi.json", title="RailRaksha API")

    app.include_router(registry_router)
    app.include_router(uploads_router)
    app.include_router(phishradar_router)
    app.include_router(scamlens_router)
    app.include_router(appguard_router)
    app.include_router(shield_router)
    app.include_router(webaudit_router)
    app.include_router(booking_router)
    app.include_router(fairqueue_router)
    app.include_router(aithreat_router)
    app.include_router(railsoc_router)
    app.include_router(student_router)
    app.include_router(privacy_router)
    app.include_router(resilience_router)
    app.include_router(partner_router)
    app.include_router(advanced_rd_router)
    return app


app = create_app()
