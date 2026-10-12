'use client';

import {useState, type FormEvent} from 'react';
import {takedownCaseOutput, type TakedownCase} from '@railraksha/schemas';
import Link from 'next/link';

const labels = {
  en: {
    title: 'PhishRadar · Takedown Workspace',
    new_takedown: 'Initiate Takedown Case',
    target_domain: 'Target malicious domain',
    registrar: 'Registrar or hosting provider (optional)',
    evidence_summary: 'Evidence dossier summary (WHOIS, DNS, timeline)',
    submit: 'Create takedown case',
    status: 'Case Status',
    update_status: 'Update status',
    status_draft: 'Draft',
    status_reported: 'Reported to abuse desk',
    status_in_progress: 'In progress / Escalated to CERT-In',
    status_resolved: 'Resolved / Domain suspended',
    note: 'Action update note',
    save: 'Update status',
    empty: 'No active takedown cases.',
    back_to_radar: 'Back to PhishRadar',
    load: 'Working…',
    error: 'Could not complete takedown update. Check inputs.',
    saved: 'Takedown case updated successfully.',
  },
  hi: {
    title: 'PhishRadar · टेकडाउन कार्यक्षेत्र',
    new_takedown: 'नया टेकडाउन केस दर्ज करें',
    target_domain: 'निशाना बनाया गया संदिग्ध डोमेन',
    registrar: 'रजिस्ट्रार या होस्टिंग प्रदाता (वैकल्पिक)',
    evidence_summary: 'सबूत सारांश (WHOIS, DNS, टाइमलाइन)',
    submit: 'टेकडाउन केस बनाएँ',
    status: 'केस स्थिति',
    update_status: 'स्थिति बदलें',
    status_draft: 'ड्राफ्ट',
    status_reported: 'एब्यूज डेस्क को सूचित किया गया',
    status_in_progress: 'प्रक्रिया जारी / CERT-In को भेजा गया',
    status_resolved: 'सुलझाया गया / डोमेन निलंबित',
    note: 'कार्रवाई नोट',
    save: 'स्थिति सहेजें',
    empty: 'वर्तमान में कोई सक्रिय टेकडाउन केस नहीं है।',
    back_to_radar: 'PhishRadar पर लौटें',
    load: 'प्रक्रिया जारी है…',
    error: 'टेकडाउन अपडेट विफल रहा। जानकारी जाँचें।',
    saved: 'टेकडाउन केस सफलतापूर्वक अपडेट किया गया।',
  },
};

export function TakedownTools({
  locale,
  csrf,
  initialCases = [],
  defaultDomain = '',
  defaultScanId = '',
}: {
  locale: 'en' | 'hi';
  csrf: string;
  initialCases?: TakedownCase[];
  defaultDomain?: string;
  defaultScanId?: string;
}) {
  const t = labels[locale];
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [cases, setCases] = useState<TakedownCase[]>(initialCases);

  async function request(path: string, body?: object) {
    const response = await fetch(`/api/tools/${path}`, {
      method: body ? 'POST' : 'GET',
      headers: {
        'x-csrf-token': csrf,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || t.error);
    }
    return response.json();
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const domain = String(form.get('target_domain') ?? '').trim();
    const evidence = String(form.get('evidence_summary') ?? '').trim();
    if (!domain || !evidence) return;

    setBusy(true);
    setError('');
    setNotice('');
    try {
      const res = takedownCaseOutput.parse(
        await request('takedowns', {
          target_domain: domain,
          scan_id: form.get('scan_id') || null,
          registrar: form.get('registrar') || null,
          evidence_summary: evidence,
        })
      );
      setCases((prev) => [res, ...prev]);
      setNotice(t.saved);
      event.currentTarget.reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : t.error);
    } finally {
      setBusy(false);
    }
  }

  async function handleStatusUpdate(caseId: string, status: string, note: string) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const updated = takedownCaseOutput.parse(
        await request(`takedowns/${caseId}/status`, {status, note: note || undefined})
      );
      setCases((prev) => prev.map((c) => (c.id === caseId ? updated : c)));
      setNotice(t.saved);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <nav className="tool-tabs" aria-label="Takedown Navigation">
        <Link href={`/${locale}/phishradar`} className="button button-small button-outline">
          ← {t.back_to_radar}
        </Link>
      </nav>

      <div className="tool-feedback" aria-live="polite" aria-atomic="true">
        {busy && <p>{t.load}</p>}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {notice && <p>{notice}</p>}
      </div>

      <div className="tool-grid">
        <form className="tool-panel" onSubmit={handleCreate}>
          <h2>{t.new_takedown}</h2>
          {defaultScanId && <input type="hidden" name="scan_id" value={defaultScanId} />}
          <label htmlFor="takedown-domain">{t.target_domain}</label>
          <input
            id="takedown-domain"
            name="target_domain"
            defaultValue={defaultDomain}
            required
            maxLength={255}
          />

          <label htmlFor="takedown-registrar">{t.registrar}</label>
          <input id="takedown-registrar" name="registrar" maxLength={255} />

          <label htmlFor="takedown-evidence">{t.evidence_summary}</label>
          <textarea
            id="takedown-evidence"
            name="evidence_summary"
            required
            rows={5}
            maxLength={5000}
            defaultValue={
              defaultDomain
                ? `Evidence summary for ${defaultDomain}:\n- Reported look-alike of IRCTC railway portal\n- Brand impersonation detected via PhishRadar\n- Takedown request prepared for Registrar & CERT-In`
                : ''
            }
          />

          <button className="button" disabled={busy}>
            {t.submit}
          </button>
        </form>

        <div className="record-list">
          <h2>{t.title}</h2>
          {cases.length === 0 && <p>{t.empty}</p>}
          {cases.map((c) => (
            <article className="tool-panel" key={c.id}>
              <h3 className="break-value">{c.target_domain}</h3>
              <p>
                {t.status}: <strong className="case-status">{c.status.toUpperCase()}</strong>
              </p>
              {c.registrar && <p>Registrar: {c.registrar}</p>}
              <p className="break-value pre-wrap">
                {c.evidence_summary}
              </p>

              <div>
                <label htmlFor={`status-${c.id}`}>{t.update_status}</label>
                <div className="status-actions">
                  {(['draft', 'reported', 'in_progress', 'resolved'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      className={`button button-small ${c.status === st ? '' : 'button-outline'}`}
                      disabled={busy || c.status === st}
                      onClick={() => handleStatusUpdate(c.id, st, `Status changed to ${st}`)}
                    >
                      {st === 'draft'
                        ? t.status_draft
                        : st === 'reported'
                        ? t.status_reported
                        : st === 'in_progress'
                        ? t.status_in_progress
                        : t.status_resolved}
                    </button>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </>
  );
}
