'use client';

import {useState, type FormEvent} from 'react';
import {
  phishradarScanOutput,
  domainMonitorOutput,
  type PhishRadarScan,
  type DomainMonitorAlert,
} from '@railraksha/schemas';
import Link from 'next/link';

const labels = {
  en: {
    title: 'PhishRadar · Website Analysis',
    scan_tab: 'Analyze URL',
    monitor_tab: 'Proactive Domain Monitor',
    enter_url: 'Website or ticket portal link',
    url_placeholder: 'https://example-railway-portal.xyz/booking',
    scan_button: 'Analyze website',
    scanning: 'Inspecting domain, certificates and brand homoglyphs…',
    error: 'Could not complete analysis. Check URL and try again.',
    risk_score: 'Calculated Risk Score',
    safe: 'Safe · No Deceptive Signals',
    suspicious: 'Suspicious · Look-alike Characteristics',
    dangerous: 'Dangerous · Phishing / Scam Threat',
    why_title: 'Why we flagged this',
    actions_title: 'Recommended actions',
    report_cta: 'File a formal scam report',
    takedown_cta: 'Open takedown case',
    recent_scans: 'Recent URL scans',
    monitored_domains: 'Certificate Transparency & Look-alike Stream',
    simulate_alert: 'Simulate CT-log discovery',
    empty_monitor: 'No active look-alike alerts in the stream.',
    source: 'Source',
    similarity: 'Brand similarity',
    status: 'Status',
    notice_saved: 'Action completed successfully.',
  },
  hi: {
    title: 'PhishRadar · वेबसाइट विश्लेषण',
    scan_tab: 'URL जाँचें',
    monitor_tab: 'सक्रिय डोमेन निगरानी',
    enter_url: 'वेबसाइट या टिकट पोर्टल लिंक',
    url_placeholder: 'https://example-railway-portal.xyz/booking',
    scan_button: 'वेबसाइट का विश्लेषण करें',
    scanning: 'डोमेन, प्रमाणपत्र और भ्रामक वर्णों की जाँच जारी है…',
    error: 'विश्लेषण पूरा नहीं हो सका। कृपया URL जाँचकर पुनः प्रयास करें।',
    risk_score: 'जोखिम स्कोर',
    safe: 'सुरक्षित · कोई भ्रामक संकेत नहीं',
    suspicious: 'संदिग्ध · नकली वेबसाइट के लक्षण',
    dangerous: 'खतरनाक · फ़िशिंग / धोखाधड़ी का ख़तरा',
    why_title: 'यह परिणाम क्यों आया',
    actions_title: 'सुझाए गए कदम',
    report_cta: 'धोखाधड़ी की रिपोर्ट दर्ज करें',
    takedown_cta: 'टेकडाउन केस शुरू करें',
    recent_scans: 'हाल ही में जाँचे गए लिंक',
    monitored_domains: 'सर्टिफिकेट पारदर्शिता व संदिग्ध डोमेन स्ट्रीम',
    simulate_alert: 'CT-लॉग खोज का डेमो करें',
    empty_monitor: 'स्ट्रीम में अभी कोई संदिग्ध डोमेन अलर्ट नहीं है।',
    source: 'स्रोत',
    similarity: 'ब्रांड समानता',
    status: 'स्थिति',
    notice_saved: 'कार्रवाई सफलतापूर्वक पूरी हुई।',
  },
};

export function PhishRadarTools({
  locale,
  csrf,
  initialScans = [],
  initialAlerts = [],
  canOperate = false,
}: {
  locale: 'en' | 'hi';
  csrf: string;
  initialScans?: PhishRadarScan[];
  initialAlerts?: DomainMonitorAlert[];
  canOperate?: boolean;
}) {
  const t = labels[locale];
  const [activeTab, setActiveTab] = useState<'scan' | 'monitor'>('scan');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [result, setResult] = useState<PhishRadarScan | null>(initialScans[0] ?? null);
  const [scans, setScans] = useState<PhishRadarScan[]>(initialScans);
  const [alerts, setAlerts] = useState<DomainMonitorAlert[]>(initialAlerts);

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

  async function triggerScan(url: string) {
    if (!url) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const res = phishradarScanOutput.parse(await request('phishradar/scan', {url}));
      setResult(res);
      setScans((prev) => [res, ...prev.filter((item) => item.id !== res.id)]);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.error);
    } finally {
      setBusy(false);
    }
  }

  function handleScan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const url = String(form.get('url') ?? '').trim();
    void triggerScan(url);
  }

  async function handleSimulate() {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const alert = domainMonitorOutput.parse(await request('phishradar/monitor/simulate', {}));
      setAlerts((prev) => [alert, ...prev]);
      setNotice(t.notice_saved);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <nav className="tool-tabs" aria-label="PhishRadar Modes">
        <button
          type="button"
          className="button button-small"
          aria-current={activeTab === 'scan' ? 'page' : undefined}
          onClick={() => setActiveTab('scan')}
        >
          {t.scan_tab}
        </button>
        <button
          type="button"
          className="button button-small"
          aria-current={activeTab === 'monitor' ? 'page' : undefined}
          onClick={() => setActiveTab('monitor')}
        >
          {t.monitor_tab}
        </button>
        {canOperate && (
          <Link href={`/${locale}/takedowns`} className="button button-small button-outline">
            {t.takedown_cta}
          </Link>
        )}
      </nav>

      <div className="tool-feedback" aria-live="polite" aria-atomic="true">
        {busy && <p>{t.scanning}</p>}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {notice && <p>{notice}</p>}
      </div>

      {activeTab === 'scan' && (
        <div className="tool-grid">
          <form className="tool-panel" onSubmit={handleScan}>
            <h2>{t.title}</h2>
            <label htmlFor="scan-url">{t.enter_url}</label>
            <input
              id="scan-url"
              name="url"
              type="url"
              required
              maxLength={2048}
              placeholder={t.url_placeholder}
              autoComplete="off"
            />
            <button className="button" disabled={busy}>
              {t.scan_button}
            </button>
          </form>

          {result && (
            <section
              className={`tool-panel verdict verdict-${result.verdict === 'dangerous' ? 'known_scam' : result.verdict === 'safe' ? 'official' : 'unknown'}`}
              aria-live="polite"
            >
              <h2>{t[result.verdict]}</h2>
              <p className="break-value">
                <strong>{result.domain}</strong>
              </p>
              <p>
                {t.risk_score}: <strong>{result.risk_score} / 100</strong>
              </p>
              <p>{locale === 'hi' ? result.explanation_hi : result.explanation_en}</p>

              {result.factors.length > 0 && (
                <div>
                  <h3>{t.why_title}</h3>
                  <ul className="factor-list">
                    {result.factors.map((f, i) => (
                      <li key={i} className="factor-item">
                        <strong>{locale === 'hi' ? f.title_hi : f.title_en}:</strong>{' '}
                        {locale === 'hi' ? f.detail_hi : f.detail_en}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.actions_en.length > 0 && (
                <div>
                  <h3>{t.actions_title}</h3>
                  <ul className="factor-list">
                    {(locale === 'hi' ? result.actions_hi : result.actions_en).map((a, i) => (
                      <li key={i} className="factor-item">{a}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="tool-actions">
                <Link className="button button-small" href={`/${locale}/reports`}>
                  {t.report_cta}
                </Link>
                {canOperate && (
                  <Link
                    className="button button-small button-outline"
                    href={`/${locale}/takedowns?domain=${encodeURIComponent(result.domain)}&scan_id=${result.id}`}
                  >
                    {t.takedown_cta}
                  </Link>
                )}
              </div>
            </section>
          )}
        </div>
      )}

      {activeTab === 'scan' && scans.length > 0 && (
        <div className="record-list">
          <h2>{t.recent_scans}</h2>
          {scans.slice(0, 5).map((scan) => (
            <article className="tool-panel" key={scan.id}>
              <h3 className="break-value">{scan.domain}</h3>
              <p>
                {t.risk_score}: <strong>{scan.risk_score} / 100</strong> ({scan.verdict.toUpperCase()})
              </p>
              <time dateTime={scan.created_at} suppressHydrationWarning>
                {scan.created_at.slice(0, 10)}
              </time>
            </article>
          ))}
        </div>
      )}

      {activeTab === 'monitor' && (
        <div className="record-list">
          <div className="monitor-header">
            <h2>{t.monitored_domains}</h2>
            {canOperate && (
              <button className="button button-small" disabled={busy} onClick={handleSimulate}>
                {t.simulate_alert}
              </button>
            )}
          </div>
          {alerts.length === 0 && <p>{t.empty_monitor}</p>}
          {alerts.map((alert) => (
            <article className="tool-panel" key={alert.id}>
              <h3 className="break-value">{alert.detected_lookalike}</h3>
              <p>
                {t.source}: {alert.source} · {t.similarity}: {Math.round(alert.similarity_score * 100)}%
              </p>
              <p>
                {t.status}: <code>{alert.status}</code>
              </p>
              <time dateTime={alert.detected_at} suppressHydrationWarning>
                {alert.detected_at.slice(0, 10)}
              </time>
              <div className="tool-actions">
                <button
                  type="button"
                  className="button button-small button-outline"
                  onClick={() => {
                    setActiveTab('scan');
                    void triggerScan(`https://${alert.detected_lookalike}`);
                  }}
                >
                  {t.scan_tab}
                </button>
                {canOperate && (
                  <Link
                    className="button button-small"
                    href={`/${locale}/takedowns?domain=${encodeURIComponent(alert.detected_lookalike)}`}
                  >
                    {t.takedown_cta}
                  </Link>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
