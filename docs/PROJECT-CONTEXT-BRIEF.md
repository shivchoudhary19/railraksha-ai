# Project Context Brief

Prepared 12 October 2026 for transfer to another AI. This brief describes the current repository state and decisions from the conversation. Treat the source tree and `docs/build-status.md` as authoritative if a later change makes this brief stale. The five-hour delivery target set by the user is 23:22 IST on 12 October 2026.

## 1. Project Overview & Ultimate Goal

Build **RailRaksha AI**, an English/Hindi digital-safety platform for railway passengers, students, security operators, and partners. The supplied product definition is [master-build-prompt.md](master-build-prompt.md). It specifies fifteen phases, from the secure foundation through an official railway-identity registry, phishing/message/app analysis, browser protection, railway booking and fairness simulations, local AI/SOC tools, student education, privacy rights, deployment, partner SDKs, and optional R&D.

The user explicitly superseded the source prompt's instruction to stop after each phase: build all phases in one continuous effort. The original security, privacy, regression, accessibility, and authorized-use requirements still apply. The user chose **local services first** for AI/deployment. Their delivery request is to move as fast as possible and target five hours; prioritize working local end-to-end journeys while recording what has actually passed. A target time is not evidence that every feature, metric, certification, or production-readiness criterion has been met.

The application is deliberately branded as independent and currently runs as a **local DEMO** with synthetic railway identifiers/accounts. It must never imply affiliation with Indian Railways/IRCTC or give an “official” or “safe” result for an identifier merely because it is unknown. User reports are private until moderation; the public report feed contains generated summaries, never reporter text.

Workspace: `/Users/shivchoudhary21/Documents/ChatGPT/railwaiy`. Start locally with `make dev`; stop containers with `make stop` (preserves named data volumes). The active app is at `http://localhost:3000/en` and `/hi`. Keep secrets from `.env` private and never print, paste, commit, or add them to reports/artifacts.

## 2. Current Progress & Milestones Achieved

| Phase | Current status | Evidence / remaining gate |
|---|---|---|
| 1 — Foundation, authentication, EN/HI website | Complete | Full report: [phase-1-report.md](phase-1-report.md). Original complete local gate: 50 web unit tests, 43 API tests, 33 Playwright tests, 22 Lighthouse pages, PostgreSQL migration/initializer, scanner and container checks. |
| 2 — Registry, verification, reports, moderation | In progress | API features and EN/HI tool UI are implemented. API suite most recently reports **89 passed**, **89.08% overall coverage**, above the 80% gate. Phase 1→2 migration/rollback script passed and preserved the audit row. A Compose build for API, migration, and web completed. The new complete browser journey and final UI/TypeScript/accessibility/security gates have not yet been shown to pass. See below. |
| 3–15 | Not started | See current ledger [build-status.md](build-status.md) and phase definitions in the master prompt. Do not mark a phase complete without its checks. |

Phase 2 implementation present in source:

- Normalization for URL/social URL (IDN, default/non-default ports, removal of fragments/tracking parameters), domains, Indian phone numbers/E.164 plus known emergency/help short codes, email, UPI, and Android package identifiers. Malformed input and controls are rejected.
- Authenticated identifier verification gives only `official`, `unknown`, or `known_scam`. `unknown` explicitly carries **no safety guarantee**. A URL can match an exact verified URL or an explicitly registered/blocked domain; response scope states `identifier` versus `domain`. Reviewed scam indicators take precedence.
- Analyst/admin-managed registry entries store source, verifying user, timestamp, status, optional app certificate SHA-256, and explicit synthetic-demo marking. Three `.example` / demo identifiers are idempotently seeded only in local development.
- Private citizen report submission requires explicit `consent_to_store: true`, preserves EN/HI and optional location, and returns a tracking UUID. Users can list/view only their own reports; other owners receive 404. Message values are SHA-256 hashed for indexing; report description remains private.
- Operator queue and approve/reject/merge endpoints. Writing requires an operator role and signed `amr` authentication method (`otp`, `webauthn`, or `webauthn-passwordless`) with signed `auth_time` no older than 600 seconds. Registry editing further requires analyst/admin/super_admin. Approval is audited, conflicts with an active verified registry item until it has first been revoked, and adds a known-scam indicator. Merge requires an existing matching report; both report rows are locked in stable ID order to reduce concurrent opposite-merge deadlocks.
- Public `/v1/scams/recent` returns at most 20 generated category summaries and review timestamps. It does not expose raw report text, names, identifiers, contact details, or report UUIDs.
- Screenshot evidence is owner- or recently-authenticated-moderator-only. Incoming images are bounded to 5 MiB, scanned through ClamAV's length-framed `INSTREAM` protocol, fail closed when scanner results are unavailable/errors, decoded/re-encoded as PNG, and limited to 12 megapixels. Metadata/EXIF is stripped. Each object is encrypted using AES-256-GCM with a random per-object data key and object-key AAD; that data key is separately wrapped with a local 32-byte master key. Stored filename is a random UUID; downloads are attachment, no-store, and nosniff.
- QR images go through the same size, malware, and re-encoding checks. Only exactly one UTF-8 QR payload of up to 2,048 characters beginning with HTTP(S) or `upi://` is accepted. QR contents are verified locally; the service does not fetch those URLs.
- New registry/report/evidence/moderation migration is `0002_registry`. A disposable real PostgreSQL check verified upgrade from Phase 1, preservation of Phase 1 audit data, absence of app-role update rights on moderation actions, search indexes, rollback to Phase 1, and reapplication. The app database was not reset.
- Web pages: `/[locale]/verify`, `/reports`, `/registry`, `/moderation`, and public `/scams`. Dashboard has citizen tool links; operator page links to moderation/registry. A same-origin, CSRF-protected BFF allowlists API paths and HTTP methods, validates JSON schemas before forwarding, limits chunked request bytes rather than trusting `Content-Length`, avoids logging user inputs, and forces evidence downloads to safe PNG attachments.
- Local S3-compatible Garage, a generated 32-byte evidence master key, and a native-architecture Alpine ClamAV service were added. Current built scanner image installed Alpine's `clamav`/`clamav-daemon` package (reported package version 1.4.6); initial signature availability and an actual end-to-end ClamAV/EICAR scan still need explicit confirmation. It has a 2 GiB memory cap, no host port, and belongs to a separate malware network. API reaches storage and scanner through Compose networks.
- Local Keycloak provisioning script [configure-identity.py](../scripts/configure-identity.py) idempotently adds ten-minute `otp`/`webauthn` authenticator reference configurations and an `oidc-amr-mapper` to the web client. It is run by `make dev`. Keycloak's `basic` scope already maps `auth_time` into access tokens. Confirm with a fresh signed TOTP token and an actual privileged write; unit tokens alone do not establish live identity integration.

Phase 2 gates still to run: latest frontend typecheck and lint after adding the new routes, current Docker `up --build --wait` so the just-built files and migration are the running ones, live Garage+ClamAV/EICAR checks, visual and axe/keyboard/mobile verification of the new pages in EN/HI, a citizen report → sign in as TOTP analyst → moderation approve → registry verify “known scam” browser flow, and a final full regression/security scan. E2E helpers were recently extracted to `tests/helpers/identity.ts`; shared `tests/e2e/auth.spec.ts` was updated to import them. Verify the refactor with project TypeScript/E2E checks. Review any failed output before treating Phase 2 as complete.

Recent proof files (ignored/local under `.local/`): `checks/phase-2-api-tests.log`, `checks/phase-2-build.log`, `checks/e2e-full.log`, and migration logs. The phase ledger was last updated before Phase 2 implementation and is currently stale; update it after gates run.

## 3. Tech Stack, Architecture, & Libraries Used

- **Monorepo:** pnpm 11.25, Turborepo 2.11.7, shared Zod schema/UI/config packages, strict TypeScript. Repository `AGENTS.md` has a managed Turborepo instruction block. If changing Turborepo configuration or commands, resolve the local Turbo package and read its bundled `docs/README.md` plus relevant bundled docs first.
- **Web:** Next.js 15.5, React 19, Tailwind 4, Radix, Lucide, next-intl, Zod 4, `jose` for JWT/JWKS. Server-side BFF keeps OAuth access/ID tokens in Redis-backed server sessions; browser has only an opaque HttpOnly session cookie. Tool forms exist in `apps/web/src/components/safety-tools.tsx`; routes are server rendered in English and Hindi.
- **API:** Python 3.12, FastAPI, Pydantic 2, SQLAlchemy 2 async, Alembic, PostgreSQL 16, asyncpg, Redis 7 and Lua rate limiting, PyJWT RSA verification, structlog. Core app is `services/api/railraksha/main.py`; shared database/audit dependencies are `dependencies.py`; Phase 2 lives in `registry.py`, `registry_models.py`, `normalization.py`, and `uploads.py`.
- **Identity:** Keycloak 26.8, RS256 access tokens, issuer/audience/expiry/subject and verified-email validation, 10 realm roles (citizen, student, verified_reporter, analyst, soc_lead, rpf_cyber, asset_owner, partner_dev, admin, super_admin). Five operator roles; registry edits limited to analyst/admin/super_admin. Authorization Code + PKCE, one-use state/nonce, server Redis session, Origin+CSRF checks. OTP/passkey references are signed by Keycloak; operator write age is checked from the signed `auth_time` and `amr`, not a request header.
- **Local services:** Docker Compose; PostgreSQL, Redis, Keycloak, Mailpit (approved maintained alternative to MailHog), Garage S3-compatible storage (approved maintained alternative to MinIO), web and API. API role is a non-owner DB user; migration/owner role is separate. Local-only ports bind to loopback. Keycloak is port **8081**, since an unrelated pre-existing process occupies local 8080; leave that process alone. ClamAV is an internal-only service on malware network.
- **Upload/security dependencies:** Pillow (decode, dimension-check, re-encode images and strip metadata), `pyzbar` plus Alpine `zbar` library (QR), phonenumbers, python-multipart, boto3, cryptography AES-GCM, native ClamAV signature scanner. Security middleware disables Uvicorn access logs because query strings may hold user data; structured app request logs exclude query, body, credentials, names, email, and IP. API request body cap checks actual received bytes. Evidence files are never returned inline.
- **Build and test tooling:** pytest/pytest-asyncio/pytest-cov, Ruff, strict mypy, Vitest/V8 coverage, ESLint, Playwright/axe, Lighthouse, Semgrep, Gitleaks, pip-audit, pnpm audit and Trivy. E2E traces/video/screenshots and sensitive failure snapshots are disabled.
- **Persistence:** Alembic `0001_foundation` for profile and append-only audit; `0002_registry` for verified assets, indicators, reports, encrypted evidence metadata and moderation actions. GIN trigram label index and public-summary full-text index. No test should reset the user's Compose DB; migration regression makes a disposable DB and removes only its generated name.

Useful service URLs: web `http://localhost:3000`; API `http://localhost:8000`; Keycloak `http://localhost:8081`; Mailpit `http://localhost:8025`; Garage S3 `http://localhost:3900`. Seed accounts are `demo.<role>@example.test`; retrieve the shared synthetic password privately from `.env`.

Runtime paths when plain `python`, `pnpm`, or Docker Desktop's CLI are missing from shell PATH:

```sh
.venv/bin/python
.venv/bin/pytest
.venv/bin/ruff
.venv/bin/mypy
PATH="/Users/shivchoudhary21/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/Users/shivchoudhary21/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback:$PATH" pnpm
PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH" docker compose
```

Run Python tests from `services/api` so pytest loads the API's `pyproject.toml` and `conftest.py`: `cd services/api && ../../.venv/bin/pytest -q`. The API test settings explicitly use `_env_file=None`; from repository root, pytest can collect the wrong test/config context and load the actual `.env`.

## 4. Known Constraints, Edge Cases, & Rules

1. **Authorization/scope:** full remaining phases are authorized; do not pause for a `NEXT PHASE`. This does not authorize deploying/publishing, changing external systems/accounts, contacting partners, sending Slack/email, or using paid/cloud services. Keep development local unless user changes that preference.
2. **No invented completion:** maintain `docs/build-status.md`; call a phase complete only after its applicable functional, security, privacy, regression, performance, and accessibility checks pass. Keep model metrics, load, TLS/header grades, certification, and production claims at “unverified” until measured on appropriate data/hardware or environment.
3. **User safety and rail systems:** never run active scans against unverified third-party assets. Real railway content may receive passive public checks only. Active scan targets must be verified as controlled by the user/asset owner or bundled DEMO targets, run in isolated restricted services with SSRF/private-IP/rebinding protections. APKs are static-only and must never execute. Booking, fares, PNRs, passengers, payments, refunds, and fraud simulations use synthetic data. Do not perform real ticket booking.
4. **Privacy:** data minimization, explicit opt-in for reports/evidence, per-owner read isolation, moderator MFA for evidence, output encoding/filename generation, PII-safe logs, generated public feed text, no credentials or OTP/PIN in app prompts or logs. Images are re-encoded and private evidence encrypted. Do not infer report consent from login. Current reports require an authenticated citizen; anonymous reporting/CAPTCHA is not implemented and must be tracked as a deviation or implemented safely.
5. **Security mechanisms:** Keycloak-signed AMR/auth_time claims only, not client-supplied freshness. Unknown identifier never means safe. A verified domain match means only “this identifier/domain is in the registry,” not that every message, page, account or app using that name is authentic. Exact source evidence/`verified_by` is required for real registry additions. Synthetic entries are visibly DEMO. Registry uses `example` domain, never invent real government assets.
6. **Database/data safety:** preserve existing DB/storage volumes; no `down -v`, truncates, reset, destructive migration, or broad cleanup. Build forward with migration and test fresh+upgrade+rollback on disposable DB only. Audit log has trigger and app role cannot update/delete it. Moderator actions are append-only for app role. Use stable row-lock ordering for merges.
7. **Upload limits/edge cases:** don’t trust `Content-Length`; stream-count BFF/API request bodies. Current max is 5 MiB + multipart allowance, images PNG/JPEG after actual decode, ≤12 MP, ClamAV fail-closed with 30s scan timeout, exact single QR only, 2,048-character UTF-8 HTTP(S)/UPI payload. Do not store original filename, EXIF, or unencrypted object. Scanner must have fresh signature DB before accepting files.
8. **Idempotence/availability:** `seed_demo` is stable UUID and conflict-safe; identity setup is idempotent. Health/readiness endpoints stay independent of Redis for liveness; application actions fail closed when needed dependencies fail. Do not log access logs containing request query strings.
9. **Local environment:** Docker is installed and running. There is an unrelated process on port 8080; Keycloak deliberately uses 8081. Respect 8 GiB-ish Docker VM budget (ClamAV capped at 2 GiB). The original user's alternatives approval (Garage/Mailpit) is already given. Do not ask again.
10. **Source control:** files currently show as untracked (`??`) because repository has no initial commit. No remote/published PR is set up. Don't claim a commit, remote CI run, or deployed site.
11. **Design/content:** use existing accessible navy/green government-service design, system fonts, EN/HI locale routes, responsive layouts, visible focus states, semantic forms and no fabricated service statistics. Keep copy clear that this is independent/local DEMO. National reporting links currently include `cybercrime.gov.in`, dial link 1930, and official Sanchar Saathi Chakshu. The linked official Chakshu source checked during this conversation is [Sanchar Saathi SFC](https://sancharsaathi.gov.in/sfc/); financial-loss advice must stay distinct from suspicious-communication reporting.
12. **Codex skills previously used:** karpathy-guidelines (small, surgical, verify assumptions), ponytail (smallest complete solution, tests for nontrivial/security code, explicitly disclose unchecked work/risk), ui-ux-pro-max, React best practices, security-best-practices, Playwright, and Postgres best practices. Existing full project skills instructions are in the relevant `~/.codex/skills/*/SKILL.md`; no need to re-install them.

## 5. Immediate Next Steps & Open Tasks

**Resume with the outstanding Phase 2 gates first, then continue forward without waiting for permission.**

1. Check status of running commands/sessions; don't repeat completed work. Run latest `pnpm typecheck`, `pnpm lint`, `pnpm test`, Ruff/mypy, and API tests from `services/api`. Fix failures caused by new route/test helper changes. If using the API unittest invocation, avoid loading `.env` (fixture already passes `_env_file=None`).
2. Start/recreate latest Compose services using `make dev`. Verify Alembic head is `0002_registry`, seed entries, identity configuration, health/readiness, and S3 bucket access. Don't print secret environment values. Verify ClamAV signature readiness, actual harmless upload and EICAR rejection in scanner sandbox. Ensure unavailable scanner returns 503 and no object is written.
3. Run full Playwright regression and add/verify the Phase 2 EN/HI end-to-end path: citizen logs in, creates report, sees owner-only tracking; separate synthetic analyst completes TOTP then signs in again (fresh token) and approves; citizen verifies same identifier as `known_scam`; anonymous feed contains no PII. Include screenshot only with local test fixture and no saved traces/screenshots. Axe-check all new pages and keyboard/mobile/failure states. Browser test also checks other users cannot enumerate report/evidence.
4. Check screenshot and QR paths against running Garage and real local ClamAV, including private owner download, moderator recent-MFA evidence, malformed file, size/decompression bomb, scanner unavailable and false positive/malware rejection. Verify re-encoded output metadata is empty. Check operator/registry privilege split and actual Keycloak signed AMR/auth_time on live local token without printing token.
5. Run `make migrations`, full appropriate `make test`, `make lint`, `make typecheck`, `make security`, `make e2e` and suitable Lighthouse on changed pages. Re-run `make dev` smoke after build. Keep security scan output private (never dump secret-bearing compose config or env). Document results and remaining limits. Update `docs/build-status.md`, then mark Phase 2 only if all applicable gates pass.
6. Continue Phase 3 onward. Preserve safety boundaries: first implement lexical/IDN analysis and safe deterministic risk explanations; only run authorized active checks in network-isolated SSRF-resistant workers. Do not fabricate ML/LLM or held-out quality numbers. Then add Phase 4 message analysis with transient inputs, PII redaction, EN/HI rules and no OTP/PIN collection; further phases follow original master prompt. Build only functional navigation/cards; no “coming soon” cards pretending feature is built.
7. Schedule time across the remaining target window and communicate a real status before the 23:22 IST deadline. Full original scope includes 15 phases and production-scale acceptance that cannot be inferred from a local build; handoff this brief promptly if the deadline arrives with phases/metrics still pending.

## 6. Code/Text Snippets (Include only the most recent, definitive versions of core files or schemas)

The snippets below are extracts from the current source of truth, not alternate designs. Follow the linked files for complete imports, validation, model declarations, error handlers and migration details.

**Normalization rules** — [normalization.py](../services/api/railraksha/normalization.py). URL is HTTP(S)-only, credentials/backslashes prohibited, IDN host normalized, fragments and tracking IDs stripped, query stable-sorted; phone parsing defaults to India; Android package case is preserved.

```python
def canonical_url(value: str) -> str:
    parts = urlsplit(value.strip())
    if parts.scheme.lower() not in {"http", "https"} or not parts.hostname:
        raise ValueError("Only complete HTTP or HTTPS links are accepted")
    if parts.username is not None or parts.password is not None or "\\" in value:
        raise ValueError("Links must not contain credentials or backslashes")
    host = domain(parts.hostname)
    port = parts.port
    if port is not None and port not in {80, 443}:
        host += f":{port}"
    elif port == 80 and parts.scheme.lower() == "https":
        host += ":80"
    elif port == 443 and parts.scheme.lower() == "http":
        host += ":443"
    path = quote(parts.path or "/", safe="/%:@-._~!$&'()*+,;=")
    query = urlencode(sorted(
        (key, val) for key, val in parse_qsl(parts.query, keep_blank_values=True)
        if not key.lower().startswith("utm_") and key.lower() not in TRACKING
    ))
    return urlunsplit((parts.scheme.lower(), host, path, query, ""))
```

**Verdict precedence and scope** — [registry.py](../services/api/railraksha/registry.py). These distinctions are user-facing safety logic: exact known scam first, reviewed scam domain for URL/social, exact trusted asset, then trusted URL domain; all other inputs remain unknown.

```python
async def verify(db: AsyncSession, kind: AssetKind, value: str) -> Verification:
    normalized = normalize(kind, value)
    indicator = await db.scalar(select(Indicator).where(
        Indicator.kind == kind,
        Indicator.normalized_value == normalized,
        Indicator.verdict == "known_scam",
    ))
    if indicator:
        return Verification(verdict="known_scam", normalized_value=normalized,
                            explanation_code="reviewed_scam")
    if kind in {"url", "social"}:
        blocked_domain = await db.scalar(select(Indicator).where(
            Indicator.kind == "domain",
            Indicator.normalized_value == urlsplit(normalized).hostname,
            Indicator.verdict == "known_scam",
        ))
        if blocked_domain:
            return Verification(verdict="known_scam", normalized_value=normalized,
                                scope="domain", explanation_code="reviewed_scam")
    asset = await db.scalar(select(OfficialAsset).where(
        OfficialAsset.kind == kind,
        OfficialAsset.normalized_value == normalized,
        OfficialAsset.status == "verified",
    ))
    scope: Literal["identifier", "domain"] = "identifier"
    if asset is None and kind == "url":
        asset = await db.scalar(select(OfficialAsset).where(
            OfficialAsset.kind == "domain",
            OfficialAsset.normalized_value == urlsplit(normalized).hostname,
            OfficialAsset.status == "verified",
        ))
        scope = "domain"
    if asset:
        return Verification(verdict="official", normalized_value=normalized, scope=scope,
                            asset=AssetOutput.model_validate(asset),
                            explanation_code="demo_registry" if asset.demo else "registered_identifier")
    return Verification(verdict="unknown", normalized_value=normalized,
                        explanation_code="not_registered")
```

**Fresh MFA authorization** — [auth.py](../services/api/railraksha/auth.py). Signed access token parsing rejects malformed `amr` and `auth_time`; no header can replace these claims.

```python
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
```

**Evidence encryption and scanner protocol** — [uploads.py](../services/api/railraksha/uploads.py). Scanner timeout/errors are failures, not a “clean” result; encrypted data and wrapped key are authenticated to the random object key.

```python
def encrypt(data: bytes, object_key: str, key: bytes) -> tuple[bytes, bytes]:
    data_key = AESGCM.generate_key(bit_length=256)
    nonce, wrap_nonce = secrets.token_bytes(12), secrets.token_bytes(12)
    aad = object_key.encode()
    return (nonce + AESGCM(data_key).encrypt(nonce, data, aad),
            wrap_nonce + AESGCM(key).encrypt(wrap_nonce, data_key, aad))


async def scan(data: bytes, settings: Settings) -> None:
    writer: asyncio.StreamWriter | None = None
    try:
        async with asyncio.timeout(30):
            reader, writer = await asyncio.open_connection(settings.clamav_host, settings.clamav_port)
            writer.write(b"zINSTREAM\0")
            for position in range(0, len(data), 65536):
                chunk = data[position:position + 65536]
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
```

**Typed app/API boundary** — [shared Zod schemas](../packages/schemas/src/index.ts). JSON BFF writes must validate against these schemas and API Pydantic schemas again; allowed BFF paths/methods and actual streamed body byte caps live in [the catch-all tools route](../apps/web/src/app/api/tools/%5B...path%5D/route.ts).

```ts
export const assetKinds = ['url','domain','phone','email','upi','app','social'] as const;
export const verifyInput = z.object({
  kind: z.enum(assetKinds), value: z.string().trim().min(1).max(2048),
}).strict();
export const reportInput = z.object({
  kind: z.enum([...assetKinds, 'message']),
  value: z.string().trim().min(1).max(2048),
  description: z.string().trim().min(10).max(5000),
  language: z.enum(['en','hi']),
  location: z.string().max(100).nullable().optional(),
  consent_to_store: z.literal(true),
}).strict();
export const moderationInput = z.object({
  action: z.enum(['approve','reject','merge']),
  note: z.string().trim().min(5).max(500),
  merge_into: z.uuid().nullable().optional(),
}).strict().refine(data => (data.action === 'merge') === Boolean(data.merge_into));
export const verificationOutput = z.object({
  verdict: z.enum(['official','unknown','known_scam']),
  normalized_value: z.string(),
  asset: assetOutput.nullable().optional(),
  scope: z.enum(['identifier','domain']),
  explanation_code: z.string(),
});
```

**Current persisted entities:** `official_asset(id, kind, value, normalized_value, label, source_url, certificate_sha256?, verified_by, verified_at, status, demo)`; `indicator(id, kind, normalized_value, verdict, confidence, source_report, updated_at)`; `report(id, owner, kind, normalized_value, description, public_excerpt, language, location?, status, merged_into?, created_at)`; `report_evidence(id, report_id, object_key, sha256, media_type, size, wrapped_key, created_at)`; `moderation_action(id, report_id, actor, action, note, occurred_at)`. See complete [ORM models](../services/api/railraksha/registry_models.py) and [migration](../services/api/migrations/versions/0002_registry.py).

---

**Handoff note:** Start by reading this brief, `docs/build-status.md`, and the master prompt. Continue the already-authorized full build, first close and document Phase 2 gates, and preserve the local-only, privacy, MFA, non-affiliation, and authorized-scan constraints above. Do not assume that all fifteen phases or production acceptance are complete just because the user set a five-hour target.
