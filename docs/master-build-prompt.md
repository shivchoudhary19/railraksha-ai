# 🛡️ RailRaksha AI — Master Build Prompt (Phase-wise)

> **A unified cybersecurity, anti-fraud and AI-threat defense platform for railways, passengers and students.**
> Paste this whole file into your AI coding agent (Cursor / Claude Code / Copilot / Windsurf / Bolt / Lovable, etc.). The agent must build the product **one phase at a time** and **stop after every phase** until you say `NEXT PHASE`.

---

## 0. 🔴 MASTER RULES FOR THE AI AGENT (read before writing any code)

You are a **senior full-stack engineer, security architect, and ML engineer**. You will build **RailRaksha AI** exactly as described below.

### 0.1 Phase-gating protocol (NON-NEGOTIABLE)
1. Build **only the current phase**. Do not start, scaffold, or "prepare" features from future phases.
2. At the end of every phase, output a **Phase Completion Report** (template in §12) and then write exactly:
   > ✅ Phase N complete. All tests and regression checks pass. **Waiting for your command. Type `NEXT PHASE` to continue to Phase N+1.**
3. **STOP.** Do not continue until the user types `NEXT PHASE` (or `NEXT PHASE: <changes>`).
4. If the user types `FIX: <issue>`, fix the issue inside the current phase, re-run all tests, re-issue the report and stop again.
5. If the user types `STATUS`, print the current phase, what is done, and what is pending.

### 0.2 "Always working" rule
- After **every** phase the app must **start with one command** (`make dev` or `docker compose up`) and be **fully usable in the browser** — no broken pages, no dead buttons, no `TODO` placeholders in user-facing UI, no mock data shown as if real (seed/demo data must be labelled `DEMO`).
- Every page added in any earlier phase must still work.

### 0.3 Regression rule (run in EVERY phase)
Before declaring a phase complete you must:
1. Run lint + type-check (`pnpm lint && pnpm typecheck`, `ruff check && mypy`).
2. Run **all** unit tests from **all previous phases + current phase** (`pnpm test`, `pytest`).
3. Run **all** end-to-end Playwright tests from all phases (`pnpm e2e`).
4. Run security checks: `pnpm audit`/`pip-audit`, Semgrep, Gitleaks (no secrets), Trivy on Docker images.
5. Run the database migration from scratch on an empty DB **and** upgrade from the previous phase's DB.
6. Manually smoke-test the Regression Checklist (§11) and tick every item.
7. If anything fails → fix it before reporting. Never report a phase complete with failing tests.

### 0.4 Engineering standards
- TypeScript `strict`, Python type hints everywhere, no `any` without justification.
- Test coverage ≥ 80% for backend services, ≥ 70% for frontend logic.
- Every API: input validation (Zod / Pydantic), auth check, rate limit, structured error, OpenAPI docs.
- Follow **OWASP ASVS Level 2**, **OWASP Top 10 (2021)**, **OWASP API Top 10 (2023)**, **OWASP Top 10 for LLM Apps**.
- Secrets only via environment variables / secret manager. Commit an `.env.example`, never `.env`.
- Accessibility: WCAG 2.2 AA. Mobile-first. Works on low-end Android + slow 3G.
- i18n from day 1: English + Hindi; architecture ready for Tamil, Telugu, Bengali, Marathi, Gujarati, Kannada, Malayalam, Odia, Punjabi.
- Privacy by design, aligned with India's **Digital Personal Data Protection (DPDP) Act, 2023** and **CERT-In** directions (incident reporting, log retention).
- Write a short ADR (Architecture Decision Record) in `/docs/adr/` for every major choice.

### 0.5 Ethics & legal boundary (NON-NEGOTIABLE)
- This is a **defensive** product. Do **not** build exploit code, credential harvesters, DDoS tools, or anything that attacks third-party systems.
- Any active scanning (website audit) is allowed **only on assets the user has proven ownership of** (DNS TXT / file verification) or on the bundled local demo targets.
- For real railway systems (IRCTC, CRIS, Indian Railways, RailMadad, UTS, NTES etc.) the platform **only** does: passive public checks, look-alike/fake site detection, user education, and a **reference re-implementation** ("secure blueprint") that demonstrates how functionality *should* work. It never logs into, scrapes behind auth, or modifies real government systems.
- Responsible disclosure workflow must route findings to the asset owner / CERT-In, never publish them.

---

## 1. 🔍 Research Summary — Railway & Related Security Problems

> ⚠️ Agent note: these findings are a starting point compiled from publicly reported incidents and well-known threat patterns. In Phase 1, create `/docs/research/threat-landscape.md`, and **verify / update each item with sources** before using it in UI copy.

### 1.1 Global railway cyber incidents (patterns to defend against)
| Pattern | Representative public incidents | Lesson |
|---|---|---|
| Ransomware on ticketing / ops IT | SF Muni ticketing ransomware (2016); Trenitalia ticketing ransomware (2022) | Ticketing is a top target; need backups, segmentation, IR plans |
| Supply-chain / vendor compromise | Danish railways halted after attack on a software supplier (2022) | Third-party risk monitoring is essential |
| Wiper / hacktivist attacks on ops | Iranian railway display & systems attack (2021); Belarus railway hacktivist attack (2022) | OT + IT segmentation, anomaly detection |
| Radio / signalling abuse | Polish trains stopped by spoofed radio "radio-stop" signals (2023) | Legacy unauthenticated protocols are risky; monitor OT channels |
| Public Wi-Fi defacement | UK station Wi-Fi landing pages defaced (2024) via third-party provider | Monitor customer-facing content integrity |
| Insider & credential abuse | Recurring across operators | MFA, least privilege, UEBA |

### 1.2 India-specific passenger-facing threats (highest volume, biggest impact)
1. **Fake ticket-booking websites & look-alike domains** (typosquats of IRCTC, fake "Tatkal" sites, fake refund portals).
2. **Fake apps / malicious APKs** spread via WhatsApp/Telegram/SMS that mimic railway apps and steal OTPs, UPI PINs and banking data (publicly warned against by IRCTC).
3. **Fake customer-care numbers** on search results / social media → refund-scam, remote-access app (AnyDesk/TeamViewer-type) scams, UPI "collect request" fraud.
4. **Phishing SMS / WhatsApp / email**: "ticket cancelled, click to get refund", "PNR confirmed, pay ₹5", "KYC update".
5. **Tatkal bot/tout software** — illegal automation that books tickets in seconds, denying fair access to genuine passengers.
6. **Alleged data leaks / breaches** of passenger data (claims of IRCTC/third-party travel-app data appearing on dark-web forums have been reported) → follow-on targeted phishing.
7. **Fake railway job / recruitment scams** (fake RRB/RRC websites, fake appointment letters, "pay for training/medical") — **heavily targets students and job-seekers**.
8. **Fake lost-and-found / RPF / TTE impersonation** calls.
9. **QR-code swapping** at stalls / stations (quishing).
10. **Unsafe public Wi-Fi** at stations (rogue hotspots / evil-twin).

### 1.3 AI-enabled threats (new & growing)
- **AI-written phishing** with perfect grammar in Hindi/regional languages; hyper-personalized using leaked data.
- **Voice-clone / deepfake calls** impersonating officials, family members, or customer care.
- **Deepfake videos** of officials announcing fake schemes / jobs.
- **Malicious LLM tools** marketed for crime (e.g. "WormGPT/FraudGPT"-style) lowering the skill barrier.
- **AI-generated fake websites** produced at scale in minutes.
- **Prompt injection / data leakage** in railway chatbots and AI assistants.
- **AI-assisted bots** that bypass CAPTCHAs for Tatkal.

### 1.4 Students — data security problems
- Fake scholarship / exam / admit-card / result sites; fake internship & job offers.
- Password reuse, no MFA, oversharing on social media, sextortion/ blackmail scams.
- Pirated/cracked software & mod APKs carrying malware/infostealers.
- Unsafe Wi-Fi in hostels/libraries; no backups; lost phones.
- Low awareness of their rights under the DPDP Act.

### 1.5 Infrastructure / operator problems (website & system hygiene)
- Missing/weak security headers, outdated TLS configs, exposed admin paths, mixed content.
- Poor performance & accessibility under peak load (Tatkal hour), confusing error flows that push users to fake sites.
- Lack of a single **"Is this official?"** verification source for links, numbers, apps and UPI IDs.
- Fragmented incident reporting (passenger → helpline → police → CERT).
- Legacy OT protocols in signalling/SCADA without continuous monitoring.

### 1.6 ✅ Chosen problems & solutions (prioritized by impact × feasibility)
| # | Problem | RailRaksha solution | Phase |
|---|---|---|---|
| P1 | No trusted "is this official?" source | **Official Registry + Verify** (URL / phone / app / UPI / email / QR) | 2 |
| P2 | Fake & look-alike websites | **PhishRadar** URL analyzer + domain-monitoring engine | 3 |
| P3 | Phishing SMS/WhatsApp/email (incl. AI-written) | **ScamLens** multilingual message analyzer with AI explanation | 4 |
| P4 | Fake apps / malicious APKs, unsafe devices | **AppGuard** APK analyzer + **Safe Device** checkup | 5 |
| P5 | Users land on fake sites in real time | **RailRaksha Shield** browser extension + PWA share-target | 6 |
| P6 | Weak railway web hygiene & poor UX | **WebAudit** (authorized assets) + **Secure Booking Blueprint** | 7 |
| P7 | Tatkal bots/touts | **FairQueue** anti-bot & fair-access engine | 8 |
| P8 | Deepfakes, AI-driven attacks, chatbot abuse | **AI Threat Defense**: LLM Firewall, deepfake triage, AI-text signals | 9 |
| P9 | No unified operator view, OT blind spots | **RailSOC** dashboard + OT/signalling anomaly simulator | 10 |
| P10 | Students targeted by scams, weak hygiene | **Student Safe Zone**: job/scholarship scam checker, breach check, academy | 11 |
| P11 | Personal data misuse | **Privacy Vault & DPDP toolkit** | 12 |
| P12 | Must scale to crores of users | **Scale & hardening** | 13 |
| P13 | Adoption & ecosystem | **Public API, partner portal, launch** | 14 |

---

## 2. 💡 Product Vision

**RailRaksha AI** = "Kavach for the digital journey." One platform with three faces:

1. **Citizen App (Passengers & Students)** — Verify anything, scan links/messages/apps/QR, report scams, learn cyber safety, check breaches, protect devices. Free, multilingual, works on low-end phones.
2. **Operator Console (Railway IT / CERT / RPF cyber cell)** — Real-time threat intel, fake-domain takedown pipeline, website audits, bot-fairness analytics, SOC alerts, OT anomaly monitoring, incident management.
3. **Developer & Partner API** — Verification and threat-intel API for banks, UPI apps, telecoms, travel apps, colleges.

**North-star metrics:** scams prevented, fake domains detected before first victim, mean time to takedown, % genuine Tatkal bookings, students trained.

**Personas:** Ramesh (first-time smartphone traveler, Hindi), Priya (college student, job-seeker), Anil (railway IT security analyst), Meera (RPF cyber cell officer), Dev (bank fraud-team developer using the API).

---

## 3. 🧰 Tech Stack (chosen for security, scale and AI)

| Layer | Choice | Why |
|---|---|---|
| Monorepo | **Turborepo + pnpm workspaces** | Shared types, fast CI |
| Web frontend | **Next.js 15 (App Router) + React 19 + TypeScript** | SSR/SEO, PWA, edge-ready |
| UI | **Tailwind CSS + shadcn/ui + Radix + lucide-react**, **Recharts / ECharts** for dashboards | Accessible, fast |
| i18n | **next-intl** | Hindi + regional languages |
| Forms/validation | **React Hook Form + Zod** | Shared schemas |
| Data fetching | **TanStack Query** | Caching, retries |
| Core API | **Python 3.12 + FastAPI + Pydantic v2 + SQLAlchemy 2 + Alembic** | Same language as ML, async, OpenAPI |
| Background jobs | **Celery + Redis** (Phase 1–9) → **Kafka/Redpanda** event bus (Phase 10+) | Async scans, streaming |
| Database | **PostgreSQL 16** + **pgvector** (embeddings) + **TimescaleDB** (time-series events) | One reliable DB family |
| Cache / rate-limit | **Redis 7** | Sessions, rate limits, queues |
| Search / logs | **OpenSearch** | Threat-intel search, SIEM-lite |
| Object storage | **MinIO** (S3-compatible) | Screenshots, APKs (sandboxed) |
| Auth / IAM | **Keycloak** (OIDC) — RBAC, MFA (TOTP/WebAuthn passkeys) | Enterprise-grade, self-hosted |
| ML / AI | **scikit-learn, XGBoost, PyTorch, Hugging Face Transformers** (multilingual e.g. MuRIL / IndicBERT / XLM-R), **ONNX Runtime** for serving | Indic language support |
| LLM layer | Provider-agnostic gateway (OpenAI/Anthropic/Gemini) **+ local fallback (Ollama, Llama/Qwen)**; **LangGraph** for agent flows | No vendor lock-in, offline option |
| Browser automation (safe) | **Playwright** in isolated sandbox container | Screenshot suspicious sites safely |
| APK analysis | **Androguard** + **YARA** rules (static only) | No execution of malware |
| Browser extension | **WXT** (Manifest V3) + React | Chrome/Edge/Firefox |
| Mobile | **PWA first** → **Expo (React Native)** in Phase 13 | Reach low-end devices |
| Observability | **OpenTelemetry + Prometheus + Grafana + Loki + Tempo** | Full tracing |
| Security tooling | Semgrep, Gitleaks, Trivy, OWASP ZAP (baseline, own assets), pip-audit, Dependabot | Shift-left |
| Testing | **Vitest, Pytest, Playwright, k6 (load), Schemathesis (API fuzz)** | Regression in every phase |
| Infra | **Docker Compose** (dev) → **Kubernetes + Helm + Argo CD**, **Terraform**; NGINX/Envoy ingress, **Cloudflare/AWS WAF** | Scale |
| CI/CD | **GitHub Actions** | Gates on every PR |

### 3.1 Repository layout
```
railraksha/
├── apps/
│   ├── web/                 # Next.js citizen app + operator console
│   ├── extension/           # WXT browser extension (Phase 6)
│   └── mobile/              # Expo app (Phase 13)
├── services/
│   ├── api/                 # FastAPI core (auth, registry, reports)
│   ├── scanner/             # URL / website analysis workers
│   ├── ml/                  # model training + ONNX serving
│   ├── llm-gateway/         # LLM firewall + provider router (Phase 9)
│   ├── apk-analyzer/        # static APK analysis (Phase 5)
│   └── soc/                 # event ingestion, rules, alerts (Phase 10)
├── packages/
│   ├── ui/                  # shared components
│   ├── schemas/             # shared Zod + generated TS types from OpenAPI
│   └── config/              # eslint, tsconfig, tailwind presets
├── infra/  (docker, k8s, helm, terraform)
├── docs/   (adr, research, api, runbooks)
├── tests/  (e2e, load, security)
├── Makefile
└── docker-compose.yml
```

---

## 4. 🏗️ Architecture Overview
```
[Citizen PWA / Extension / Mobile]   [Operator Console]   [Partner API clients]
              │                             │                     │
              └──────────── WAF + CDN + API Gateway (rate-limit, mTLS for partners)
                                            │
                        FastAPI Core  ←→  Keycloak (OIDC, RBAC, MFA)
                 ┌──────────┼───────────┬──────────────┬──────────────┐
           Registry     Scanner jobs   ML inference   LLM Gateway    SOC / Events
                 │          │               │       (firewall)        │
          PostgreSQL+pgvector  Redis/Celery  ONNX   providers/local   Kafka → OpenSearch/Timescale
                         MinIO (sandboxed artefacts)      Grafana / alerts
```
Trust zones: Public → DMZ (gateway) → App → Data → **Sandbox (isolated, no internal network access)** for opening suspicious URLs/APKs.

---

## 5. 👥 Roles (RBAC)
`citizen`, `student`, `verified_reporter`, `analyst`, `soc_lead`, `rpf_cyber`, `asset_owner`, `partner_dev`, `admin`, `super_admin`. Every API declares the roles allowed. Admin actions require MFA step-up and are written to an immutable audit log.

---

## 6. 🎨 Design System
- Brand: deep navy `#0B1F3A`, rail-signal green `#16A34A` (safe), amber `#F59E0B` (caution), red `#DC2626` (danger). Dark & light mode.
- Every verdict uses **color + icon + text** (never color alone): ✅ Safe / ⚠️ Suspicious / ⛔ Dangerous / ❔ Unknown.
- Plain-language explanations ("Why we think this is fake") at grade-6 reading level, in the user's language.
- Big touch targets, offline-friendly, minimal JS on citizen pages.

---

# 🚆 PHASES

> Each phase lists: **Goal → Features → Backend → Frontend → Data → Security → Tests → Acceptance criteria → STOP**.

---

## PHASE 1 — Foundation, Auth, Design System & Landing Site
**Goal:** A running, secure skeleton that every later phase builds on.

**Features**
- Monorepo, Docker Compose (web, api, postgres, redis, keycloak, minio, mailhog), `make dev`, `make test`, `make e2e`.
- Public landing site: Home, About, "How it works", Safety Tips (static), Contact, Privacy Policy, Terms, Responsible Disclosure page, `security.txt`.
- Auth via Keycloak: sign up / login / logout, email verification, password reset, **MFA (TOTP + passkeys)**, roles from §5.
- User dashboard shell (empty states, no fake data), profile & language settings (EN/HI).
- Operator console shell (role-gated routes).
- `/health`, `/ready`, OpenAPI docs at `/api/docs` (admin-only in prod).
- Research doc `/docs/research/threat-landscape.md` with verified sources for §1.

**Backend:** FastAPI app factory, settings via pydantic-settings, structured JSON logging, request IDs, CORS allow-list, global error handler, rate limiting (Redis, sliding window), audit-log table, Alembic baseline migration.

**Security:** CSP (nonce-based), HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, secure cookies (HttpOnly, SameSite=Lax/Strict), CSRF protection, Argon2id for any local secrets, Gitleaks + Semgrep in CI.

**Tests:** API unit tests (health, auth guard, rate limiter), Playwright: landing loads, language switch, login/logout, role-gated route blocks citizen.

**Acceptance:** `make dev` → app at `http://localhost:3000`, login works with seeded demo users (one per role), Lighthouse ≥ 90 (perf, a11y, best practices, SEO) on landing, securityheaders-equivalent check grade A.

> ⛔ **STOP. Output report. Wait for `NEXT PHASE`.**

---

## PHASE 2 — Official Registry & "Is This Official?" Verify
**Goal:** One trusted source of truth for official railway digital identities.

**Features**
- **Official Registry** (admin/analyst managed): official domains, sub-domains, app package names + signing-cert fingerprints, helpline numbers, official email domains, UPI VPAs/merchant IDs, social handles, QR payloads. Each entry has source, verified_by, verified_at, status.
- **Verify page** (citizen): paste a URL / phone / email / UPI ID / app name / upload QR image → instant verdict: *Official / Not in registry / Known scam*.
- **Scam Report** flow: report a URL/number/message/app with screenshot, location (optional), language; gets a tracking ID; links to national channels (**cybercrime.gov.in**, **helpline 1930**, **Sanchar Saathi – Chakshu** for suspicious calls/SMS).
- **Blocklist** built from reports after analyst review (moderation queue in operator console: approve / reject / merge duplicates).
- Public "Recently reported scams" feed (anonymized, PII auto-redacted).

**Backend:** entities `official_asset`, `indicator` (type, value, normalized_value, verdict, confidence, sources), `report`, `report_evidence`, `moderation_action`. Normalization: URL canonicalization (punycode/IDN, strip tracking params), E.164 phones, lowercase emails/VPAs. QR decoding (pyzbar/opencv). Full-text + trigram search.

**Security:** upload limits + MIME sniffing + image re-encoding (strip EXIF), malware scan of uploads (ClamAV container), PII redaction (phone/email/Aadhaar-like/PAN-like patterns) before public display, abuse rate limits, hCaptcha/Turnstile on anonymous reports.

**Tests:** normalization edge cases (IDN homoglyphs, trailing dots, ports), verdict logic, moderation permissions, e2e: report → moderate → appears in blocklist → Verify shows "Known scam".

**Acceptance:** Verify returns in < 300 ms p95 for registry lookups; seeded DEMO registry with clearly labelled sample entries.

> ⛔ **STOP. Output report. Wait for `NEXT PHASE`.**

---

## PHASE 3 — PhishRadar: Fake & Look-alike Website Detection
**Goal:** Detect fake railway websites — on demand and proactively.

**Features**
- **On-demand URL analysis** (async job with live progress): 
  - Lexical: typosquatting (Levenshtein/Damerau), homoglyph & IDN confusables, brand keywords (`irctc`, `rail`, `tatkal`, `rrb`, `pnr`, `refund`), suspicious TLDs, excessive subdomains, URL shorteners (expand safely).
  - Domain intel: WHOIS/RDAP age, registrar, DNS records, hosting ASN, TLS certificate (issuer, age, SANs).
  - Content (in **sandbox** headless Chromium, no cookies, JS time-boxed): screenshot, HTML forms asking for OTP/UPI PIN/card, brand-logo similarity (perceptual hash + CLIP-embedding vs. official screenshots), redirects chain, obfuscated JS indicators.
  - Reputation: internal blocklist + optional public feeds (Google Safe Browsing / PhishTank / OpenPhish / URLhaus where licensed).
  - **ML model** (XGBoost on lexical+domain features) + rules → risk score 0–100 with **explainable reasons**.
- **Proactive domain monitoring:** ingest Certificate Transparency logs (certstream) + newly-registered-domain feeds, flag look-alikes of registry domains, auto-queue for analysis.
- **Takedown workflow** (operator): evidence pack PDF (screenshots, WHOIS, DNS, timeline) → status tracking (reported to registrar/host/CERT-In) → closed.
- Citizen result page: verdict, screenshot (blurred if NSFW), "Why", "What to do now".

**Security:** sandbox container has egress-only internet, **no access to internal network**, read-only FS, seccomp, resource limits, auto-destroyed per job. SSRF protection (block private IP ranges, DNS-rebinding checks).

**Tests:** labelled dataset (benign vs phishing, incl. DEMO railway look-alikes), model metrics tracked (target precision ≥ 0.95, recall ≥ 0.85 on held-out set), SSRF test suite, e2e scan flow.

**Acceptance:** scan completes < 20 s p95; CT-log monitor flags a seeded look-alike within 1 minute in demo mode.

> ⛔ **STOP. Output report. Wait for `NEXT PHASE`.**

---

## PHASE 4 — ScamLens: SMS / WhatsApp / Email / Call-script Analyzer
**Goal:** Let anyone paste or forward a message and know instantly if it is a scam — in their language.

**Features**
- Input: paste text, upload screenshot (OCR via Tesseract with Hindi + Indic packs), forward `.eml`, or share-to-app (PWA Web Share Target).
- Detection: multilingual transformer classifier (fine-tuned MuRIL/IndicBERT/XLM-R) for scam categories — refund scam, fake booking, KYC, job/recruitment, lottery, sextortion, OTP-sharing, remote-access app, UPI collect request; extracted entities (URLs → PhishRadar, numbers/VPAs → Registry) combined into one verdict.
- **AI-generated text signals** (stylometry + perplexity heuristics) shown as a *hint*, never as sole evidence.
- **AI Explainer** (LLM via gateway with strict system prompt): plain-language explanation, red flags highlighted inline, safe next steps, in the user's language. Hard rule: never asks for or stores OTP/PIN.
- Email header analysis: SPF/DKIM/DMARC results, display-name spoofing, look-alike sender domains.
- "I already clicked / paid" emergency flow: step-by-step (call 1930, block card/UPI via bank, report on cybercrime.gov.in, change passwords) with printable checklist.

**Security:** messages are processed transiently by default; stored only if user opts to report; PII redaction before LLM calls; LLM outputs validated against schema.

**Tests:** multilingual test set (EN, HI, Hinglish, + 2 regional), OCR fixtures, explainer prompt-injection tests (message containing "ignore previous instructions"), e2e paste → verdict → report.

**Acceptance:** text verdict < 2 s p95 (without LLM), explanation < 6 s; macro-F1 ≥ 0.90 on the test set.

> ⛔ **STOP. Output report. Wait for `NEXT PHASE`.**

---

## PHASE 5 — AppGuard (Fake Apps & APKs) + Safe Device Checkup
**Goal:** Stop fake railway apps and help users keep devices & software safe.

**Features**
- **APK static analysis** (never executed): Androguard → package name, signing certificate vs. Registry, dangerous permissions (SMS read, accessibility, overlay, device admin), suspicious APIs, embedded URLs/IPs, YARA rule matches for known banking-trojan / SMS-stealer families, obfuscation score → verdict + explanation.
- **App name / Play Store link check**: compare developer name, package and cert with official entries.
- **Safe Device Checkup** (guided, client-side, no invasive access): OS update status prompts, screen-lock, Play Protect, unknown-sources setting, risky permission review (accessibility/SMS), remote-access apps installed warning, backups, Find-My-Device — produces a **Device Safety Score** and fix-it steps with screenshots for Android/iOS/Windows/macOS.
- **Safe Software guide**: why cracked software/mod-APKs are dangerous, free legit alternatives (curated list), how to verify downloads (hashes, official stores).
- Public Wi-Fi safety mini-check (captive-portal URL check, HTTPS-only tips, evil-twin awareness).

**Security:** APK uploads stored encrypted in an isolated MinIO bucket, analyzed in sandbox, auto-deleted after 7 days, max size 150 MB, password-zip support disabled.

**Tests:** sample benign APKs + **harmless test APKs with suspicious manifests** (do not ship real malware), YARA unit tests, e2e upload → verdict.

**Acceptance:** analysis < 60 s for 50 MB APK; Device Checkup works offline as PWA.

> ⛔ **STOP. Output report. Wait for `NEXT PHASE`.**

---

## PHASE 6 — RailRaksha Shield: Browser Extension & Real-time Protection
**Goal:** Protect users at the moment they visit a fake site.

**Features**
- WXT (MV3) extension for Chrome/Edge/Firefox.
- Real-time check of navigations against a **local bloom filter / hashed prefix list** of bad domains (privacy-preserving, like Safe Browsing: only hash prefixes leave the browser) + on-demand server check.
- Full-page **warning interstitial** for dangerous sites, "Official ✅" badge on registry domains.
- Detects password / OTP / UPI-PIN fields on non-official look-alike pages → warning.
- Right-click → "Check this link with RailRaksha"; one-click report with auto-screenshot (user consent).
- Settings: language, protection level, privacy dashboard (what is sent, nothing else).
- PWA share-target integration so mobile users can share any link to the app.

**Backend:** list-distribution API with signed, versioned delta updates (Ed25519 signatures), CDN cacheable.

**Security:** minimal permissions, no remote code, CSP in extension, signed list verification, no browsing history ever stored server-side.

**Tests:** Playwright extension tests (load unpacked), bloom filter false-positive rate < 0.1%, signature tamper test.

**Acceptance:** lookup overhead < 10 ms per navigation; extension packaged as `.zip` for stores.

> ⛔ **STOP. Output report. Wait for `NEXT PHASE`.**

---

## PHASE 7 — WebAudit + Secure Railway Booking Blueprint
**Goal:** Help railway web assets be secure, fast and usable — and show how core railway functionality *should* work.

**Part A — WebAudit (authorized assets only)**
- Ownership verification (DNS TXT / `/.well-known/railraksha-verify.txt`).
- Passive + safe checks: TLS config & cert expiry, security headers, cookie flags, mixed content, exposed files (`.git`, `.env`, backups) via safe HEAD requests, outdated JS libraries (Retire.js-style), CSP evaluation, subdomain inventory (CT logs), DNS hygiene (SPF/DKIM/DMARC/CAA/DNSSEC), OWASP ZAP **baseline** (passive) scan, Lighthouse performance & accessibility.
- Score per category, prioritized fix list with copy-paste config snippets (NGINX/Apache/Cloudflare), scheduled re-scans, trend chart, PDF report, responsible-disclosure routing.
- Public passive "hygiene snapshot" for public railway domains limited to non-intrusive checks (headers/TLS/DNS) — no active probing.

**Part B — Secure Booking Blueprint (reference implementation, DEMO data)**
A complete, working demo of key railway journeys built the secure way:
- Train search (DEMO timetable dataset), seat availability, PNR status, booking with passenger details, **mock payment** (no real money; sandbox gateway), e-ticket PDF with **signed QR** (verifiable offline), cancellation & refund with transparent status, grievance (RailMadad-style) ticket flow.
- Built-in protections: passkeys/MFA, step-up auth for refunds, idempotent payments, anti-tampering on fares, server-side price authority, CSRF, strict CSP, PII encryption, detailed audit trail, graceful peak-load UX (queue page instead of errors).
- Accessibility & performance: works on 2G-like throttle, screen-reader friendly, Hindi UI.
- "Ticket Verifier": scan e-ticket QR → signature valid/invalid (detects forged tickets).

**Tests:** WebAudit against bundled local vulnerable-by-design demo site (e.g., OWASP Juice Shop container) — never against third parties; booking e2e full journey; signature forgery tests; k6 load test 1,000 VUs on search.

**Acceptance:** WebAudit report generated for the demo target; booking journey passes e2e; search p95 < 400 ms at 1,000 VUs locally.

> ⛔ **STOP. Output report. Wait for `NEXT PHASE`.**

---

## PHASE 8 — FairQueue: Anti-Bot & Tatkal Fairness Engine
**Goal:** Make high-demand booking windows fair for humans.

**Features**
- **Virtual waiting room** with randomized fair-entry at window open (lottery within first N seconds instead of fastest-bot-wins).
- **Bot detection** risk score from privacy-respecting signals: request timing entropy, headless/automation fingerprints, impossible form-fill speed, IP/ASN reputation (datacenter/proxy), session velocity, account-graph analysis (many accounts → same device/payment/phone), known tout-software signatures.
- Adaptive friction: invisible proof-of-work → passkey re-auth → CAPTCHA only for high-risk (not for everyone).
- Per-account / per-device / per-payment-instrument quotas.
- **Operator analytics:** bot vs human share per window, blocked attempts, suspicious account clusters (graph view), exportable evidence for RPF.
- Simulator: built-in bot traffic generator (against the local Blueprint only) to demonstrate before/after fairness.

**Security & privacy:** no invasive fingerprinting; signals hashed; documented in privacy notice; false-positive appeal flow.

**Tests:** simulation — ≥ 95% bot detection with ≤ 1% human false positives on synthetic traffic; waiting-room load test 10k concurrent (k6).

**Acceptance:** demo shows bots no longer capture majority of seats in simulated Tatkal window.

> ⛔ **STOP. Output report. Wait for `NEXT PHASE`.**

---

## PHASE 9 — AI Threat Defense (LLM Firewall, Deepfakes, AI-powered Attacks)
**Goal:** Defend against attacks that use AI, and make railway AI systems safe.

**Features**
- **LLM Gateway & Firewall** (service `llm-gateway`): all AI calls go through it. Prompt-injection & jailbreak detection (classifier + rules + canary tokens), PII/secret redaction in/out, output policy checks, tool-call allow-listing, per-tenant rate & cost limits, full audit. Aligned with OWASP LLM Top 10 & NIST AI RMF.
- **Safe Railway Assistant (chatbot)**: RAG over official FAQs/policies (pgvector), cites sources, refuses to collect OTP/PIN, hands off to human; red-team test suite built in.
- **Deepfake & voice-clone triage**: upload audio/video/image → model-based likelihood + metadata checks (C2PA/content credentials if present, EXIF, re-encoding traces) → result presented as **"risk indicators, not proof"** with verification advice (call back on official number, family code word).
- **AI-phishing campaign detection**: cluster incoming reports by embeddings to spot mass AI-generated campaigns early; alert analysts.
- **Threat Intel on malicious AI tools**: curated knowledge base (what "crime-LLMs" do, indicators, defenses) — educational, no operational misuse content.
- **AI Red-Team Lab (operator)**: run the prompt-injection suite against your own chatbot endpoints (authorized only) and get a score.

**Tests:** injection test corpus (≥ 300 cases, incl. Hindi/Hinglish), redaction tests, deepfake model eval on public benchmark subset, RAG answer-faithfulness tests.

**Acceptance:** firewall blocks ≥ 95% of the test-injection corpus with < 3% false blocks on benign prompts.

> ⛔ **STOP. Output report. Wait for `NEXT PHASE`.**

---

## PHASE 10 — RailSOC: Security Operations Center + OT/Signalling Monitoring
**Goal:** A single operator console to see, triage and respond.

**Features**
- Event bus migration to **Kafka/Redpanda**; ingestion of all platform events + external logs (syslog, CEF, JSON over HTTPS, Beats-compatible).
- Detection rules engine (**Sigma** rule format) + ML anomaly detection (UEBA: unusual logins, data-exfil volume, privilege changes).
- **MITRE ATT&CK (Enterprise + ICS)** mapping on every alert.
- Alert → case → incident workflow, playbooks (SOAR-lite): auto-enrich IOC, block indicator, notify, create takedown, generate **CERT-In incident report draft** (within required reporting window), evidence chain-of-custody.
- **OT / Signalling Simulator & Monitor**: Dockerized simulated railway network (interlocking/SCADA nodes speaking Modbus/TCP & a simulated train-radio channel) with a **passive** monitor that baselines normal traffic and flags anomalies (unexpected write commands, spoofed emergency-stop messages, new devices). Demo scenarios replay attacks like the publicly reported radio-stop abuse — **in simulation only**.
- Dashboards: live threat map (India), top scam types, fake domains over time, takedown MTTR, bot share, device scores.
- On-call notifications: email, SMS (sandbox), Slack/Teams webhook.

**Tests:** rule unit tests with sample logs, replayed attack scenarios produce expected alerts, Kafka consumer lag under load.

**Acceptance:** ingest 5k events/sec locally, alert latency < 5 s, CERT-In draft generated for demo incident.

> ⛔ **STOP. Output report. Wait for `NEXT PHASE`.**

---

## PHASE 11 — Student Safe Zone
**Goal:** Protect students' data, money and careers.

**Features**
- **Job / Recruitment Scam Checker**: paste job offer / appointment letter / website / email → checks against official recruitment domains in Registry (RRB/RRC/other govt), red-flag analysis ("pay fee for joining", personal Gmail, urgency), letter OCR + format anomalies.
- **Scholarship / Exam / Admit-card site checker** (reuses PhishRadar with education-brand lists).
- **Breach Check** using k-anonymity (only first 5 chars of SHA-1 sent, HIBP-compatible model) for passwords; email breach lookup with consent.
- **Password & MFA coach**, passphrase generator (client-side), password-manager setup guides.
- **Cyber Academy**: bite-size lessons (5 min), quizzes, phishing-simulation games (safe, in-app only), badges, certificates (PDF with verifiable QR), leaderboard per college; content in EN/HI.
- **College admin portal**: institutions onboard, run awareness campaigns, see aggregated (anonymized) progress.
- **Help & safety**: sextortion/cyberbullying guidance, how to report (1930, cybercrime.gov.in), mental-health helpline links.

**Privacy:** minors-aware (age-gate, verifiable parental consent where required under DPDP), minimal data, no ad trackers.

**Tests:** k-anonymity check never sends full hash, quiz scoring, certificate verification, e2e student journey.

**Acceptance:** student completes lesson → quiz → certificate → verifies certificate publicly.

> ⛔ **STOP. Output report. Wait for `NEXT PHASE`.**

---

## PHASE 12 — Privacy Vault & DPDP Compliance Toolkit
**Goal:** Make data protection a first-class feature for users and operators.

**Features**
- **PII Vault**: field-level encryption (envelope encryption, KMS/Vault-managed keys, key rotation), tokenization of phone/email/ID numbers, data-classification tags on every column.
- **Consent manager**: granular, purpose-bound consent, withdrawal, consent receipts.
- **Data principal rights portal**: access, correction, erasure, grievance — with SLA tracking.
- Retention policies & auto-purge jobs; legal-hold support; immutable audit logs (hash-chained).
- **Breach response module**: impact assessment, notification templates (Data Protection Board / users / CERT-In).
- **Operator Privacy Scanner**: scans own databases/buckets for unencrypted PII (regex + ML), reports exposure.
- Privacy dashboard for each user: what we store, why, until when; one-click export/delete.

**Tests:** encryption round-trip, key rotation without downtime, erasure verified across DB/search/object store/backups manifest, audit-chain tamper detection.

**Acceptance:** full DPDP rights flow works e2e; zero plaintext PII columns in schema scan.

> ⛔ **STOP. Output report. Wait for `NEXT PHASE`.**

---

## PHASE 13 — Scale, Resilience, Mobile App & Hardening
**Goal:** Production-grade for crores of users.

**Features**
- Kubernetes (Helm charts), Argo CD GitOps, HPA autoscaling, multi-AZ Postgres (Patroni / managed), read replicas, PgBouncer, Redis cluster, Kafka cluster, CDN for static & signed lists.
- Terraform for cloud infra (India region for data residency), WAF + DDoS protection, mTLS service mesh (Linkerd/Istio), zero-trust network policies, secrets via Vault/KMS.
- Observability: SLOs (99.9% availability for Verify API), error budgets, dashboards & alerts.
- Backups + point-in-time restore + DR drill (RPO ≤ 15 min, RTO ≤ 1 h), chaos tests.
- **Expo mobile app** (Android first, iOS): Verify, ScamLens (share-to-app), QR scan, Device Checkup, reports, Academy; offline mode; small APK size; Play Integrity checks.
- Performance: load test 50k RPS on Verify (cached), cost dashboard.
- External-style **security review**: full ZAP/Burp-style test of own stack, threat model (STRIDE) refresh, fix all High/Critical.

**Acceptance:** blue-green deploy with zero downtime; DR drill documented; mobile app builds and passes e2e (Detox/Maestro).

> ⛔ **STOP. Output report. Wait for `NEXT PHASE`.**

---

## PHASE 14 — Public API, Partner Ecosystem, Docs & Launch
**Goal:** Turn the platform into an ecosystem and launch.

**Features**
- **Partner API** (v1): `/verify`, `/url/scan`, `/message/analyze`, `/indicator/lookup`, `/report`, webhooks for new threats; API keys + OAuth client-credentials, mTLS option, usage plans, quotas, billing-ready metering.
- Developer portal: interactive docs, SDKs (TypeScript, Python, Java/Kotlin), sandbox keys, examples for banks/UPI apps/telecom SMS filtering.
- STIX/TAXII 2.1 threat-intel feed export for CERTs and partners.
- Admin: tenant management, white-label for colleges/railway zones.
- Docs: user guides (EN/HI), operator runbooks, API reference, architecture, threat model, privacy notice, accessibility statement.
- Launch kit: marketing site polish, SEO, analytics (privacy-friendly, e.g. Plausible/Umami self-hosted), feedback widget, status page, pilot plan (one railway zone + 5 colleges), KPI dashboard for the north-star metrics.

**Acceptance:** external partner can sign up → get sandbox key → call `/verify` from SDK in < 10 minutes following docs.

> ⛔ **STOP. Output report. Wait for `NEXT PHASE`.**

---

## PHASE 15 (Optional) — Continuous Improvement & Advanced R&D
- Federated learning for on-device scam detection, privacy-preserving analytics (differential privacy).
- Voice IVR in regional languages for feature-phone users ("call to verify a number").
- Telecom/SMS-header integration, UPI-app integration pilots.
- Graph-based fraud-ring detection across reports.
- Bug bounty programme; quarterly red-team exercises; model drift monitoring & retraining pipelines.

> ⛔ **STOP. Output report. Wait for command.**

---

## 11. ✅ Cumulative Regression Checklist (tick ALL in every phase)
- [ ] `make dev` starts everything cleanly; no console errors in browser.
- [ ] Landing, login, logout, MFA, password reset work (P1).
- [ ] Role-gating blocks unauthorized access (P1).
- [ ] Verify returns correct verdicts for registry / unknown / scam items (P2+).
- [ ] Report → moderation → blocklist flow works (P2+).
- [ ] URL scan completes with screenshot & explanation; SSRF tests pass (P3+).
- [ ] Message analysis works for EN + HI + screenshot OCR (P4+).
- [ ] APK analysis & Device Checkup work (P5+).
- [ ] Extension warns on demo bad domain, shows Official badge on registry domain (P6+).
- [ ] WebAudit on demo target + full Blueprint booking journey + ticket verification (P7+).
- [ ] Waiting room & bot simulation work (P8+).
- [ ] LLM firewall blocks injection corpus; assistant cites sources (P9+).
- [ ] SOC ingests events, raises alerts, OT simulator anomalies detected (P10+).
- [ ] Student lesson → quiz → certificate → verification (P11+).
- [ ] DPDP rights flows (export/delete) work end-to-end (P12+).
- [ ] Helm deploy + mobile app smoke test (P13+).
- [ ] Partner sandbox key → SDK call succeeds (P14+).
- [ ] All unit, e2e, security scans, migrations (fresh + upgrade) pass.
- [ ] Lighthouse a11y ≥ 90 on all citizen pages; Hindi translations complete for new strings.

---

## 12. 📋 Phase Completion Report Template (agent must output this)
```md
# Phase N Completion Report — <Phase name>
## What was built
- …
## How to run
- commands, URLs, demo accounts
## Screens / endpoints added
- …
## Database changes (migrations)
- …
## Tests
| Suite | Passed | Failed | Coverage |
## Regression checklist
- [x] … (all items from §11 up to this phase)
## Security checks
- Semgrep / Gitleaks / Trivy / audit results
## Known limitations (none may block usability)
- …
## Next phase preview (1–3 lines, do NOT build it)
- …

✅ Phase N complete. All tests and regression checks pass. Waiting for your command. Type `NEXT PHASE` to continue to Phase N+1.
```

---

## 13. 🚀 Start Command
**Agent: begin now with PHASE 1 only.** First, briefly restate your understanding of the product and the Phase 1 scope (max 10 bullets), list any assumptions, then build Phase 1 completely, run the full regression, output the Phase Completion Report, and **STOP and wait for `NEXT PHASE`.**
