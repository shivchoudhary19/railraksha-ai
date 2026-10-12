# RailRaksha AI — Phase 1

An independent local foundation for railway passengers, students and security operators. English/Hindi public guidance, Keycloak authentication, profile preferences and role-gated empty workspaces. **The local Phase 1 quality gate passed; see [the completion report](docs/phase-1-report.md).**

## Start the full stack

Install and start Docker Desktop (allocate at least 6 GB of memory), then run:

```sh
make dev
```

The bootstrap creates an ignored, permission-restricted `.env` with random development secrets. Existing secrets are preserved. First startup builds images, imports the local realm and applies the baseline migration.

| Service | Local URL |
|---|---|
| Citizen app | http://localhost:3000/en |
| Hindi app | http://localhost:3000/hi |
| API health / readiness | http://localhost:8000/health · http://localhost:8000/ready |
| Development API documentation | http://localhost:8000/api/docs |
| Keycloak | http://localhost:8081 |
| DEMO inbox (verification/reset mail) | http://localhost:8025 |
| Garage S3 endpoint | http://localhost:3900 |

All published ports bind to loopback. `make stop` stops services and preserves database/storage volumes. Do not run `docker compose down -v` on data you need to keep.

## DEMO users

Each role has one synthetic account, `demo.<role>@example.test` (username `demo.<role>`): `citizen`, `student`, `verified_reporter`, `analyst`, `soc_lead`, `rpf_cyber`, `asset_owner`, `partner_dev`, `admin`, `super_admin`.

Read `DEMO_PASSWORD` privately from your local `.env`; it is never committed or displayed by startup. Privileged demo users enrol an authenticator at first login. New registrations receive citizen permissions only. Email verification and password-reset messages appear in Mailpit, never in external mailboxes. The account-security link opens Keycloak's account console for TOTP, passkeys and session management. Passkeys require a supported browser/authenticator; localhost is configured as the development relying party.

Keycloak administration uses `KEYCLOAK_ADMIN` / `KEYCLOAK_ADMIN_PASSWORD` in `.env`. Realm imports occur only when creating the realm; later JSON edits do not silently rewrite existing users.

## Development and checks

For host-side checks, use Node.js 22.12+ (24 recommended), pnpm 11.25 and Python 3.12:

```sh
pnpm install --frozen-lockfile
python3.12 -m venv .venv
.venv/bin/pip install -c services/api/requirements.lock -e 'services/api[dev]'
make lint
make typecheck
make test
make dev
pnpm exec playwright install chromium
make e2e
make migrations
make tools PYTHON=.venv/bin/python
make security
pnpm lighthouse
```

`make web` runs Next.js on the host against the Compose identity/database services. In Codex desktop it can locate the bundled Node/pnpm runtime automatically. Stop the Compose web container first to free port 3000. `python3 scripts/run-web.py start` uses an existing production build for public-page checks.

`pnpm lighthouse` includes authenticated dashboard/profile accessibility checks; `pnpm lighthouse:public` checks the public preview while the identity stack is unavailable.

Security scans write local reports to `.local/checks/`; Lighthouse writes `.local/lighthouse/`. Missing tools, failed dependency databases and missing Docker fail the security gate. Scanner binaries are downloaded from their official release repositories and verified against published SHA-256 checksums. Tooling remains project-local.

The migration check creates and removes only a randomly named `railraksha_test_*` database. It tests an empty baseline, rerunning the head with existing data, audit immutability and rollback/reapply. There is no preceding phase schema to upgrade in Phase 1.

## Current surfaces

Public: home, about, how-it-works, safety-tips, contact, privacy, terms, responsible-disclosure, login in both languages. Account: dashboard, profile, operator shell. API: `/health`, `/ready`, `/v1/me`, `/v1/operator`, `/v1/profile` GET/PUT, `/v1/session-events` POST, `/api/docs`, `/api/openapi.json`. All application API endpoints validate signed identity and rate limits; health probes are public.

`/.well-known/security.txt` publishes the configured `SECURITY_CONTACT`. Until a real mailbox is configured it explicitly identifies this installation as local/private instead of inventing an operational reporting address.

## Security and phase boundaries

Access tokens stay on the server; the browser receives an opaque HttpOnly cookie. Origin/CSRF checks protect mutations. Nonce CSP, frame denial, explicit CORS, rate limiting, request IDs, input validation, owner/application database separation and append-only audit permissions are implemented. HSTS and Secure cookies apply to HTTPS production configurations; local HTTP uses development settings.

Docker Compose, Keycloak `start-dev`, Mailpit and synthetic credentials are development facilities. A live deployment requires real HTTPS domains/certificates, `APP_ENV=production`, Secure cookies, updated Keycloak URLs/RP ID, real privacy/disclosure contacts, disabled demo registration/accounts as appropriate, retention/incident procedures and independent security review. No ASVS/DPDP/WCAG certification is claimed.

Garage and Mailpit replace MinIO/MailHog with the user's approval: [ADR 0003](docs/adr/0003-local-storage-and-email.md). [Research](docs/research/threat-landscape.md) distinguishes evidence from roadmap hypotheses. The [master prompt](docs/master-build-prompt.md) governs later phases. Do not build Phase 2 until the user types `NEXT PHASE` and the Phase 1 gate passes.
