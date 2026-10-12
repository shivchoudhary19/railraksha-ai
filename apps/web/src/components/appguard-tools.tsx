'use client';

import {useState, type FormEvent} from 'react';
import {
  appScanOutput,
  deviceCheckupOutput,
  type AppScanResult,
  type DeviceCheckupResult,
  type OfficialAppInfo,
} from '@railraksha/schemas';
import Link from 'next/link';

const labels = {
  en: {
    title: 'AppGuard · Fake Apps & Device Safety',
    scanner_tab: 'App & APK Scanner',
    checkup_tab: 'Safe Device Checkup',
    guide_tab: 'Official Apps & Station Wi-Fi',
    package_label: 'App Package Name or Google Play Store link',
    package_placeholder: 'e.g. cris.org.in.prs.ima or https://play.google.com/store/apps/details?id=...',
    check_package_button: 'Verify app authenticity',
    upload_apk_label: 'Upload APK file for static inspection (Max 150 MB)',
    upload_apk_button: 'Inspect APK file',
    scanning: 'Extracting manifest, checking certificates, and inspecting permissions…',
    error: 'Analysis failed. Please check input and try again.',
    risk_score: 'Calculated Risk Score',
    safe: 'Safe · Verified Official Application',
    suspicious: 'Suspicious · Unverified Railway Lure',
    dangerous: 'Dangerous · Fake App / Banking Trojan Threat',
    official_badge: 'Verified Official Railway App',
    unverified_badge: 'Unverified / Third-Party Lure',
    dangerous_permissions_title: 'Dangerous Permissions Detected',
    suspicious_indicators_title: 'Suspicious Characteristics & Indicators',
    safe_steps_title: 'Recommended Remediation Actions',
    report_cta: 'File a formal fraud report',
    device_title: 'Safe Device Checkup (7-Point Self-Assessment)',
    device_subtitle: 'Evaluate your mobile or laptop configuration against banking and railway fraud risks.',
    platform_label: 'Select Device Operating System',
    q_screen_lock: 'Screen lock configured with PIN, Password, or Biometrics?',
    q_sideloading: '"Install from Unknown Sources" disabled for browsers and messengers?',
    q_play_protect: 'Google Play Protect / App Store security verification active?',
    q_os_updated: 'System updates and monthly security patches up to date?',
    q_permissions: 'Sensitive permissions (SMS, Accessibility) reviewed and pruned?',
    q_remote_access: 'Device is free of unexpected screen-sharing tools (AnyDesk/TeamViewer)?',
    q_backup: 'Secure backup and Find-My-Device feature enabled?',
    evaluate_button: 'Calculate Device Safety Score',
    evaluating: 'Evaluating digital posture against railway threat landscape…',
    score_label: 'Device Safety Hygiene Score',
    optimal_status: 'Optimal Protection · Strong Device Hygiene',
    moderate_status: 'Moderate Risk · Improvements Needed',
    critical_status: 'Critical Exposure · Immediate Action Required',
    remediation_title: 'Required Fix-It Actions',
    official_apps_title: 'Verified Official Indian Railways Applications',
    official_apps_subtitle: 'Always download railway software strictly from these verified packages.',
    publisher: 'Publisher',
    package_name: 'Package ID',
    get_app: 'Google Play Store',
    wifi_title: 'Station Wi-Fi (RailWire) Public Safety Guide',
    wifi_tip_1_title: 'Verify Official Captive Portal',
    wifi_tip_1_desc: 'Authentic railway station Wi-Fi connects to RailWire. Never enter bank card details or OTPs to access station internet.',
    wifi_tip_2_title: 'Beware of "Evil-Twin" Hotspots',
    wifi_tip_2_desc: 'Criminals set up fake open hotspots named "Free_Station_WiFi" to sniff unencrypted traffic.',
    wifi_tip_3_title: 'Avoid Online Banking on Public Networks',
    wifi_tip_3_desc: 'Use cellular mobile data (4G/5G) instead of public station Wi-Fi for ticket booking or UPI transactions.',
  },
  hi: {
    title: 'AppGuard · जाली ऐप व डिवाइस सुरक्षा',
    scanner_tab: 'ऐप व APK स्कैनर',
    checkup_tab: 'डिवाइस सुरक्षा चेकअप',
    guide_tab: 'आधिकारिक ऐप्स व स्टेशन Wi-Fi',
    package_label: 'ऐप पैकेज नाम या Google Play Store लिंक',
    package_placeholder: 'उदा: cris.org.in.prs.ima या https://play.google.com/store/apps/details?id=...',
    check_package_button: 'ऐप की प्रामाणिकता जाँचें',
    upload_apk_label: 'स्थैतिक जाँच के लिए APK फ़ाइल अपलोड करें (अधिकतम 150 MB)',
    upload_apk_button: 'APK फ़ाइल का विश्लेषण करें',
    scanning: 'मैनिफ़ेस्ट, प्रमाणपत्र और अनुमतियों की जाँच जारी है…',
    error: 'विश्लेषण विफल रहा। कृपया पुनः प्रयास करें।',
    risk_score: 'जोखिम स्कोर',
    safe: 'सुरक्षित · सत्यापित आधिकारिक एप्लिकेशन',
    suspicious: 'संदिग्ध · गैर-सत्यापित रेलवे ऐप',
    dangerous: 'खतरनाक · जाली ऐप / बैंकिंग ट्रोजन ख़तरा',
    official_badge: 'सत्यापित आधिकारिक रेलवे ऐप',
    unverified_badge: 'गैर-सत्यापित / बाहरी ऐप',
    dangerous_permissions_title: 'संदिग्ध व ख़तरनाक अनुमतियाँ',
    suspicious_indicators_title: 'संदिग्ध लक्षण व पहचान',
    safe_steps_title: 'सुरक्षा के लिए आवश्यक कदम',
    report_cta: 'धोखाधड़ी की औपचारिक रिपोर्ट दर्ज करें',
    device_title: 'डिवाइस सुरक्षा चेकअप (7-सूत्रीय स्व-मूल्यांकन)',
    device_subtitle: 'बैंकिंग और रेलवे धोखाधड़ी के ख़तरों के विरुद्ध अपने फ़ोन की सुरक्षा सेटिंग्स जाँचें।',
    platform_label: 'ऑपरेटिंग सिस्टम चुनें',
    q_screen_lock: 'स्क्रीन लॉक (पिन, पासवर्ड या फ़िंगरप्रिंट) सक्षम है?',
    q_sideloading: 'ब्राउज़र और चैट ऐप्स के लिए "अज्ञात स्रोत से इंस्टॉल" बंद है?',
    q_play_protect: 'Google Play Protect / ऐप सुरक्षा सत्यापन सक्रिय है?',
    q_os_updated: 'सिस्टम और सुरक्षा अपडेट नवीनतम संस्करण पर हैं?',
    q_permissions: 'संवेदनशील अनुमतियाँ (SMS, एक्सेसिबिलिटी) जाँची गई हैं?',
    q_remote_access: 'डिवाइस में कोई अवांछित स्क्रीन-शेयरिंग ऐप (AnyDesk/TeamViewer) नहीं है?',
    q_backup: 'फ़ाइंड-माय-डिवाइस और बैकअप सुविधा चालू है?',
    evaluate_button: 'डिवाइस सुरक्षा स्कोर की गणना करें',
    evaluating: 'सुरक्षा मानकों के आधार पर डिवाइस की जाँच की जा रही है…',
    score_label: 'डिवाइस सुरक्षा स्कोर',
    optimal_status: 'उत्कृष्ट सुरक्षा · मजबूत डिवाइस स्थिति',
    moderate_status: 'मध्यम जोखिम · सुधार की आवश्यकता',
    critical_status: 'गंभीर जोखिम · तत्काल कार्रवाई आवश्यक',
    remediation_title: 'ज़रूरी सुधार कदम',
    official_apps_title: 'भारतीय रेलवे के सत्यापित आधिकारिक ऐप्स',
    official_apps_subtitle: 'हमेशा केवल इन सत्यापित पैकेजों से ही ऐप डाउनलोड करें।',
    publisher: 'प्रकाशक',
    package_name: 'पैकेज पहचान',
    get_app: 'Google Play Store',
    wifi_title: 'रेलवे स्टेशन Wi-Fi (RailWire) सुरक्षा मार्गदर्शिका',
    wifi_tip_1_title: 'आधिकारिक पोर्टल की पुष्टि करें',
    wifi_tip_1_desc: 'स्टेशन इंटरनेट केवल आधिकारिक RailWire पोर्टल से जुड़ता है। इंटरनेट चलाने के लिए कभी बैंक विवरण न दें।',
    wifi_tip_2_title: 'जाली "Evil-Twin" हॉटस्पॉट से बचें',
    wifi_tip_2_desc: 'धोखेबाज "Free_Railway_WiFi" नाम से नकली हॉटस्पॉट बनाकर डेटा चुराने का प्रयास करते हैं।',
    wifi_tip_3_title: 'सार्वजनिक Wi-Fi पर बैंकिंग से बचें',
    wifi_tip_3_desc: 'टिकट बुक करने या UPI भुगतान के लिए स्टेशन Wi-Fi के बजाय अपने मोबाइल डेटा (4G/5G) का उपयोग करें।',
  },
};

export function AppGuardTools({
  locale,
  csrf,
  initialOfficialApps = [],
}: {
  locale: 'en' | 'hi';
  csrf: string;
  initialOfficialApps?: OfficialAppInfo[];
}) {
  const t = labels[locale];
  const [activeTab, setActiveTab] = useState<'scanner' | 'checkup' | 'guide'>('scanner');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [scanResult, setScanResult] = useState<AppScanResult | null>(null);
  const [deviceResult, setDeviceResult] = useState<DeviceCheckupResult | null>(null);
  const [officialApps] = useState<OfficialAppInfo[]>(initialOfficialApps);

  async function request(path: string, body?: object | FormData) {
    const isFormData = body instanceof FormData;
    const response = await fetch(`/api/tools/${path}`, {
      method: body ? 'POST' : 'GET',
      headers: {
        'x-csrf-token': csrf,
        ...(isFormData ? {} : {'Content-Type': 'application/json'}),
      },
      body: isFormData ? body : body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || t.error);
    }
    return response.json();
  }

  async function handleCheckPackage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(event.currentTarget);
    const identifier = String(form.get('identifier') ?? '').trim();
    try {
      const res = appScanOutput.parse(await request('appguard/check-package', {identifier}));
      setScanResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.error);
    } finally {
      setBusy(false);
    }
  }

  async function handleScanApk(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(event.currentTarget);
    const file = form.get('file');
    if (!file || !(file instanceof File) || file.size === 0) {
      setError('Please choose an APK file.');
      setBusy(false);
      return;
    }
    try {
      const res = appScanOutput.parse(await request('appguard/scan-apk', form));
      setScanResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.error);
    } finally {
      setBusy(false);
    }
  }

  async function handleDeviceCheckup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(event.currentTarget);
    const platform = (String(form.get('platform') ?? 'android') as 'android' | 'ios' | 'windows' | 'macos');
    const screen_lock = form.get('screen_lock') === 'yes';
    const sideloading_disabled = form.get('sideloading_disabled') === 'yes';
    const play_protect_active = form.get('play_protect_active') === 'yes';
    const os_updated = form.get('os_updated') === 'yes';
    const dangerous_permissions_checked = form.get('dangerous_permissions_checked') === 'yes';
    const remote_access_absent = form.get('remote_access_absent') === 'yes';
    const backup_enabled = form.get('backup_enabled') === 'yes';

    try {
      const res = deviceCheckupOutput.parse(
        await request('appguard/device-checkup', {
          platform,
          screen_lock,
          sideloading_disabled,
          play_protect_active,
          os_updated,
          dangerous_permissions_checked,
          remote_access_absent,
          backup_enabled,
        })
      );
      setDeviceResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <nav className="tool-tabs" aria-label="AppGuard Modes">
        <button
          type="button"
          className="button button-small"
          aria-current={activeTab === 'scanner' ? 'page' : undefined}
          onClick={() => setActiveTab('scanner')}
        >
          {t.scanner_tab}
        </button>
        <button
          type="button"
          className="button button-small"
          aria-current={activeTab === 'checkup' ? 'page' : undefined}
          onClick={() => setActiveTab('checkup')}
        >
          {t.checkup_tab}
        </button>
        <button
          type="button"
          className="button button-small button-outline"
          aria-current={activeTab === 'guide' ? 'page' : undefined}
          onClick={() => setActiveTab('guide')}
        >
          {t.guide_tab}
        </button>
      </nav>

      <div className="tool-feedback" aria-live="polite" aria-atomic="true">
        {busy && <p>{activeTab === 'checkup' ? t.evaluating : t.scanning}</p>}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </div>

      {activeTab === 'scanner' && (
        <div className="tool-grid">
          <div>
            <form className="tool-panel" onSubmit={handleCheckPackage}>
              <h2>{t.title}</h2>
              <label htmlFor="app-identifier">{t.package_label}</label>
              <input
                id="app-identifier"
                name="identifier"
                required
                maxLength={500}
                placeholder={t.package_placeholder}
                autoComplete="off"
              />
              <button className="button" disabled={busy}>
                {t.check_package_button}
              </button>
            </form>

            <form className="tool-panel" onSubmit={handleScanApk}>
              <h2>{t.upload_apk_label}</h2>
              <label htmlFor="apk-file">{t.upload_apk_label}</label>
              <input
                id="apk-file"
                name="file"
                type="file"
                accept=".apk"
                required
              />
              <button className="button" disabled={busy}>
                {t.upload_apk_button}
              </button>
            </form>
          </div>

          {scanResult && (
            <section
              className={`tool-panel verdict verdict-${scanResult.verdict === 'dangerous' ? 'known_scam' : scanResult.verdict === 'safe' ? 'official' : 'unknown'}`}
              aria-live="polite"
            >
              <h2>
                {scanResult.verdict === 'dangerous'
                  ? t.dangerous
                  : scanResult.verdict === 'suspicious'
                    ? t.suspicious
                    : t.safe}
              </h2>

              <p>
                <strong>{t.risk_score}:</strong> {scanResult.risk_score}/100
              </p>
              <p>
                <strong>App Name:</strong> {scanResult.app_name}
              </p>
              <p>
                <strong>Package ID:</strong> <code className="break-value">{scanResult.package_name}</code>
              </p>

              <div className={scanResult.is_official_match ? 'alert alert-success' : 'alert alert-danger'}>
                <strong>{scanResult.is_official_match ? t.official_badge : t.unverified_badge}</strong>
              </div>

              <p>{locale === 'hi' ? scanResult.explanation_hi : scanResult.explanation_en}</p>

              {scanResult.dangerous_permissions.length > 0 && (
                <div>
                  <h3>{t.dangerous_permissions_title}</h3>
                  <ul className="factor-list">
                    {scanResult.dangerous_permissions.map((p, idx) => (
                      <li key={idx} className="factor-item">
                        <strong>[{p.severity.toUpperCase()}] {locale === 'hi' ? p.title_hi : p.title_en}:</strong>{' '}
                        <span>{locale === 'hi' ? p.reason_hi : p.reason_en}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {scanResult.suspicious_indicators.length > 0 && (
                <div>
                  <h3>{t.suspicious_indicators_title}</h3>
                  <ul className="factor-list">
                    {scanResult.suspicious_indicators.map((ind, idx) => (
                      <li key={idx} className="factor-item">
                        <strong>[{ind.severity.toUpperCase()}] {locale === 'hi' ? ind.title_hi : ind.title_en}:</strong>{' '}
                        <span>{locale === 'hi' ? ind.detail_hi : ind.detail_en}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {scanResult.safe_steps_en.length > 0 && (
                <div>
                  <h3>{t.safe_steps_title}</h3>
                  <ol className="factor-list">
                    {(locale === 'hi' ? scanResult.safe_steps_hi : scanResult.safe_steps_en).map((step, idx) => (
                      <li key={idx} className="factor-item">
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {scanResult.verdict === 'dangerous' && (
                <div className="status-actions">
                  <Link href={`/${locale}/reports`} className="button button-small">
                    {t.report_cta}
                  </Link>
                </div>
              )}
            </section>
          )}
        </div>
      )}

      {activeTab === 'checkup' && (
        <div className="tool-grid">
          <form className="tool-panel" onSubmit={handleDeviceCheckup}>
            <h2>{t.device_title}</h2>
            <p>{t.device_subtitle}</p>

            <label htmlFor="platform">{t.platform_label}</label>
            <select id="platform" name="platform" defaultValue="android">
              <option value="android">Android Phone / Tablet</option>
              <option value="ios">Apple iPhone / iPad (iOS)</option>
              <option value="windows">Windows PC / Laptop</option>
              <option value="macos">Apple Mac (macOS)</option>
            </select>

            <label htmlFor="screen_lock">{t.q_screen_lock}</label>
            <select id="screen_lock" name="screen_lock" defaultValue="yes">
              <option value="yes">Yes · Protected with PIN / Biometrics</option>
              <option value="no">No · Swipe only or none</option>
            </select>

            <label htmlFor="sideloading_disabled">{t.q_sideloading}</label>
            <select id="sideloading_disabled" name="sideloading_disabled" defaultValue="yes">
              <option value="yes">Yes · Sideloading is turned off</option>
              <option value="no">No · Allowed or unsure</option>
            </select>

            <label htmlFor="play_protect_active">{t.q_play_protect}</label>
            <select id="play_protect_active" name="play_protect_active" defaultValue="yes">
              <option value="yes">Yes · Active and scanning</option>
              <option value="no">No · Disabled or warning shown</option>
            </select>

            <label htmlFor="os_updated">{t.q_os_updated}</label>
            <select id="os_updated" name="os_updated" defaultValue="yes">
              <option value="yes">Yes · Updated to latest release</option>
              <option value="no">No · Pending updates available</option>
            </select>

            <label htmlFor="dangerous_permissions_checked">{t.q_permissions}</label>
            <select id="dangerous_permissions_checked" name="dangerous_permissions_checked" defaultValue="yes">
              <option value="yes">Yes · Only trustworthy apps have access</option>
              <option value="no">No · Not reviewed recently</option>
            </select>

            <label htmlFor="remote_access_absent">{t.q_remote_access}</label>
            <select id="remote_access_absent" name="remote_access_absent" defaultValue="yes">
              <option value="yes">Yes · No remote tools installed</option>
              <option value="no">No · Installed for support call</option>
            </select>

            <label htmlFor="backup_enabled">{t.q_backup}</label>
            <select id="backup_enabled" name="backup_enabled" defaultValue="yes">
              <option value="yes">Yes · Enabled</option>
              <option value="no">No · Disabled</option>
            </select>

            <button className="button" disabled={busy}>
              {t.evaluate_button}
            </button>
          </form>

          {deviceResult && (
            <section
              className={`tool-panel verdict verdict-${deviceResult.status === 'optimal' ? 'official' : deviceResult.status === 'moderate_risk' ? 'unknown' : 'known_scam'}`}
              aria-live="polite"
            >
              <h2>
                {deviceResult.status === 'optimal'
                  ? t.optimal_status
                  : deviceResult.status === 'moderate_risk'
                    ? t.moderate_status
                    : t.critical_status}
              </h2>

              <p>
                <strong>{t.score_label}:</strong> {deviceResult.safety_score}/100
              </p>

              <p>{locale === 'hi' ? deviceResult.summary_hi : deviceResult.summary_en}</p>

              {deviceResult.remediation_steps.length > 0 && (
                <div>
                  <h3>{t.remediation_title}</h3>
                  <div className="factor-list">
                    {deviceResult.remediation_steps.map((step) => (
                      <div key={step.order} className="factor-item">
                        <strong>
                          Step {step.order} [{step.severity.toUpperCase()}]:{' '}
                          {locale === 'hi' ? step.title_hi : step.title_en}
                        </strong>
                        <p>{locale === 'hi' ? step.action_hi : step.action_en}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      )}

      {activeTab === 'guide' && (
        <div>
          <div className="tool-panel">
            <h2>{t.official_apps_title}</h2>
            <p>{t.official_apps_subtitle}</p>
          </div>

          <div className="tool-grid">
            {officialApps.map((app) => (
              <div key={app.package_name} className="tool-panel verdict-official">
                <h3>{app.name}</h3>
                <p>
                  <strong>{t.publisher}:</strong> {app.publisher}
                </p>
                <p>
                  <strong>{t.package_name}:</strong> <code className="break-value">{app.package_name}</code>
                </p>
                <div className="tool-actions">
                  <a
                    href={app.play_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="button button-small"
                  >
                    {t.get_app}
                  </a>
                </div>
              </div>
            ))}
          </div>

          <div className="tool-panel record-list">
            <h2>{t.wifi_title}</h2>
            <div className="factor-item">
              <strong>1. {t.wifi_tip_1_title}</strong>
              <p>{t.wifi_tip_1_desc}</p>
            </div>
            <div className="factor-item">
              <strong>2. {t.wifi_tip_2_title}</strong>
              <p>{t.wifi_tip_2_desc}</p>
            </div>
            <div className="factor-item">
              <strong>3. {t.wifi_tip_3_title}</strong>
              <p>{t.wifi_tip_3_desc}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
