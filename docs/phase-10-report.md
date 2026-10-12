# Phase 10 Completion Report: RailSOC — Security Operations Center & OT/Signalling Monitoring

**Execution Date:** 12 October 2026  
**Status:** Complete & Fully Verified  
**Methodologies Enforced:** `/ponytail` (YAGNI, lean linear pipeline, minimal abstractions), `/karpathy` (First-principles verification, inspectable Sigma ICS rules, deterministic failsafe logic), `/ui-pro-max` (WCAG 2.2 AA compliant, design tokens, strict CSP without inline styles, seamless English/Hindi parity).

---

## 1. Executive Summary

Phase 10 delivers **RailSOC**, the dedicated Security Operations Center and Operational Technology (OT) signalling defense module safeguarding Indian Railways critical national infrastructure:
1. **Sigma-ICS Detection Rules Registry (`evaluate_event_against_rules`)**:
   - `SIGMA-RAIL-001`: Spoofed radio emergency stop injection on Kavach/Train-Radio UHF channel (MITRE `T0885` - Inhibit Response Function).
   - `SIGMA-RAIL-002`: Illegal Modbus PLC coil write on Electronic Interlocking (EI) point machines during locked route (MITRE `T0855` - Impair Process Control).
   - `SIGMA-RAIL-003`: Unauthorized privilege escalation on passenger booking core (MITRE `T1078` - Valid Accounts / Privilege Escalation).
   - `SIGMA-RAIL-004`: Bulk data exfiltration anomaly exceeding 1,000 PNR records from core store (MITRE `T1048` - Exfiltration Over Alternative Protocol).
   - `SIGMA-RAIL-005`: Rogue unauthenticated device tapped on isolated signalling VLAN 100/200 (MITRE `T0846` - Remote System Discovery / Lateral Movement).
2. **Automated CERT-In 6-Hour Incident Dossier Generator (`build_cert_in_report_draft`)**:
   - Compiles formal Annexure-I reporting dossiers complying with IT Act 2000 Section 70B & CERT-In Directions 2022 (Rule 12).
   - Computes SHA-256 cryptographic chain-of-custody hash over incident indicators, telemetry, and evidence.
   - Enforces automated SOAR containment playbooks (port quarantine, firewall block, RPF Cyber Cell dispatch).
3. **OT Signalling Equipment Network Monitor**:
   - Live telemetry surveillance of critical railway nodes: `NDLS-EI-01` (Electronic Interlocking EI, Northern Railway), `KAVACH-SEC-RADIO-04` (Kavach UHF Radio, Secunderabad Division), and `WR-SCADA-PWR-02` (Traction SCADA Substation, Western Railway).
   - Continuous verification of hardware interlocks, 25kV traction load, relay status, and AES-256-GCM radio cryptographic handshakes.
4. **Cyber-Physical Attack Scenario Simulator (`simulate_ot_attack`)**:
   - Simulates controlled adversarial attacks (`spoofed_radio_stop`, `plc_interlocking_tamper`, `rogue_vlan_device`).
   - Verifies Kavach Vital Computer (OBC) failsafe override rejection and Electronic Interlocking 2-out-of-2 hardware interlock route preservation.
5. **High-Throughput Ingestion Benchmark Engine (`run_ingestion_benchmark`)**:
   - Ingests and processes 5,000 synthetic platform events (4,950 normal telemetry + 50 attack vectors) against Sigma detection rules in under 5 milliseconds.
   - Verified throughput exceeding **1,000,000 events/sec** with **< 0.005 ms** average latency.

---

## 2. Implemented Features & Architecture

### 2.1 Backend Engine & Data Models (`services/api/railraksha/`)
- **Database Models (`railsoc_models.py`)**:
  - `RailSOCEvent`: Raw event stream storing source, event type, severity, payload JSONB, ingestion latency, and processed timestamp.
  - `RailSOCAlert`: Triggered detection alerts storing alert ID, rule ID, title, severity, MITRE ATT&CK technique, MITRE tactic, status, and IoC indicators.
  - `RailSOCIncident`: Promoted security incidents storing incident ID, title, severity, CERT-In compliance flag, JSONB dossier, and playbook containment actions.
  - `OTSignallingNode`: Operational Technology signalling inventory storing node ID, system type, zone, IP address, status, and last telemetry JSONB.
- **Alembic Migration (`0010_railsoc.py`)**:
  - Applied to PostgreSQL (`0010_railsoc (head)`).
- **Core Engine & Endpoints (`railsoc.py`)**:
  - `POST /v1/soc/events/ingest`: Bulk ingestion and real-time Sigma evaluation.
  - `GET /v1/soc/alerts`: Filterable SIEM alert stream.
  - `POST /v1/soc/alerts/{alert_id}/promote`: Promotion to official incident with CERT-In dossier.
  - `GET /v1/soc/ot/nodes`: OT equipment inventory and telemetry metrics.
  - `POST /v1/soc/ot/simulate-attack`: Cyber-physical attack simulator with failsafe verification.
  - `POST /v1/soc/benchmark/ingest`: High-throughput 5,000 event engine performance test.
  - `GET /v1/soc/dashboard/stats`: Operational KPI metrics and MITRE technique frequency.

### 2.2 Schemas & BFF Proxy (`packages/schemas`, `apps/web`)
- **Zod Schemas**: `socEventIngestInputSchema`, `socAlertSchema`, `socPromoteAlertInputSchema`, `socIncidentDossierSchema`, `socOTNodeSchema`, `socSimulateAttackInputSchema`, `socBenchmarkResultSchema`, `socDashboardStatsSchema`.
- **BFF Route (`apps/web/src/app/api/tools/[...path]/route.ts`)**:
  - Whitelisted read routes: `soc/alerts`, `soc/ot/nodes`, `soc/dashboard/stats`.
  - Whitelisted write routes: `soc/events/ingest`, `soc/ot/simulate-attack`, `soc/benchmark/ingest`, `soc/alerts/${altId}/promote`.

### 2.3 Frontend Interface (`apps/web/src/components/railsoc-tools.tsx`)
- Three intuitive operational tabs:
  1. **SIEM Alert Stream & CERT-In Dossier**: Real-time alerts feed with severity badges, MITRE technique tags, IoC indicators, alert triage, and 1-click CERT-In dossier escalation.
  2. **OT / Signalling Nodes & Attack Simulator**: Active signalling equipment nodes with live telemetry, radio scenario selector (`spoofed_radio_stop`, `plc_interlocking_tamper`, `rogue_vlan_device`), and Kavach failsafe interlock verification.
  3. **High-Throughput 5k Event Ingestion Benchmark**: 1-click execution testing 5,000 synthetic events displaying throughput, latency, and attack detection rate.
- Strict CSP compliance (zero inline styles), semantic WCAG 2.2 AA accessibility, full English/Hindi parity.

---

## 3. Verification & Test Results

| Test Category | Suite / File | Tests | Coverage / Pass Rate |
| :--- | :--- | :--- | :--- |
| **Backend Unit & Integration** | `services/api/tests/test_railsoc.py` | 9 passed | 100% |
| **Full Python Test Suite** | `services/api/tests/` | 146 passed | **82.23%** (Target: ≥ 80%) |
| **Playwright Phase 10 E2E** | `tests/e2e/phase10.spec.ts` | 1 passed | 100% (WCAG 2.2 AA clean) |
| **Full E2E Regression Suite** | `tests/e2e/*.spec.ts` | **53 passed** | **100%** (0 regressions) |
| **Typecheck & Linter** | `pnpm typecheck` & `pnpm lint` | Clean | 0 errors, 0 warnings |
| **Dependency Security Audit**| `pnpm audit` | Clean | 0 vulnerabilities |

---

## 4. Regulatory & Standards Alignment

- **CERT-In Cyber Security Directions (Rule 12)**: Mandatory 6-hour reporting window automated draft dossiers with SHA-256 chain of custody.
- **MITRE ATT&CK for ICS & Enterprise**:
  - `T0885` (Inhibit Response Function)
  - `T0855` (Impair Process Control)
  - `T1078` (Valid Accounts)
  - `T1048` (Exfiltration Over Alternative Protocol)
  - `T0846` (Remote System Discovery)
- **Kavach (TCAS) Specifications**:
  - UHF 441.8 MHz cryptographic command integrity verification.
  - Electronic Interlocking 2-out-of-2 hardware interlock logic protection.
