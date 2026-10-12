# Phase 5 Completion Report — AppGuard: Fake Apps, Static APK Analysis & Device Security Checkup

**Status: local Phase 5 quality gate passed.** Verified 12 October 2026. The full Docker Compose stack is running, database migration `0005_appguard` is applied, and all tests pass with 100% green status.

## What was built

- **Static APK Analysis Engine (`appguard.py`)**:
  - **Zero Execution Architecture**: APKs are never executed. Static inspection extracts `AndroidManifest.xml` string tables, DEX bytecode indicators, and ZIP archive directory structures in-memory.
  - **Archive Security & Limits**: Defends against ZIP bombs with max entry bounds (`MAX_ZIP_ENTRIES = 50000`) and payload limits (`MAX_APK_SIZE = 150 MB`).
  - **Dangerous Permissions Classifier**:
    - `READ_SMS`, `RECEIVE_SMS`, `SEND_SMS`: Flags SMS interceptors and OTP stealers (`CRITICAL` / `HIGH`).
    - `BIND_ACCESSIBILITY_SERVICE`: Flags screen scrapers, keyloggers, and fund transfer auto-approvers (`CRITICAL`).
    - `SYSTEM_ALERT_WINDOW`: Flags deceptive overlay windows drawn over legitimate banking/railway apps (`HIGH`).
    - `BIND_DEVICE_ADMIN`: Flags anti-uninstall mechanisms (`HIGH`).
    - `RECORD_AUDIO`, `READ_CONTACTS`: Flags eavesdropping and contact harvesting (`MEDIUM`).
  - **Tatkal Bot & Automation Detection**: Inspects bytecode strings for illicit Tatkal auto-fillers and auto-clickers in violation of Indian Railway Acts.
  - **Official Package Verification**: Cross-references package names with official CRIS registries (`cris.org.in.prs.ima`, `com.cris.uts`, `cris.org.in.ntes`, `com.railmadad`).

- **App Package & Google Play Store Link Checker**:
  - Resolves package identifiers from direct package names (`cris.org.in.prs.ima`) or full Play Store URLs (`https://play.google.com/store/apps/details?id=...`).
  - Compares against official assets and known scam indicators in the RailRaksha database.

- **Safe Device Checkup (7-Point Self-Assessment)**:
  - Guided, client-side digital hygiene assessment for Android, iOS, Windows, and macOS.
  - Assesses: Screen Lock, Unknown Sources / Sideloading, Google Play Protect, OS update status, dangerous permissions review, remote access tools presence (AnyDesk/TeamViewer), and Find My Device backups.
  - Produces a **Device Safety Hygiene Score** (0–100%) and generates prioritized fix-it remediation instructions in English and Hindi.

- **Curated Official Railway Software & Station Wi-Fi Guide**:
  - Directory of verified official Indian Railways applications with package IDs and direct store links.
  - Station Wi-Fi (RailWire) public safety guide covering captive portal verification, "Evil-Twin" rogue hotspot defense, and encryption best practices.

- **Accessible, Bilingual Web Interface (`/[locale]/appguard`)**:
  - Tabs for **App & APK Scanner**, **Safe Device Checkup**, and **Official Apps & Station Wi-Fi**.
  - Strict Content Security Policy compliant (0 inline styles).
  - Rich verdict cards (`.verdict-official`, `.verdict-known_scam`, `.verdict-unknown`), calculated risk scores, dangerous permissions breakdown, and localized safe next steps.
  - Zero WCAG 2.2 AA axe violations in both English and Hindi.

## Screens & Endpoints Added

- **Web Routes**:
  - `/[locale]/appguard` (App scanner, Device checkup, Official guide)
  - Navigation links added to citizen Dashboard tool list

- **API Endpoints**:
  - `POST /v1/appguard/check-package` (Package name / Play Store URL verification)
  - `POST /v1/appguard/scan-apk` (Multipart APK static inspection)
  - `GET /v1/appguard/official-apps` (List verified railway apps)
  - `POST /v1/appguard/device-checkup` (7-point hygiene evaluation)

## Database Changes (Migrations)

- Migration `0005_appguard`:
  - Table `app_scan` (`id`, `app_name`, `package_name`, `version_name`, `file_sha256`, `file_size_bytes`, `cert_fingerprint_sha256`, `risk_score`, `verdict`, `dangerous_permissions`, `suspicious_indicators`, `registry_match`, `explanation_en`, `explanation_hi`, `scanned_by`, `created_at`).
  - Indexes on `package_name`, `created_at`, `file_sha256`. PostgreSQL permissions granted to application role `railraksha`.

## Tests & Verification Evidence

| Suite | Tests / Metrics | Result |
|---|---|---|
| Frontend Typecheck (`tsc`) | `turbo run typecheck` across monorepo | Passed (0 errors) |
| Frontend Lint (`eslint`) | `turbo run lint` across monorepo | Passed (0 warnings) |
| Web Unit Tests (`vitest`) | 54 passed | 100% lines, 97.33% stmts |
| API Pytest (`pytest`) | 111 passed | 82.65% coverage (exceeds 80% bar) |
| Python Lint & Types (`ruff`, `mypy`) | Strict mypy & Ruff check across 24 files | Passed (0 errors) |
| Playwright Full Regression | 43 passed (`public.spec.ts`, `auth.spec.ts`, `phase2.spec.ts`, `phase3.spec.ts`, `phase4.spec.ts`, `phase5.spec.ts`) | Passed (100% green, 0 console errors, 0 axe violations) |
