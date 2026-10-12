'use client';

import {useState, type FormEvent} from 'react';
import {
  scamLensOutput,
  emailAnalysisOutput,
  type ScamLensAnalysis,
  type EmailAnalysis,
  type EmergencyStep,
} from '@railraksha/schemas';
import Link from 'next/link';

const labels = {
  en: {
    title: 'ScamLens · Message & Lure Analyzer',
    message_tab: 'Analyze Message / SMS',
    email_tab: 'Email Header Check',
    emergency_tab: 'I Already Paid / Clicked (1930)',
    message_label: 'Suspicious SMS, WhatsApp text, QR prompt, or lottery lure',
    message_placeholder: 'Paste the message here (e.g. Dear passenger, your ticket refund is pending. Click here to update UPI PIN immediately...)',
    save_report_label: 'Save anonymized report to citizen fraud database',
    analyze_button: 'Analyze message',
    analyzing: 'Extracting indicators, cross-checking registry and scanning fraud patterns…',
    error: 'Analysis failed. Please check the text and try again.',
    risk_score: 'Calculated Risk Score',
    category: 'Detected Scam Category',
    safe: 'Safe · No Fraud Indicators Found',
    suspicious: 'Suspicious · Exercise Caution',
    dangerous: 'Dangerous · Fraud / Phishing Threat',
    red_flags: 'Detected Red Flags & Deceptive Tactics',
    entities_found: 'Extracted Identifiers & Entities',
    extracted_urls: 'Embedded links',
    extracted_phones: 'Contact numbers',
    extracted_upis: 'UPI payment addresses',
    ai_hint: 'Formulaic AI-generated structure and artificial politeness detected.',
    recommended_steps: 'Safe Next Steps',
    report_cta: 'File a formal citizen scam report',
    email_title: 'Email Authenticity & Header Inspection',
    from_label: 'From header (Sender display name and address)',
    from_placeholder: 'IRCTC Support <helpdesk@irctc-refundportal.xyz>',
    reply_to_label: 'Reply-To header (Optional)',
    reply_to_placeholder: 'refunds@external-server.com',
    subject_label: 'Email Subject',
    subject_placeholder: 'Urgent: Ticket Cancellation Refund Confirmation',
    body_label: 'Email Body snippet',
    body_placeholder: 'Paste email body content here…',
    spf_label: 'SPF Verification',
    dkim_label: 'DKIM Verification',
    dmarc_label: 'DMARC Verification',
    analyze_email_button: 'Inspect email headers',
    inspecting_email: 'Verifying SPF/DKIM/DMARC and cross-checking sender domain…',
    spoofed_warning: 'Sender Display Name Spoofing Detected: Sender impersonates Railway administration without official domain authority.',
    mismatch_warning: 'Reply-To Diversion Detected: Replies will be sent to a different address than the sender.',
    auth_failures_title: 'Authentication Failures',
    emergency_title: 'Emergency "Golden Hour" Protocol (Helpline 1930)',
    emergency_subtitle: 'If you already shared an OTP, entered your UPI PIN, or sent money to a fraudster, take these immediate steps.',
    action_required: 'Immediate Action Required',
    urgent_tag: 'URGENT',
    advisory_tag: 'ADVISORY',
    call_cta: 'Call Helpline',
    open_link: 'Open Portal',
  },
  hi: {
    title: 'ScamLens · संदेश व झांसा विश्लेषक',
    message_tab: 'संदेश / SMS की जाँच',
    email_tab: 'ईमेल हेडर विश्लेषण',
    emergency_tab: 'पैसे कट गए या लिंक क्लिक हुआ? (1930)',
    message_label: 'संदिग्ध SMS, WhatsApp संदेश, QR कोड या रिफंड झांसा',
    message_placeholder: 'संदेश यहाँ पेस्ट करें (उदा: प्रिय यात्री, आपका टिकट रिफंड लंबित है। तुरंत UPI पिन डालकर क्लेम करें...)',
    save_report_label: 'इस रिपोर्ट को अनाम रूप से धोखाधड़ी डेटाबेस में सुरक्षित करें',
    analyze_button: 'संदेश का विश्लेषण करें',
    analyzing: 'संदेश के संकेतकों और धोखाधड़ी पैटर्न की जाँच जारी है…',
    error: 'विश्लेषण विफल रहा। कृपया पाठ जाँचकर पुनः प्रयास करें।',
    risk_score: 'जोखिम स्कोर',
    category: 'धोखाधड़ी श्रेणी',
    safe: 'सुरक्षित · कोई धोखाधड़ी संकेत नहीं',
    suspicious: 'संदिग्ध · अत्यधिक सावधानी बरतें',
    dangerous: 'खतरनाक · धोखाधड़ी / फ़िशिंग का ख़तरा',
    red_flags: 'संदेश में मिले भ्रामक संकेत व ख़तरे',
    entities_found: 'संदेश में पाए गए संपर्क व पते',
    extracted_urls: 'संदेश में दिए गए लिंक',
    extracted_phones: 'फ़ोन नंबर',
    extracted_upis: 'UPI भुगतान पते',
    ai_hint: 'संदेश में कृत्रिम बुद्धिमत्ता (AI) द्वारा तैयार की गई बनावटी भाषा के लक्षण हैं।',
    recommended_steps: 'सुरक्षा के लिए आवश्यक कदम',
    report_cta: 'नागरिक धोखाधड़ी रिपोर्ट दर्ज करें',
    email_title: 'ईमेल हेडर व प्रामाणिकता जाँच',
    from_label: 'From हेडर (प्रेषक का नाम व ईमेल पता)',
    from_placeholder: 'IRCTC Support <helpdesk@irctc-refundportal.xyz>',
    reply_to_label: 'Reply-To हेडर (वैकल्पिक)',
    reply_to_placeholder: 'refunds@external-server.com',
    subject_label: 'ईमेल विषय (Subject)',
    subject_placeholder: 'अति आवश्यक: टिकट निरस्तीकरण रिफंड सूचना',
    body_label: 'ईमेल का मुख्य भाग (Body)',
    body_placeholder: 'ईमेल का पाठ यहाँ पेस्ट करें…',
    spf_label: 'SPF प्रमाणीकरण',
    dkim_label: 'DKIM प्रमाणीकरण',
    dmarc_label: 'DMARC प्रमाणीकरण',
    analyze_email_button: 'ईमेल हेडर की जाँच करें',
    inspecting_email: 'SPF/DKIM/DMARC और डोमेन की प्रामाणिकता जाँची जा रही है…',
    spoofed_warning: 'जाली प्रेषक नाम चेतावनी: ईमेल प्रेषक रेलवे का नाम उपयोग कर रहा है लेकिन अधिकृत डोमेन नहीं है।',
    mismatch_warning: 'Reply-To विसंगति: इस ईमेल का उत्तर किसी अन्य पते पर भेजा जा रहा है।',
    auth_failures_title: 'प्रमाणीकरण विफलताएं',
    emergency_title: 'गोल्डन ऑवर आपातकालीन प्रोटोकॉल (हेल्पलाइन 1930)',
    emergency_subtitle: 'यदि आपने OTP साझा कर दिया है, UPI पिन दर्ज कर दिया है या पैसे भेज दिए हैं, तो तुरंत ये कदम उठाएं।',
    action_required: 'तत्काल कार्रवाई आवश्यक',
    urgent_tag: 'अति आवश्यक',
    advisory_tag: 'सलाह',
    call_cta: 'हेल्पलाइन पर कॉल करें',
    open_link: 'पोर्टल खोलें',
  },
};

export function ScamLensTools({
  locale,
  csrf,
  initialEmergencySteps = [],
}: {
  locale: 'en' | 'hi';
  csrf: string;
  initialEmergencySteps?: EmergencyStep[];
}) {
  const t = labels[locale];
  const [activeTab, setActiveTab] = useState<'message' | 'email' | 'emergency'>('message');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [messageResult, setMessageResult] = useState<ScamLensAnalysis | null>(null);
  const [emailResult, setEmailResult] = useState<EmailAnalysis | null>(null);
  const [emergencySteps, setEmergencySteps] = useState<EmergencyStep[]>(initialEmergencySteps);

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

  async function handleAnalyzeMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(event.currentTarget);
    const text = String(form.get('text') ?? '').trim();
    const saveReport = form.get('save_report') === 'on';

    try {
      const res = scamLensOutput.parse(
        await request('scamlens/analyze', {
          text,
          save_report: saveReport,
        })
      );
      setMessageResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.error);
    } finally {
      setBusy(false);
    }
  }

  async function handleAnalyzeEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(event.currentTarget);
    const from_header = String(form.get('from_header') ?? '').trim();
    const reply_to = String(form.get('reply_to') ?? '').trim() || null;
    const subject = String(form.get('subject') ?? '').trim();
    const body = String(form.get('body') ?? '').trim();
    const spf_result = (String(form.get('spf_result') ?? 'none') as 'pass' | 'fail' | 'softfail' | 'none') || null;
    const dkim_result = (String(form.get('dkim_result') ?? 'none') as 'pass' | 'fail' | 'none') || null;
    const dmarc_result = (String(form.get('dmarc_result') ?? 'none') as 'pass' | 'fail' | 'none') || null;

    try {
      const res = emailAnalysisOutput.parse(
        await request('scamlens/analyze-email', {
          from_header,
          reply_to,
          subject,
          body,
          spf_result,
          dkim_result,
          dmarc_result,
        })
      );
      setEmailResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.error);
    } finally {
      setBusy(false);
    }
  }

  async function loadEmergencySteps() {
    setActiveTab('emergency');
    if (emergencySteps.length > 0) return;
    setBusy(true);
    setError('');
    try {
      const data = await request('scamlens/emergency-checklist');
      if (Array.isArray(data)) {
        setEmergencySteps(data);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <nav className="tool-tabs" aria-label="ScamLens Modes">
        <button
          type="button"
          className="button button-small"
          aria-current={activeTab === 'message' ? 'page' : undefined}
          onClick={() => setActiveTab('message')}
        >
          {t.message_tab}
        </button>
        <button
          type="button"
          className="button button-small"
          aria-current={activeTab === 'email' ? 'page' : undefined}
          onClick={() => setActiveTab('email')}
        >
          {t.email_tab}
        </button>
        <button
          type="button"
          className="button button-small button-outline"
          aria-current={activeTab === 'emergency' ? 'page' : undefined}
          onClick={() => void loadEmergencySteps()}
        >
          {t.emergency_tab}
        </button>
      </nav>

      <div className="tool-feedback" aria-live="polite" aria-atomic="true">
        {busy && <p>{activeTab === 'email' ? t.inspecting_email : t.analyzing}</p>}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </div>

      {activeTab === 'message' && (
        <div className="tool-grid">
          <form className="tool-panel" onSubmit={handleAnalyzeMessage}>
            <h2>{t.title}</h2>
            <label htmlFor="scam-text">{t.message_label}</label>
            <textarea
              id="scam-text"
              name="text"
              required
              rows={6}
              minLength={5}
              maxLength={10000}
              placeholder={t.message_placeholder}
            />

            <label className="check-label">
              <input type="checkbox" name="save_report" />
              <span>{t.save_report_label}</span>
            </label>

            <button className="button" disabled={busy}>
              {t.analyze_button}
            </button>
          </form>

          {messageResult && (
            <section
              className={`tool-panel verdict verdict-${messageResult.verdict === 'dangerous' ? 'known_scam' : messageResult.verdict === 'safe' ? 'official' : 'unknown'}`}
              aria-live="polite"
            >
              <h2>
                {messageResult.verdict === 'dangerous'
                  ? t.dangerous
                  : messageResult.verdict === 'suspicious'
                    ? t.suspicious
                    : t.safe}
              </h2>

              <p>
                <strong>{t.risk_score}:</strong> {messageResult.risk_score}/100
              </p>
              <p>
                <strong>{t.category}:</strong>{' '}
                {locale === 'hi' ? messageResult.category_title_hi : messageResult.category_title_en}
              </p>

              <p>{locale === 'hi' ? messageResult.explanation_hi : messageResult.explanation_en}</p>

              {messageResult.ai_generated_hint && (
                <div className="alert alert-danger" role="note">
                  <span>{t.ai_hint}</span>
                </div>
              )}

              {messageResult.red_flags.length > 0 && (
                <div>
                  <h3>{t.red_flags}</h3>
                  <ul className="factor-list">
                    {messageResult.red_flags.map((flag, idx) => (
                      <li key={idx} className="factor-item">
                        <strong>[{flag.severity.toUpperCase()}] {flag.snippet}:</strong>{' '}
                        <span>{locale === 'hi' ? flag.reason_hi : flag.reason_en}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(messageResult.entities.urls.length > 0 ||
                messageResult.entities.phones.length > 0 ||
                messageResult.entities.upis.length > 0) && (
                <div>
                  <h3>{t.entities_found}</h3>
                  {messageResult.entities.urls.length > 0 && (
                    <p>
                      <strong>{t.extracted_urls}:</strong>{' '}
                      <code className="break-value">{messageResult.entities.urls.join(', ')}</code>
                    </p>
                  )}
                  {messageResult.entities.phones.length > 0 && (
                    <p>
                      <strong>{t.extracted_phones}:</strong>{' '}
                      <code className="break-value">{messageResult.entities.phones.join(', ')}</code>
                    </p>
                  )}
                  {messageResult.entities.upis.length > 0 && (
                    <p>
                      <strong>{t.extracted_upis}:</strong>{' '}
                      <code className="break-value">{messageResult.entities.upis.join(', ')}</code>
                    </p>
                  )}
                </div>
              )}

              {messageResult.safe_steps_en.length > 0 && (
                <div>
                  <h3>{t.recommended_steps}</h3>
                  <ol className="factor-list">
                    {(locale === 'hi' ? messageResult.safe_steps_hi : messageResult.safe_steps_en).map((step, idx) => (
                      <li key={idx} className="factor-item">
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {messageResult.verdict === 'dangerous' && (
                <div className="status-actions">
                  <Link href={`/${locale}/reports`} className="button button-small">
                    {t.report_cta}
                  </Link>
                  <button
                    type="button"
                    className="button button-small button-outline"
                    onClick={() => void loadEmergencySteps()}
                  >
                    {t.emergency_tab}
                  </button>
                </div>
              )}
            </section>
          )}
        </div>
      )}

      {activeTab === 'email' && (
        <div className="tool-grid">
          <form className="tool-panel" onSubmit={handleAnalyzeEmail}>
            <h2>{t.email_title}</h2>
            <label htmlFor="from_header">{t.from_label}</label>
            <input
              id="from_header"
              name="from_header"
              required
              minLength={3}
              maxLength={255}
              placeholder={t.from_placeholder}
            />

            <label htmlFor="reply_to">{t.reply_to_label}</label>
            <input
              id="reply_to"
              name="reply_to"
              maxLength={255}
              placeholder={t.reply_to_placeholder}
            />

            <label htmlFor="subject">{t.subject_label}</label>
            <input
              id="subject"
              name="subject"
              required
              minLength={1}
              maxLength={500}
              placeholder={t.subject_placeholder}
            />

            <label htmlFor="body">{t.body_label}</label>
            <textarea
              id="body"
              name="body"
              required
              rows={4}
              minLength={5}
              maxLength={20000}
              placeholder={t.body_placeholder}
            />

            <label htmlFor="spf_result">{t.spf_label}</label>
            <select id="spf_result" name="spf_result" defaultValue="fail">
              <option value="pass">Pass</option>
              <option value="fail">Fail</option>
              <option value="softfail">Softfail</option>
              <option value="none">None</option>
            </select>

            <label htmlFor="dkim_result">{t.dkim_label}</label>
            <select id="dkim_result" name="dkim_result" defaultValue="fail">
              <option value="pass">Pass</option>
              <option value="fail">Fail</option>
              <option value="none">None</option>
            </select>

            <label htmlFor="dmarc_result">{t.dmarc_label}</label>
            <select id="dmarc_result" name="dmarc_result" defaultValue="fail">
              <option value="pass">Pass</option>
              <option value="fail">Fail</option>
              <option value="none">None</option>
            </select>

            <button className="button" disabled={busy}>
              {t.analyze_email_button}
            </button>
          </form>

          {emailResult && (
            <section
              className={`tool-panel verdict verdict-${emailResult.verdict === 'dangerous' ? 'known_scam' : emailResult.verdict === 'safe' ? 'official' : 'unknown'}`}
              aria-live="polite"
            >
              <h2>
                {emailResult.verdict === 'dangerous'
                  ? t.dangerous
                  : emailResult.verdict === 'suspicious'
                    ? t.suspicious
                    : t.safe}
              </h2>

              <p>
                <strong>{t.risk_score}:</strong> {emailResult.risk_score}/100
              </p>

              <p>{locale === 'hi' ? emailResult.explanation_hi : emailResult.explanation_en}</p>

              {emailResult.display_name_spoofed && (
                <div className="alert alert-danger" role="alert">
                  <strong>{t.spoofed_warning}</strong>
                </div>
              )}

              {emailResult.domain_mismatch && (
                <div className="alert alert-danger" role="alert">
                  <strong>{t.mismatch_warning}</strong>
                </div>
              )}

              {emailResult.auth_failures.length > 0 && (
                <div>
                  <h3>{t.auth_failures_title}</h3>
                  <ul className="factor-list">
                    {emailResult.auth_failures.map((f, i) => (
                      <li key={i} className="factor-item">
                        <code>{f}</code>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {emailResult.red_flags.length > 0 && (
                <div>
                  <h3>{t.red_flags}</h3>
                  <ul className="factor-list">
                    {emailResult.red_flags.map((flag, idx) => (
                      <li key={idx} className="factor-item">
                        <strong>[{flag.severity.toUpperCase()}] {flag.snippet}:</strong>{' '}
                        <span>{locale === 'hi' ? flag.reason_hi : flag.reason_en}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}
        </div>
      )}

      {activeTab === 'emergency' && (
        <div>
          <div className="tool-panel">
            <h2>{t.emergency_title}</h2>
            <p>{t.emergency_subtitle}</p>
          </div>

          <div className="tool-grid">
            {emergencySteps.map((step) => (
              <div key={step.order} className={`tool-panel ${step.urgent ? 'verdict-known_scam' : ''}`}>
                <div className="monitor-header">
                  <span className="eyebrow">
                    STEP {step.order} · {step.urgent ? t.urgent_tag : t.advisory_tag}
                  </span>
                  {step.contact && step.contact === '1930' ? (
                    <a href="tel:1930" className="button button-small">
                      {t.call_cta} 1930
                    </a>
                  ) : step.contact ? (
                    <a
                      href={step.contact}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="button button-small button-outline"
                    >
                      {t.open_link}
                    </a>
                  ) : null}
                </div>
                <h3>{locale === 'hi' ? step.title_hi : step.title_en}</h3>
                <p>{locale === 'hi' ? step.action_hi : step.action_en}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
