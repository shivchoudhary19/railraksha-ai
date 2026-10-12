# 0004 — Minimal data and append-only audit

Accepted, 2026-10-12.

The baseline adds `user_profile` (OIDC UUID, display name, English/Hindi preference, update time) and `audit_log` (UUID, actor UUID, action, request ID, time). Email/passwords stay with Keycloak. Profile updates and their audit entries commit in one transaction. The application database role cannot update/delete audit records. A PostgreSQL trigger also rejects changes by the schema owner. Infrastructure superusers can still override database protections; this is not a tamper-proof archive. Hash chaining is explicitly a later phase.

Database owner, application and Keycloak roles/databases are separate. PUBLIC schema creation is revoked. Structured HTTP logs exclude bodies, query strings, credentials, IPs, names and email addresses. Logs are written to stdout for the local operator; no claimed 180-day production retention pipeline exists in this foundation.

For applicable covered entities, CERT-In directions include reportable incident notification within six hours of noticing and secure log retention for a rolling 180 days within Indian jurisdiction. Confirm applicability and operational procedures before a live deployment. DPDP obligations have phased commencement; consult current notified rules and obtain legal review rather than treating this prototype as certified compliance.

References: [CERT-In directions](https://www.cert-in.org.in/PDF/CERT-In_Directions_70B_28.04.2022.pdf), [CERT-In FAQs](https://www.cert-in.org.in/PDF/FAQs_on_CyberSecurityDirections_May2022.pdf), [MeitY notified rules and enforcement timeline](https://www.meity.gov.in/documents/act-and-policies/digital-personal-data-protection-rules-2025-gDOxUjMtQWa?pageTitle=Digit).
