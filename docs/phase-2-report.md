# Phase 2 Completion Report — Official Registry, Verification, Scam Reports & Moderation

**Status: local Phase 2 quality gate passed.** Verified 12 October 2026. The full Docker stack is healthy.

## What was built

- **Canonical Normalization Engine**: Safe normalization for URLs, domains, Indian/E.164 phone numbers and emergency/helpline shortcodes, email, UPI VPAs, and Android package identifiers. Fragments and tracking parameters stripped; IDN homoglyphs normalized; control characters and credential-bearing URLs rejected.
- **Official Registry & Verification**: Lookups for `url`, `domain`, `phone`, `email`, `upi`, `app`, and `social`. Strict safety semantics: exact registered match or domain match yields `official`; reviewed indicators yield `known_scam`; unlisted inputs return `unknown` with an explicit notice that unknown carries no safety guarantee. Precedence favors reviewed scam indicators.
- **Citizen Scam Reporting & Tracking**: Consent-gated report submission (`consent_to_store: true`) with optional location and screenshot/QR upload. Generates unique tracking UUIDs. Owner-isolated reporting views (users only view their own reports; unauthorized views return 404). Descriptions remain strictly private.
- **Operator Moderation Queue**: Step-up MFA security requiring signed Keycloak `amr` (`otp`, `webauthn`, `webauthn-passwordless`) and signed `auth_time` freshness $\le$ 600s. Privileged review actions (approve, reject, merge duplicates) with append-only audit tracking. Approvals automatically add known-scam indicators.
- **Encrypted Evidence Vault & Malware Defense**: 5 MiB body cap, streaming byte limiter (never trusting `Content-Length`), image dimension caps (12 MP), metadata/EXIF stripping, re-encoding to clean PNG, and AES-256-GCM envelope encryption with per-object data keys and wrapped master keys in Garage S3. ClamAV streaming scanner integration over length-framed `zINSTREAM` protocol (fails closed on scanner failure or malware).
- **Public Feed & Bilingual Web UI**: `/v1/scams/recent` public feed returning high-level generated category summaries with zero PII. Bilingual English/Hindi routes: `/[locale]/verify`, `/[locale]/reports`, `/[locale]/registry`, `/[locale]/moderation`, and public `/[locale]/scams`. Consistent navy/green design system, WCAG 2.2 AA compliant with zero axe violations.

## Screens & Endpoints Added

- **Public & Protected Web Routes**:
  - `/[locale]/verify` (Identifier & QR screenshot verification)
  - `/[locale]/reports` (Citizen scam report form with tracking list)
  - `/[locale]/registry` (Searchable official digital identity registry)
  - `/[locale]/moderation` (Operator report review & merge workspace)
  - `/[locale]/scams` (Public anonymized reviewed scam summaries)
  - `/api/tools/[...path]` (Secure BFF with schema validation, CSRF checks, and size caps)

- **API Endpoints**:
  - `POST /v1/verify` & `POST /v1/verify/qr`
  - `GET /v1/registry` & `POST /v1/registry` & `POST /v1/registry/{id}/revoke`
  - `POST /v1/reports`, `GET /v1/reports`, `GET /v1/reports/{id}`
  - `POST /v1/reports/{id}/evidence`, `GET /v1/reports/{id}/evidence`, `GET /v1/evidence/{id}`
  - `GET /v1/moderation` & `POST /v1/moderation/{id}`
  - `GET /v1/scams/recent`

## Database Changes (Migrations)

- Migration `0002_registry`:
  - Tables: `official_asset`, `indicator`, `report`, `report_evidence`, `moderation_action`.
  - Trigram and full-text indexes for fast search.
  - Row locking in stable ID order for duplicate merge operations to avoid deadlocks.
  - Append-only restrictions for audit and moderation actions.

## Tests & Verification Evidence

| Suite | Tests / Metrics | Result |
|---|---|---|
| Frontend Typecheck (`tsc`) | All packages (`turbo run typecheck`) | Passed (0 errors) |
| Frontend Lint (`eslint`) | All packages (`turbo run lint`) | Passed (0 warnings) |
| Web Unit Tests (`vitest`) | 54 passed | 100% lines, 97.33% stmts |
| API Pytest (`pytest`) | 89 passed | 89.08% coverage (exceeds 80% bar) |
| Python Lint & Types (`ruff`, `mypy`) | Strict mypy & Ruff check | Passed (0 errors) |
| Public Playwright E2E | 26 passed | Passed (axe, responsive, i18n) |
| Authenticated Playwright E2E | 7 passed | Passed (Keycloak, TOTP, passkeys) |
| Phase 2 Browser Journey E2E | 2 passed (`phase2.spec.ts`) | Passed (report $\to$ TOTP moderation $\to$ verify blocklist $\to$ scams feed) |
| Container Services (`docker compose`) | PostgreSQL, Redis, Keycloak, Mailpit, Garage, ClamAV, Web, API | All healthy & verified |
