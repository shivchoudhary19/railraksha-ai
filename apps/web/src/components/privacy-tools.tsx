'use client';

import {useState, useEffect} from 'react';
import type {
  AuditChainVerifyResult,
  ConsentStatusResult,
  DataExportResult,
  DPBIBreachDossierResult,
  EncryptPIIResult,
  ErasureResult,
  PrivacyScanResult,
  RetentionPolicy,
} from '@railraksha/schemas';

type Tab = 'dashboard' | 'consent' | 'dsr' | 'operator_vault';

type Props = {
  locale: 'en' | 'hi';
  csrfToken: string;
  userEmail: string;
  isOperator: boolean;
};

export function PrivacyTools({locale, csrfToken, userEmail, isOperator}: Props) {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [feedback, setFeedback] = useState<{type: 'success' | 'error'; message: string} | null>(null);
  const [loading, setLoading] = useState(false);

  // --- Tab 1: Dashboard & Data Export ---
  const [exportData, setExportData] = useState<DataExportResult | null>(null);
  const [erasureResult, setErasureResult] = useState<ErasureResult | null>(null);
  const [policies, setPolicies] = useState<RetentionPolicy[]>([]);

  // --- Tab 2: Consent Manager ---
  const [consentMap, setConsentMap] = useState<Record<string, boolean>>({
    FRAUD_DETECTION: true,
    STUDENT_CERTIFICATION: true,
    SECURITY_ALERTS: true,
    ANALYTICS: false,
  });
  const [consentReceipts, setConsentReceipts] = useState<Record<string, unknown>[]>([]);

  // --- Tab 3: DSR Portal & Audit Chain ---
  const [dsrType, setDsrType] = useState<'access_export' | 'correction' | 'erasure' | 'grievance'>('grievance');
  const [dsrDetails, setDsrDetails] = useState('Requesting clarification on telemetry retention period for booking tests.');
  const [dsrResult, setDsrResult] = useState<{request_id: string; sla_due_at: string; summary: string} | null>(null);
  const [auditChain, setAuditChain] = useState<AuditChainVerifyResult | null>(null);

  // --- Tab 4: Operator KMS Vault & Scanner ---
  const [rawPii, setRawPii] = useState('+91-9876543210');
  const [encryptedPii, setEncryptedPii] = useState<EncryptPIIResult | null>(null);
  const [decryptedText, setDecryptedText] = useState<string | null>(null);
  const [keyRotationInfo, setKeyRotationInfo] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<PrivacyScanResult | null>(null);
  const [breachDossier, setBreachDossier] = useState<DPBIBreachDossierResult | null>(null);

  // Load Policies & Consents on mount
  useEffect(() => {
    let active = true;
    async function loadData() {
      try {
        const [polRes, cnsRes] = await Promise.all([
          fetch('/api/tools/privacy/policies'),
          fetch(`/api/tools/privacy/consent?principal_id=${encodeURIComponent(userEmail)}`),
        ]);
        if (active && polRes.ok) {
          const polData = (await polRes.json()) as RetentionPolicy[];
          setPolicies(polData);
        }
        if (active && cnsRes.ok) {
          const cnsData = (await cnsRes.json()) as ConsentStatusResult;
          setConsentMap(cnsData.consents);
          setConsentReceipts(cnsData.receipts);
        }
      } catch {
        // Fallback gracefully
      }
    }
    loadData();
    return () => {
      active = false;
    };
  }, [userEmail]);

  // Tab 1: One-Click Data Export
  async function handleExportData() {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/tools/privacy/dsr/export?principal_id=${encodeURIComponent(userEmail)}`);
      if (!res.ok) throw new Error('Data export failed.');
      const data = (await res.json()) as DataExportResult;
      setExportData(data);
      setFeedback({
        type: 'success',
        message:
          locale === 'hi'
            ? 'आपका व्यक्तिगत डेटा पोर्टेबल JSON प्रारूप में सफलतापूर्वक तैयार किया गया।'
            : 'Personal data package successfully compiled under DPDP Section 11.',
      });
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error exporting data',
      });
    } finally {
      setLoading(false);
    }
  }

  // Tab 1: Right to Erasure
  async function handleRightToErasure() {
    if (!window.confirm(locale === 'hi' ? 'क्या आप निश्चित रूप से अपना सारा डेटा मिटाना चाहते हैं?' : 'Are you sure you want to exercise Right to Erasure?')) {
      return;
    }
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/tools/privacy/dsr/erase', {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken},
        body: JSON.stringify({principal_id: userEmail, confirmation: true}),
      });
      if (!res.ok) throw new Error('Erasure execution failed.');
      const data = (await res.json()) as ErasureResult;
      setErasureResult(data);
      setFeedback({
        type: 'success',
        message:
          locale === 'hi'
            ? 'डीपीडीपी अधिनियम 2023 की धारा 12(3) के तहत मिटाने का अधिकार निष्पादित।'
            : 'Right to Erasure enforced. Identifiers pseudonymized & scrubbed.',
      });
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error executing erasure',
      });
    } finally {
      setLoading(false);
    }
  }

  // Tab 2: Update Consents
  async function handleSaveConsents() {
    setLoading(true);
    setFeedback(null);
    try {
      const updateList = Object.entries(consentMap).map(([purpose_code, is_given]) => ({
        purpose_code,
        is_given,
      }));
      const res = await fetch('/api/tools/privacy/consent', {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken},
        body: JSON.stringify({principal_id: userEmail, consents: updateList}),
      });
      if (!res.ok) throw new Error('Failed to update consent preferences.');
      const data = (await res.json()) as ConsentStatusResult;
      setConsentMap(data.consents);
      setConsentReceipts(data.receipts);
      setFeedback({
        type: 'success',
        message:
          locale === 'hi'
            ? 'सहमति प्राथमिकताएं अपडेट की गईं एवं नया डीपीडीपी रसीद जारी किया गया।'
            : 'Consent preferences updated and new cryptographic DPDP receipt issued.',
      });
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error updating consent',
      });
    } finally {
      setLoading(false);
    }
  }

  // Tab 3: Submit DSR Grievance / Request
  async function handleSubmitDSR() {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/tools/privacy/dsr/request', {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken},
        body: JSON.stringify({
          principal_id: userEmail,
          request_type: dsrType,
          details: {note: dsrDetails},
        }),
      });
      if (!res.ok) throw new Error('DSR submission failed.');
      const data = (await res.json()) as {request_id: string; sla_due_at: string; summary: string};
      setDsrResult(data);
      setFeedback({
        type: 'success',
        message:
          locale === 'hi'
            ? `अनुरोध ${data.request_id} पंजीकृत। एसएलए समय सीमा: ${data.sla_due_at}`
            : `DSR Request ${data.request_id} registered. Statutory SLA due: ${data.sla_due_at}`,
      });
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error filing DSR request',
      });
    } finally {
      setLoading(false);
    }
  }

  // Tab 3: Verify Audit Chain
  async function handleVerifyAuditChain() {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/tools/privacy/audit/verify');
      if (!res.ok) throw new Error('Audit chain check failed.');
      const data = (await res.json()) as AuditChainVerifyResult;
      setAuditChain(data);
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Audit chain verification error',
      });
    } finally {
      setLoading(false);
    }
  }

  // Tab 4: KMS PII Encryption Simulator
  async function handleEncryptPii() {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/tools/privacy/vault/encrypt', {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken},
        body: JSON.stringify({plaintext_data: rawPii, classification: 'PHONE_PII'}),
      });
      if (!res.ok) throw new Error('Encryption failed.');
      const data = (await res.json()) as EncryptPIIResult;
      setEncryptedPii(data);
      setDecryptedText(null);
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Encryption error',
      });
    } finally {
      setLoading(false);
    }
  }

  // Tab 4: Decrypt PII
  async function handleDecryptPii(token: string) {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/tools/privacy/vault/decrypt', {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken},
        body: JSON.stringify({vault_token: token}),
      });
      if (!res.ok) throw new Error('Decryption failed.');
      const data = (await res.json()) as {plaintext_data: string};
      setDecryptedText(data.plaintext_data);
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Decryption error',
      });
    } finally {
      setLoading(false);
    }
  }

  // Tab 4: Key Rotation
  async function handleRotateKeys() {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/tools/privacy/vault/rotate', {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken},
        body: JSON.stringify({target_version: 2}),
      });
      if (!res.ok) throw new Error('Key rotation failed.');
      const data = (await res.json()) as {message: string};
      setKeyRotationInfo(data.message);
      setFeedback({type: 'success', message: data.message});
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Key rotation error',
      });
    } finally {
      setLoading(false);
    }
  }

  // Tab 4: Run Operator Scanner
  async function handleRunScanner() {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/tools/privacy/scanner/scan', {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken},
      });
      if (!res.ok) throw new Error('Scan failed.');
      const data = (await res.json()) as PrivacyScanResult;
      setScanResult(data);
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Scanner error',
      });
    } finally {
      setLoading(false);
    }
  }

  // Tab 4: Generate DPBI Dossier
  async function handleGenerateBreachDossier() {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/tools/privacy/breach/dossier', {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken},
        body: JSON.stringify({
          incident_title: 'Simulated brute-force attack on citizen verification token pool',
          affected_principals_count: 14,
          pii_categories_exposed: ['User Agent Hash', 'IP Geolocation Subnet'],
          containment_measures_taken: 'Rate-limiting engaged, session keys revoked, perimeter firewall rule enforced.',
        }),
      });
      if (!res.ok) throw new Error('Dossier generation failed.');
      const data = (await res.json()) as DPBIBreachDossierResult;
      setBreachDossier(data);
      setFeedback({
        type: 'success',
        message:
          locale === 'hi'
            ? 'डीपीबीआई फॉर्म अनुलग्नक-बी 6 घंटे का नोटिस सफलतापूर्वक तैयार किया गया।'
            : 'DPBI Form Annexure-B statutory 6-hour breach notification dossier compiled.',
      });
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Dossier error',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Heading */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
                {locale === 'hi' ? 'गोपनीयता वॉल्ट' : 'PRIVACY VAULT & DPDP TOOLKIT'}
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                DPDP ACT 2023 · ISO/IEC 27701 ENFORCED
              </span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground mt-2">
              {locale === 'hi'
                ? 'गोपनीयता वॉल्ट एवं डीपीडीपी अनुपालन साधन'
                : 'Privacy Vault & DPDP Act 2023 Compliance Toolkit'}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {locale === 'hi'
                ? 'डेटा सुरक्षा हमारा प्राथमिक दायित्व है। फ़ील्ड-स्तरीय एन्क्रिप्शन (AES-256-GCM), उद्देश्य-बाध्य सहमति प्रबंधन, और नागरिक अधिकारों का तत्काल निष्पादन।'
                : 'Field-level envelope encryption, purpose-bound consent manager, data principal rights portal, and immutable hash-chained audit trails.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isOperator && (
              <span className="text-xs font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded dark:bg-amber-950 dark:text-amber-200">
                OPERATOR CLEARANCE
              </span>
            )}
            <span className="text-xs font-mono font-bold text-emerald-800 dark:text-emerald-300">
              {locale === 'hi' ? 'शून्य सादा टेक्स्ट पीआईआई' : 'ZERO PLAINTEXT PII'}
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mt-6 flex flex-wrap gap-2 border-t border-border pt-4" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'dashboard'}
            onClick={() => {
              setTab('dashboard');
              setFeedback(null);
            }}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              tab === 'dashboard'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {locale === 'hi' ? '1. मेरा डेटा और गोपनीयता डैशबोर्ड' : '1. My Data & Privacy Dashboard'}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'consent'}
            onClick={() => {
              setTab('consent');
              setFeedback(null);
            }}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              tab === 'consent'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {locale === 'hi' ? '2. सहमति प्रबंधक' : '2. Consent Manager & Receipts'}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'dsr'}
            onClick={() => {
              setTab('dsr');
              setFeedback(null);
            }}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              tab === 'dsr'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {locale === 'hi' ? '3. नागरिक अधिकार पोर्टल (DSR)' : '3. Data Principal Rights (DSR)'}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'operator_vault'}
            onClick={() => {
              setTab('operator_vault');
              setFeedback(null);
            }}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              tab === 'operator_vault'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {locale === 'hi' ? '4. ऑपरेटर वॉल्ट एवं पीआईआई स्कैनर' : '4. Operator KMS Vault & Scanner'}
          </button>
        </div>
      </div>

      {/* Toast Feedback */}
      {feedback && (
        <div
          role="alert"
          className={`p-4 rounded-xl border text-sm flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-200'
              : 'bg-red-50 border-red-300 text-red-900 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-200'
          }`}
        >
          <span>{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs font-mono font-bold text-foreground hover:underline"
            aria-label="Dismiss alert"
          >
            ✕
          </button>
        </div>
      )}

      {/* TAB 1: Privacy Dashboard & Portability */}
      {tab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-card border border-border rounded-xl p-5 space-y-2 shadow-sm">
              <span className="text-xs font-bold text-primary">DPDP ACT 2023 SEC 11</span>
              <h3 className="text-lg font-bold text-foreground">Right to Access & Portability</h3>
              <p className="text-xs text-muted-foreground">
                Download a complete, machine-readable JSON archive of all personal data, reports, and academy credentials held by RailRaksha.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleExportData}
                  className="button button-small"
                >
                  {loading ? 'Exporting...' : 'One-Click Data Export'}
                </button>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-5 space-y-2 shadow-sm">
              <span className="text-xs font-bold text-destructive">DPDP ACT 2023 SEC 12(3)</span>
              <h3 className="text-lg font-bold text-foreground">Right to Erasure & Forgetting</h3>
              <p className="text-xs text-muted-foreground">
                Permanently purge personal identifiers, withdraw all active consents, and pseudonymize telemetry logs while honoring legal-hold mandates.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleRightToErasure}
                  className="button button-small"
                >
                  {loading ? 'Erasing...' : 'Exercise Right to Erasure'}
                </button>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-5 space-y-2 shadow-sm">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                ISO/IEC 27701 PIMS
              </span>
              <h3 className="text-lg font-bold text-foreground">Data Retention Policies</h3>
              <p className="text-xs text-muted-foreground">
                Automated lifecycle purging actively removes obsolete data: 90 days for booking telemetry, 180 days for quizzes, and 365 days for scam reports.
              </p>
              <div className="pt-2">
                <span className="text-xs font-mono font-semibold text-emerald-800 dark:text-emerald-300">
                  AUTO-PURGE ENGINE ACTIVE
                </span>
              </div>
            </div>
          </div>

          {/* Retention Policies Table */}
          <div className="bg-card border border-border rounded-xl p-6 space-y-4 shadow-sm">
            <h3 className="text-base font-bold text-foreground">
              {locale === 'hi' ? 'डेटा प्रतिधारण एवं कानूनी रोक नीतियां' : 'Active Data Retention & Legal-Hold Policies'}
            </h3>
            <div className="w-full">
              <table className="w-full text-xs text-left text-foreground">
                <thead className="bg-muted text-muted-foreground uppercase font-semibold">
                  <tr>
                    <th className="p-3">Policy ID</th>
                    <th className="p-3">Data Category</th>
                    <th className="p-3">Retention Window</th>
                    <th className="p-3">Legal Hold Status</th>
                    <th className="p-3">Auto Purge</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {policies.map((p) => (
                    <tr key={p.policy_id} className="hover:bg-muted/40">
                      <td className="p-3 font-mono font-bold">{p.policy_id}</td>
                      <td className="p-3 font-semibold">{p.data_category.replace('_', ' ').toUpperCase()}</td>
                      <td className="p-3 font-mono">{p.retention_days} Days</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-bold ${
                            p.legal_hold
                              ? 'bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950 dark:text-amber-200'
                              : 'bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200'
                          }`}
                        >
                          {p.legal_hold ? 'LEGAL HOLD ACTIVE' : 'NO HOLD'}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="text-emerald-800 dark:text-emerald-300 font-bold">
                          {p.auto_purge_enabled ? 'ENABLED' : 'PAUSED'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Export Result Details */}
          {exportData && (
            <div className="bg-card border border-border rounded-xl p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-base font-bold text-foreground">
                  Personal Data Export Archive (DPDP Act 2023 Sec 11)
                </h3>
                <span className="text-xs font-mono text-muted-foreground">{exportData.exported_at.slice(0, 19)}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-muted/40 border border-border">
                  <div className="text-muted-foreground">Framework:</div>
                  <div className="font-bold text-foreground">{exportData.compliance_framework}</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/40 border border-border">
                  <div className="text-muted-foreground">Filed Reports:</div>
                  <div className="font-bold text-foreground">{exportData.filed_reports_count} verified cases</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/40 border border-border">
                  <div className="text-muted-foreground">Audit Log Blocks:</div>
                  <div className="font-bold text-foreground">{exportData.immutable_audit_entries_count} hash-chained entries</div>
                </div>
              </div>
              <div>
                <span className="text-xs font-semibold text-muted-foreground">Full JSON Manifest:</span>
                <pre className="mt-2 p-3 rounded-lg bg-background border border-border text-xs font-mono text-foreground whitespace-pre-wrap break-all">
                  {JSON.stringify(exportData, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Erasure Result Callout */}
          {erasureResult && (
            <div className="p-5 rounded-xl border border-destructive bg-destructive/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-destructive">
                  STATUTORY ERASURE COMPLETE
                </span>
                <span className="font-mono text-xs text-foreground">
                  Audit Hash: {erasureResult.audit_chain_hash.slice(0, 16)}...
                </span>
              </div>
              <p className="text-sm text-foreground font-semibold">{erasureResult.message}</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Consent Manager */}
      {tab === 'consent' && (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-6 space-y-6 shadow-sm">
            <div>
              <h3 className="text-lg font-bold text-foreground">
                {locale === 'hi' ? 'उद्देश्य-बाध्य सहमति प्रबंधन' : 'Purpose-Bound Consent Management'}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {locale === 'hi'
                  ? 'डीपीडीपी अधिनियम 2023 की धारा 6 के तहत आपकी सहमति विशिष्ट, सूचित, बिना शर्त एवं स्पष्ट होनी चाहिए। आप किसी भी समय अपनी सहमति वापस ले सकते हैं।'
                  : 'Under DPDP Act 2023 Section 6, consent must be free, specific, informed, unconditional, and unambiguous. You may modify or withdraw consent anytime.'}
              </p>
            </div>

            {/* Granular Switches */}
            <div className="space-y-4">
              <div className="flex items-start justify-between p-4 rounded-xl bg-muted/40 border border-border">
                <div className="space-y-0.5 pr-4">
                  <label htmlFor="consent-fraud" className="text-sm font-bold text-foreground cursor-pointer">
                    Fraud Detection & PhishRadar AI Analysis (FRAUD_DETECTION)
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Allows RailRaksha AI to inspect submitted scam messages, fake URLs, and suspicious circulars to protect other citizens.
                  </p>
                </div>
                <input
                  id="consent-fraud"
                  type="checkbox"
                  checked={consentMap.FRAUD_DETECTION ?? true}
                  onChange={(e) =>
                    setConsentMap((prev) => ({...prev, FRAUD_DETECTION: e.target.checked}))
                  }
                  className="h-5 w-5 rounded border-border accent-primary cursor-pointer"
                />
              </div>

              <div className="flex items-start justify-between p-4 rounded-xl bg-muted/40 border border-border">
                <div className="space-y-0.5 pr-4">
                  <label htmlFor="consent-student" className="text-sm font-bold text-foreground cursor-pointer">
                    Student Cyber Literacy Certificates (STUDENT_CERTIFICATION)
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Enables cryptographic issuance and public verification of candidate cyber safety badges and academy quiz credentials.
                  </p>
                </div>
                <input
                  id="consent-student"
                  type="checkbox"
                  checked={consentMap.STUDENT_CERTIFICATION ?? true}
                  onChange={(e) =>
                    setConsentMap((prev) => ({...prev, STUDENT_CERTIFICATION: e.target.checked}))
                  }
                  className="h-5 w-5 rounded border-border accent-primary cursor-pointer"
                />
              </div>

              <div className="flex items-start justify-between p-4 rounded-xl bg-muted/40 border border-border">
                <div className="space-y-0.5 pr-4">
                  <label htmlFor="consent-alerts" className="text-sm font-bold text-foreground cursor-pointer">
                    Critical Security & Advisory Push Notifications (SECURITY_ALERTS)
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Receive urgent warnings regarding newly reported fake IRCTC APK campaigns or signalling advisories.
                  </p>
                </div>
                <input
                  id="consent-alerts"
                  type="checkbox"
                  checked={consentMap.SECURITY_ALERTS ?? true}
                  onChange={(e) =>
                    setConsentMap((prev) => ({...prev, SECURITY_ALERTS: e.target.checked}))
                  }
                  className="h-5 w-5 rounded border-border accent-primary cursor-pointer"
                />
              </div>

              <div className="flex items-start justify-between p-4 rounded-xl bg-muted/40 border border-border">
                <div className="space-y-0.5 pr-4">
                  <label htmlFor="consent-analytics" className="text-sm font-bold text-foreground cursor-pointer">
                    Anonymized Telemetry & Platform Performance (ANALYTICS)
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Share strictly aggregated and anonymized telemetry without cookies or third-party trackers to improve latency.
                  </p>
                </div>
                <input
                  id="consent-analytics"
                  type="checkbox"
                  checked={consentMap.ANALYTICS ?? false}
                  onChange={(e) =>
                    setConsentMap((prev) => ({...prev, ANALYTICS: e.target.checked}))
                  }
                  className="h-5 w-5 rounded border-border accent-primary cursor-pointer"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                disabled={loading}
                onClick={handleSaveConsents}
                className="button button-small"
              >
                {loading ? 'Saving Preferences...' : 'Save & Issue DPDP Consent Receipt'}
              </button>
            </div>

            {/* Verifiable Consent Receipts List */}
            {consentReceipts.length > 0 && (
              <div className="pt-4 border-t border-border space-y-3">
                <h4 className="text-sm font-bold text-foreground">
                  Cryptographic Consent Receipts (DPDP Act 2023 Sec 6):
                </h4>
                <div className="space-y-2">
                  {consentReceipts.map((rcpt, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-background border border-border text-xs font-mono space-y-1"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-primary">{String(rcpt.receipt_id)}</span>
                        <span className="text-muted-foreground">{String(rcpt.status)}</span>
                      </div>
                      <div className="text-muted-foreground">
                        Purpose: <span className="text-foreground">{String(rcpt.purpose_code)}</span> | Legal Basis: {String(rcpt.legal_standard)}
                      </div>
                      <div className="text-muted-foreground break-all">
                        Signature: <span className="text-foreground">{String(rcpt.signature)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: DSR Portal & Audit Chain */}
      {tab === 'dsr' && (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-6 space-y-6 shadow-sm">
            <div>
              <h3 className="text-lg font-bold text-foreground">
                {locale === 'hi' ? 'नागरिक अधिकार पोर्टल (DSR)' : 'Data Principal Rights & Grievance Portal'}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {locale === 'hi'
                  ? 'डीपीडीपी अधिनियम के तहत अपने कानूनी अधिकारों का प्रयोग करें। सभी अनुरोधों का समाधान अधिकतम 7 दिनों की वैधानिक समय सीमा (SLA) के भीतर किया जाता है।'
                  : 'Exercise statutory rights under DPDP Act 2023. Track requests with our guaranteed 7-day statutory resolution SLA.'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="dsr-type-select" className="block text-xs font-semibold text-foreground mb-1">
                  Request Type:
                </label>
                <select
                  id="dsr-type-select"
                  value={dsrType}
                  onChange={(e) =>
                    setDsrType(
                      e.target.value as 'access_export' | 'correction' | 'erasure' | 'grievance'
                    )
                  }
                  className="w-full rounded-lg border border-border bg-background p-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value="grievance">Grievance Redressal (Sec 13)</option>
                  <option value="correction">Correction & Updating (Sec 12)</option>
                  <option value="access_export">Access & Portability (Sec 11)</option>
                  <option value="erasure">Statutory Erasure (Sec 12)</option>
                </select>
              </div>

              <div>
                <label htmlFor="dsr-principal-input" className="block text-xs font-semibold text-foreground mb-1">
                  Data Principal Identifier:
                </label>
                <input
                  id="dsr-principal-input"
                  type="text"
                  readOnly
                  value={userEmail}
                  className="w-full rounded-lg border border-border bg-muted p-2.5 text-sm font-mono text-muted-foreground"
                />
              </div>
            </div>

            <div>
              <label htmlFor="dsr-details-input" className="block text-xs font-semibold text-foreground mb-1">
                Request Details & Notes:
              </label>
              <textarea
                id="dsr-details-input"
                rows={3}
                value={dsrDetails}
                onChange={(e) => setDsrDetails(e.target.value)}
                className="w-full rounded-lg border border-border bg-background p-3 text-sm text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                disabled={loading || dsrDetails.length < 5}
                onClick={handleSubmitDSR}
                className="button button-small"
              >
                {loading ? 'Submitting...' : 'Register Formal DSR Request'}
              </button>
            </div>

            {dsrResult && (
              <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-primary">{dsrResult.request_id}</span>
                  <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                    SLA Resolution Due: {dsrResult.sla_due_at}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{dsrResult.summary}</p>
              </div>
            )}
          </div>

          {/* Immutable Audit Chain Verification */}
          <div className="bg-card border border-border rounded-xl p-6 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-base font-bold text-foreground">
                  Immutable Cryptographic Audit Trail (Hash Chain)
                </h4>
                <p className="text-xs text-muted-foreground">
                  Every privacy action (encryption, decryption, key rotation, consent update, erasure) is appended to a tamper-proof SHA-256 hash chain.
                </p>
              </div>
              <button
                type="button"
                disabled={loading}
                onClick={handleVerifyAuditChain}
                className="button button-small"
              >
                Verify Hash Chain Integrity
              </button>
            </div>

            {auditChain && (
              <div className="mt-3 p-4 rounded-xl bg-background border border-border space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-800 dark:text-emerald-300">
                    STATUS: {auditChain.integrity_status}
                  </span>
                  <span>Total Blocks: {auditChain.total_blocks}</span>
                </div>
                <div className="text-muted-foreground break-all">
                  Genesis Hash: {auditChain.genesis_hash}
                </div>
                <div className="text-muted-foreground break-all">
                  Latest Block: {auditChain.latest_block_hash}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: Operator KMS Vault & Scanner */}
      {tab === 'operator_vault' && (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-6 space-y-6 shadow-sm">
            <div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-900 border border-sky-300 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800">
                KMS ENVELOPE ENCRYPTION
              </span>
              <h3 className="text-lg font-bold text-foreground mt-2">
                Field-Level Envelope Encryption & Key Rotation
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Sensitive identifiers (phone numbers, Aadhaar, email) are tokenized using AES-256-GCM. Master keys can be rotated without downtime.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="raw-pii-input" className="block text-xs font-semibold text-foreground mb-1">
                  Plaintext Data to Encrypt:
                </label>
                <input
                  id="raw-pii-input"
                  type="text"
                  value={rawPii}
                  onChange={(e) => setRawPii(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background p-2.5 text-sm font-mono text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="flex items-end gap-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleEncryptPii}
                  className="button button-small"
                >
                  Encrypt & Tokenize (AES-256-GCM)
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleRotateKeys}
                  className="button button-small button-outline"
                >
                  Rotate to Key v2
                </button>
              </div>
            </div>

            {keyRotationInfo && (
              <div className="p-3 rounded-lg bg-muted text-xs font-mono font-semibold text-primary">
                {keyRotationInfo}
              </div>
            )}

            {encryptedPii && (
              <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-primary">{encryptedPii.vault_token}</span>
                  <span>Key Version: v{encryptedPii.key_version}</span>
                </div>
                <div className="text-muted-foreground break-all">
                  Blind Index Hash: {encryptedPii.blind_index_hash}
                </div>
                <div className="pt-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => handleDecryptPii(encryptedPii.vault_token)}
                    className="button button-small"
                  >
                    Test Decryption
                  </button>
                  {decryptedText && (
                    <span className="text-emerald-800 dark:text-emerald-300 font-bold">
                      Decrypted: {decryptedText}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Database PII Exposure Scanner */}
          <div className="bg-card border border-border rounded-xl p-6 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-base font-bold text-foreground">
                  Database & Schema Plaintext PII Scanner
                </h4>
                <p className="text-xs text-muted-foreground">
                  Automated scanner audits all database tables to verify zero raw plaintext Aadhaar, phone, or credit card numbers are stored.
                </p>
              </div>
              <button
                type="button"
                disabled={loading}
                onClick={handleRunScanner}
                className="button button-small"
              >
                Run Database Schema Audit
              </button>
            </div>

            {scanResult && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300">
                    STATUS: {scanResult.status}
                  </span>
                  <span className="text-xs font-mono text-foreground font-semibold">
                    Plaintext Violations: {scanResult.plaintext_pii_violations}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Tables: {scanResult.tables_scanned} | Columns: {scanResult.columns_scanned}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {scanResult.findings.map((f, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-background border border-border font-mono">
                      <div className="font-bold text-foreground">
                        {f.table}.{f.column}
                      </div>
                      <div className="text-muted-foreground">{f.protection}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Statutory DPBI Breach Dossier */}
          <div className="bg-card border border-border rounded-xl p-6 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-base font-bold text-foreground">
                  Data Protection Board of India (DPBI) Statutory Breach Dossier
                </h4>
                <p className="text-xs text-muted-foreground">
                  Produces regulatory Form Annexure-B notification complying with DPDP Act 2023 Sec 8(6) and CERT-In 6-hour reporting mandate.
                </p>
              </div>
              <button
                type="button"
                disabled={loading}
                onClick={handleGenerateBreachDossier}
                className="button button-small"
              >
                Generate DPBI 6-Hour Notice
              </button>
            </div>

            {breachDossier && (
              <div className="p-4 rounded-xl bg-background border border-border space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-primary">{breachDossier.dossier_id}</span>
                  <span className="font-semibold text-emerald-800 dark:text-emerald-300">
                    Statutory Window: {breachDossier.reporting_window_hours} Hours (ON TIME)
                  </span>
                </div>
                <div className="text-foreground font-sans text-xs">
                  Format: {breachDossier.dpbi_notice_format}
                </div>
                <div className="text-muted-foreground">
                  Cross Reference: {breachDossier.cert_in_cross_reference}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
