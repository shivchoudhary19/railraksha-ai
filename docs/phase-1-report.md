# Phase 1 Completion Report — Foundation, Auth, Design System & Landing Site

**Status: local Phase 1 quality gate passed.** Verified 12 October 2026. The complete Docker stack is running. No later phase has been built.

## What was built

- pnpm/Turborepo monorepo, Next.js 15/React 19 with strict TypeScript, Tailwind/Radix, next-intl and Python 3.12/FastAPI.
- English/Hindi public pages, responsive light/dark design, accessible navigation, dashboard/profile preferences and an empty operator workspace with real role gates.
- Keycloak registration, verified email, password reset, TOTP, resident passkeys, ten roles and synthetic DEMO accounts. Registration verifies email before setting a password; a local theme translates Phase 1 identity forms into Hindi.
- Confidential OIDC authorization-code flow with PKCE, required subject/audience validation, one-use state/nonce, Redis sessions, opaque HttpOnly cookies, exact-origin and CSRF checks. CSP permits logout redirects only to the configured identity-provider origin.
- Structured API errors/logs, request IDs, explicit CORS, Redis sliding-window limits, production admin-only API documentation, profile persistence and append-only audit controls.
- One-command Compose startup for web, API, PostgreSQL, Redis, Keycloak, Garage and Mailpit. Generated secrets are ignored and permission restricted. Garage/Mailpit substitutions were approved by the user.
- Verified threat research, six ADRs, frozen dependencies, source/dependency/image scanners, real migration checks and a pinned-action CI workflow.

## How to run

With Docker Desktop running:

```sh
make dev
```

`make stop` preserves the database/storage volumes. The Makefile locates Docker Desktop's CLI on macOS even when it is absent from the shell PATH.

| Service | Local URL |
|---|---|
| English / Hindi app | http://localhost:3000/en · http://localhost:3000/hi |
| API health / readiness | http://localhost:8000/health · http://localhost:8000/ready |
| Development API documentation | http://localhost:8000/api/docs |
| Keycloak | http://localhost:8081 |
| Local verification/reset inbox | http://localhost:8025 |
| Garage S3 endpoint | http://localhost:3900 |

Accounts: `demo.<role>@example.test` for citizen, student, verified_reporter, analyst, soc_lead, rpf_cyber, asset_owner, partner_dev, admin and super_admin. Read `DEMO_PASSWORD` privately from `.env`. All ten accounts were checked. Privileged seed accounts intentionally stop at their required TOTP enrollment screen; enrollment/re-login was completed with disposable synthetic accounts so the user's seed authenticators remain unset.

Keycloak uses port 8081 because an unrelated Python server occupies IPv6 localhost port 8080 on this Mac. That process and existing volumes were preserved.

## Screens / endpoints added

Public EN/HI: home, about, how-it-works, safety-tips, contact, privacy, terms, responsible-disclosure and login. Protected EN/HI: dashboard, profile/language settings and operator shell. Web routes handle OIDC login/callback, profile changes, logout and `/.well-known/security.txt`.

API: `/health`, `/ready`, `/v1/me`, `/v1/operator`, `/v1/profile` GET/PUT, `/v1/session-events` POST, `/api/docs` and `/api/openapi.json`.

## Database changes (migrations)

`0001_foundation` creates UUID-linked `user_profile` records with constrained EN/HI preferences and `audit_log` records with actor, action, request ID, timestamp and indexes. The application role can read/insert/update profiles and read/insert audits. PostgreSQL permissions and a trigger reject audit updates/deletes.

Passed against real PostgreSQL: fresh baseline, repeated head preserving existing data, application-role audit permissions, rejected audit mutation and rollback/reapply. A separate fresh temporary PostgreSQL container verified the embedded initializer creates all three intended database roles. These checks did not reset the application volume. A previous-phase database upgrade is not applicable to this first baseline.

## Tests

| Suite | Passed | Failed | Coverage / evidence |
|---|---:|---:|---|
| Frontend unit tests | 50 | 0 | 100% lines; 98.24% statements; 95.12% branches; 96% functions |
| Backend unit tests | 43 | 0 | 96.72% coverage |
| Public Playwright | 26 | 0 | EN/HI, axe, CSP/console errors, language switch, keyboard navigation, dark mode, mobile widths, anonymous guards |
| Authenticated Playwright | 7 | 0 | Profile/logout, CSRF, Hindi identity forms, TOTP/operator roles, verified registration, password reset and a real passwordless WebAuthn assertion |
| PostgreSQL / initializer regression | Passed | 0 | Real fresh schema, upgrade rerun, audit permissions, rollback/reapply and isolated fresh-container startup |
| Lint / strict types | Passed | 0 | ESLint, Ruff, TypeScript including E2E sources, mypy |
| Frozen installation / container builds / `make dev` | Passed | 0 | All seven persistent services healthy; migration job completed |
| Lighthouse | 22 pages | 0 | EN/HI landing performance at least 99, accessibility/best practices/SEO 100; all 22 app pages accessibility 100 |
| Production header policy | Passed | 0 | All six security headers and strict CSP verified on an actual production-mode container response |

Frontend coverage measures server libraries, middleware and web API logic; browser checks exercise rendering and interactions. Evidence is saved locally under `.local/checks/` and `.local/lighthouse/`. The account, Hindi login, operator, MFA prompt and reset screens were also visually inspected under `.local/screenshots/`. Screenshots exclude setup keys and entered passwords; test traces, videos, screenshots and automatic failure-page snapshots are disabled for identity privacy.

## Regression checklist

- [x] `make dev` starts every service cleanly; public and authenticated browser journeys have no script/console errors.
- [x] Landing, login, logout, TOTP, passkeys, registration/email verification and password reset work (P1).
- [x] Citizen role denial, authorized operator access, profile persistence, CSRF rejection and Hindi preferences work (P1).
- [x] Independent browser smoke interaction completed for account navigation, profile, role denial, provider logout, TOTP enrollment/re-login, operator workspace, reset email and new-password completion; resulting screens visually reviewed.
- [x] All unit, full E2E, security scans and applicable real migrations pass.
- [x] Lighthouse accessibility is at least 90 on all citizen app pages; EN/HI application strings and Phase 1 identity forms are translated.

The registry, moderation, scans, message/APK analysis, extension, booking, waiting room, LLM/SOC, academy, privacy-rights, mobile and partner checks belong to later phases. They are not applicable and remain unbuilt.

## Security checks

- **pnpm audit:** zero reported vulnerabilities at all severities.
- **pip-audit:** no known vulnerabilities in the locked Python dependencies.
- **Semgrep / Gitleaks:** passed; no detected source findings/secrets under the configured rules.
- **Trivy:** all eight Compose image references passed with zero High/Critical findings, including web, API, migration, PostgreSQL, Redis, Keycloak, Garage and Mailpit.
- **Header-equivalent acceptance:** actual production-mode response supplies nonce CSP, HSTS, nosniff, frame denial, referrer policy and permissions policy. CSP excludes unsafe-inline/unsafe-eval and permits only the configured identity origin for form redirects. Local HTTP intentionally uses development cookie/HSTS settings. This is an equivalent policy check, not an external securityheaders.com grade or deployed TLS certification.

ADR 0006 records the container fixes: PostgreSQL 16.15 with the same gosu helper rebuilt using patched Go, Redis 7.4.11/package updates, Python on Alpine 3.24, removal of unused package managers from the web runtime and the official Keycloak distribution on supported Java 21/Alpine. No vulnerability exclusions were used to make the image gate pass.

## Known limitations

- This is a local development release. Public deployment, external TLS/header grading and legal/ASVS/WCAG certification were not performed. Production requires real HTTPS domains, identity URLs/RP ID, privacy/disclosure contacts, disabled demo facilities as appropriate and operational retention/incident procedures.
- Keycloak's custom local container/theme must be revalidated when dependencies change. Its account console retains provider-managed translations; the application and Phase 1 login/registration/reset/MFA/passkey form text have EN/HI support.
- The optional Next.js ESLint plugin is omitted because its dependency path introduces an unpatched advisory. ESLint, TypeScript, React Hooks and accessibility checks remain enforced (ADR 0005).
- GitHub Actions is configured but not remotely executed; this repository has not been published. All listed gates were executed locally.

None of these limitations blocks the requested local Phase 1 journeys.

## Next phase preview

Phase 2 adds the official registry and the verification journey. It has not been started. Continue only after the user's `NEXT PHASE` command.

✅ Phase 1 complete. All tests and regression checks pass. **Waiting for your command. Type `NEXT PHASE` to continue to Phase 2.**
