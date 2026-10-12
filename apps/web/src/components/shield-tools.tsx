'use client';

import {useState, type FormEvent} from 'react';
import Link from 'next/link';

interface ShieldProps {
  csrfToken: string;
  initialLocale: 'en' | 'hi';
}

interface ThreatListStats {
  version: number;
  total_blocked_prefixes: number;
  total_official_prefixes: number;
  active: boolean;
}

interface ThreatListFeed {
  version: number;
  algorithm: string;
  public_key: string;
  timestamp: string;
  blocked_prefixes: string[];
  official_prefixes: string[];
  sha256_checksum: string;
  signature: string;
}

interface DomainSimulationResult {
  domain: string;
  prefix: string;
  fullHash: string;
  verdict: 'official' | 'blocked' | 'unknown';
  matchedName?: string;
}

const labels = {
  en: {
    title: 'RailRaksha Shield · Real-Time Threat Defense',
    ext_tab: 'Browser Extension',
    feed_tab: 'Cryptographic Threat Feed',
    pwa_tab: 'Mobile PWA & Share Target',
    download_ext_btn: 'Download Shield Extension (.zip)',
    download_desc: 'Packaged Manifest V3 extension ready for Chrome, Edge, Brave, and Firefox.',
    install_guide_title: 'Quick Installation Guide',
    step1: 'Download and unzip the railraksha-shield.zip file on your computer.',
    step2: 'Open your browser extensions manager (chrome://extensions or edge://extensions).',
    step3: 'Enable "Developer mode" in the top right corner.',
    step4: 'Click "Load unpacked" and select the unzipped extension directory.',
    step5: 'Pin RailRaksha Shield to your browser toolbar for real-time protection.',
    feature1_title: 'Zero-History Privacy',
    feature1_desc: 'Only 4-byte SHA256 prefix hashes are evaluated locally. Your complete browsing history never leaves your device.',
    feature2_title: 'Deceptive Credential Shield',
    feature2_desc: 'Instantly injects high-priority alerts on unofficial sites asking for PNR, OTPs, or UPI PINs with railway branding.',
    feature3_title: 'Ed25519 Cryptographic Signatures',
    feature3_desc: 'Threat deltas are digitally signed by RailRaksha authority, preventing malicious cache injection.',
    sim_title: 'Test Shield Matching Simulator',
    sim_subtitle: 'Enter any domain to simulate how the Shield extension computes 4-byte prefixes and detects threats locally.',
    sim_label: 'Domain or URL to simulate',
    sim_placeholder: 'e.g. irctc-fast-tatkal.xyz or irctc.co.in',
    sim_button: 'Simulate Shield Check',
    simulating: 'Computing SHA-256 and evaluating prefixes…',
    feed_title: 'Live Signed Threat Feed & Delta',
    feed_subtitle: 'Inspect the cryptographic integrity and versioning of the decentralized threat distribution stream.',
    fetch_feed_btn: 'Fetch Live Signed Feed',
    fetching_feed: 'Contacting RailRaksha Authority…',
    feed_version: 'Feed Version',
    feed_algo: 'Signature Algorithm',
    feed_public_key: 'Ed25519 Public Key',
    feed_checksum: 'SHA-256 Checksum',
    feed_signature: 'Ed25519 Signature',
    feed_blocked_count: 'Active Blocked Prefixes',
    feed_official_count: 'Verified Official Prefixes',
    sample_prefixes: 'Sample Blocked Prefixes (4-byte hex):',
    pwa_title: 'Mobile PWA & Web Share Target',
    pwa_subtitle: 'Install RailRaksha on your smartphone and share suspicious SMS, WhatsApp forwards, or links directly.',
    pwa_step1_title: 'Add to Home Screen',
    pwa_step1_desc: 'Open RailRaksha in Chrome or Safari on your phone, tap the menu (⋮ or Share) and select "Add to Home screen" or "Install App".',
    pwa_step2_title: 'Share Target Integration',
    pwa_step2_desc: 'When you receive a suspicious WhatsApp message or Tatkal SMS, tap Share and select RailRaksha. The message is automatically routed to our scanner.',
    pwa_step3_title: 'Offline Emergency Cache',
    pwa_step3_desc: 'Essential railway emergency contacts (1930 Cyber Helpline, 139 Rail Madad) and official asset registries remain accessible offline.',
    test_share_btn: 'Test Share Target Direct Route',
    verdict_official: 'Verified Official Railway Portal · Green Signal',
    verdict_blocked: 'Confirmed Threat · Red Signal Blocked',
    verdict_unknown: 'Unverified Domain · Exercise Caution',
  },
  hi: {
    title: 'रेल रक्षा शील्ड · वास्तविक समय सुरक्षा प्रणाली',
    ext_tab: 'ब्राउज़र एक्सटेंशन',
    feed_tab: 'डिजिटल रूप से हस्ताक्षरित थ्रेट फ़ीड',
    pwa_tab: 'मोबाइल PWA और शेयर टारगेट',
    download_ext_btn: 'शील्ड एक्सटेंशन डाउनलोड करें (.zip)',
    download_desc: 'Chrome, Edge, Brave और Firefox के लिए तैयार मेनिफ़ेस्ट V3 एक्सटेंशन।',
    install_guide_title: 'त्वरित इंस्टॉलेशन मार्गदर्शिका',
    step1: 'अपने कंप्यूटर पर railraksha-shield.zip फ़ाइल डाउनलोड करें और अनज़िप करें।',
    step2: 'ब्राउज़र एक्सटेंशन पेज खोलें (chrome://extensions या edge://extensions)।',
    step3: 'ऊपरी दाएं कोने में "Developer mode" चालू करें।',
    step4: '"Load unpacked" पर क्लिक करें और अनज़िप किए गए फ़ोल्डर को चुनें।',
    step5: 'सक्रिय सुरक्षा के लिए रेल रक्षा शील्ड को अपने टूलबार में पिन करें।',
    feature1_title: 'पूर्ण गोपनीयता (जीरो-हिस्ट्री)',
    feature1_desc: 'केवल 4-बाइट SHA256 प्रीफ़िक्स हैश की स्थानीय स्तर पर जांच होती है। आपका ब्राउज़िंग इतिहास कभी बाहर नहीं जाता।',
    feature2_title: 'धोखाधड़ी क्रेडेंशियल सुरक्षा',
    feature2_desc: 'रेलवे ब्रांडिंग का दुरुपयोग कर PNR, OTP या UPI पिन मांगने वाली फ़र्ज़ी साइटों पर तुरंत चेतावनी बैनर दिखता है।',
    feature3_title: 'Ed25519 डिजिटल हस्ताक्षर',
    feature3_desc: 'थ्रेट डेटा रेल रक्षा प्राधिकरण द्वारा डिजिटल रूप से हस्ताक्षरित होता है ताकि कोई फ़ीड से छेड़छाड़ न कर सके।',
    sim_title: 'शील्ड सिम्युलेटर परीक्षण',
    sim_subtitle: 'कोई भी डोमेन दर्ज करें और देखें कि शील्ड एक्सटेंशन 4-बाइट प्रीफ़िक्स की जांच कैसे करता है।',
    sim_label: 'परीक्षण के लिए डोमेन या URL',
    sim_placeholder: 'उदा. irctc-fast-tatkal.xyz या irctc.co.in',
    sim_button: 'शील्ड जांच का अनुकरण करें',
    simulating: 'SHA-256 गणना और प्रीफ़िक्स जांच जारी है…',
    feed_title: 'हस्ताक्षरित थ्रेट फ़ीड और डेल्टा',
    feed_subtitle: 'विकेंद्रीकृत थ्रेट वितरण स्ट्रीम की क्रिप्टोग्राफ़िक अखंडता और संस्करण की जांच करें।',
    fetch_feed_btn: 'लाइव हस्ताक्षरित फ़ीड प्राप्त करें',
    fetching_feed: 'रेल रक्षा प्राधिकरण से संपर्क हो रहा है…',
    feed_version: 'फ़ीड संस्करण',
    feed_algo: 'हस्ताक्षर एल्गोरिदम',
    feed_public_key: 'Ed25519 सार्वजनिक कुंजी (Public Key)',
    feed_checksum: 'SHA-256 चेकसम',
    feed_signature: 'Ed25519 डिजिटल हस्ताक्षर',
    feed_blocked_count: 'सक्रिय अवरोधित प्रीफ़िक्स संख्या',
    feed_official_count: 'सत्यापित आधिकारिक प्रीफ़िक्स संख्या',
    sample_prefixes: 'अवरोधित प्रीफ़िक्स नमूने (4-byte hex):',
    pwa_title: 'मोबाइल PWA और वेब शेयर टारगेट',
    pwa_subtitle: 'अपने स्मार्टफोन पर रेल रक्षा इंस्टॉल करें और संदिग्ध SMS, WhatsApp मैसेज सीधे साझा करें।',
    pwa_step1_title: 'होम स्क्रीन पर जोड़ें',
    pwa_step1_desc: 'फ़ोन पर Chrome या Safari में खोलें, मेनू (⋮ या Share) पर टैप करें और "Add to Home screen" चुनें।',
    pwa_step2_title: 'शेयर टारगेट सुविधा',
    pwa_step2_desc: 'संदिग्ध संदेश मिलने पर "Share" पर टैप करके रेल रक्षा चुनें। लिंक सीधे स्कैनर में खुल जाएगा।',
    pwa_step3_title: 'ऑफ़लाइन आपातकालीन सुविधा',
    pwa_step3_desc: 'आपातकालीन हेल्पलाइन (1930 साइबर हेल्पलाइन, 139 रेल मदद) बिना इंटरनेट भी उपलब्ध रहती हैं।',
    test_share_btn: 'शेयर टारगेट डायरेक्ट रूट का परीक्षण करें',
    verdict_official: 'सत्यापित आधिकारिक रेलवे पोर्टल · सुरक्षित (हरा सिग्नल)',
    verdict_blocked: 'पुष्ट धोखाधड़ी · अवरोधित (लाल सिग्नल)',
    verdict_unknown: 'असत्यापित डोमेन · सावधानी बरतें',
  },
};

export function ShieldTools({initialLocale, csrfToken}: ShieldProps) {
  const [tab, setTab] = useState<'ext' | 'feed' | 'pwa'>('ext');
  const [simDomain, setSimDomain] = useState('');
  const [simLoading, setSimLoading] = useState(false);
  const [simResult, setSimResult] = useState<DomainSimulationResult | null>(null);

  const [feedLoading, setFeedLoading] = useState(false);
  const [feedData, setFeedData] = useState<ThreatListFeed | null>(null);
  const [feedStats, setFeedStats] = useState<ThreatListStats | null>(null);
  const [feedError, setFeedError] = useState<string | null>(null);

  const t = labels[initialLocale];

  // Client-side SHA-256 computation helper
  async function computeSha256(val: string): Promise<string> {
    const enc = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', enc.encode(val));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async function handleSimulate(e: FormEvent) {
    e.preventDefault();
    if (!simDomain.trim()) return;
    setSimLoading(true);
    setSimResult(null);

    try {
      let clean = simDomain.trim().toLowerCase();
      if (clean.startsWith('http://') || clean.startsWith('https://')) {
        try {
          clean = new URL(clean).hostname;
        } catch {
          // fallback
        }
      }
      const fullHash = await computeSha256(clean);
      const prefix = fullHash.slice(0, 8);

      // Call API lookup-prefixes
      const res = await fetch('/api/tools/shield/lookup-prefixes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({prefixes: [prefix]}),
      });

      if (res.ok) {
        const data = await res.json();
        const match = data.matches && data.matches.length > 0 ? data.matches[0] : null;
        if (match) {
          setSimResult({
            domain: clean,
            prefix,
            fullHash,
            verdict: match.verdict === 'official' ? 'official' : 'blocked',
            matchedName: match.domain,
          });
        } else {
          // Check baseline local heuristics
          const officialFallbacks = ['irctc.co.in', 'indianrailways.gov.in', 'cris.org.in'];
          const isOfficial = officialFallbacks.some(f => clean === f || clean.endsWith('.' + f));
          setSimResult({
            domain: clean,
            prefix,
            fullHash,
            verdict: isOfficial ? 'official' : 'unknown',
          });
        }
      } else {
        setSimResult({
          domain: clean,
          prefix,
          fullHash,
          verdict: 'unknown',
        });
      }
    } catch {
      setSimResult({
        domain: simDomain,
        prefix: 'error',
        fullHash: 'error',
        verdict: 'unknown',
      });
    } finally {
      setSimLoading(false);
    }
  }

  async function handleFetchFeed() {
    setFeedLoading(true);
    setFeedError(null);
    try {
      const [feedRes, statsRes] = await Promise.all([
        fetch('/api/tools/shield/threat-list'),
        fetch('/api/tools/shield/stats'),
      ]);

      if (feedRes.ok) {
        const data = await feedRes.json();
        setFeedData(data);
      } else {
        setFeedError('Unable to load threat list feed.');
      }

      if (statsRes.ok) {
        const stats = await statsRes.json();
        setFeedStats(stats);
      }
    } catch {
      setFeedError('Failed to fetch cryptographic threat feed.');
    } finally {
      setFeedLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 border-b border-border pb-3 tool-tabs">
        <button
          type="button"
          onClick={() => setTab('ext')}
          className={`button ${tab === 'ext' ? 'primary' : 'secondary'}`}
        >
          🛡️ {t.ext_tab}
        </button>
        <button
          type="button"
          onClick={() => {
            setTab('feed');
            if (!feedData) void handleFetchFeed();
          }}
          className={`button ${tab === 'feed' ? 'primary' : 'secondary'}`}
        >
          🔑 {t.feed_tab}
        </button>
        <button
          type="button"
          onClick={() => setTab('pwa')}
          className={`button ${tab === 'pwa' ? 'primary' : 'secondary'}`}
        >
          📱 {t.pwa_tab}
        </button>
      </div>

      {tab === 'ext' && (
        <div className="space-y-6">
          <div className="tool-panel">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <span>🛡️</span> {t.title}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">{t.download_desc}</p>
              </div>
              <a
                href="/downloads/railraksha-shield.zip"
                download="railraksha-shield.zip"
                className="button primary text-center inline-block"
              >
                ⬇️ {t.download_ext_btn}
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="border border-border rounded-lg p-4 bg-card">
                <div className="font-semibold text-foreground text-sm flex items-center gap-2">
                  <span>🔒</span> {t.feature1_title}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{t.feature1_desc}</p>
              </div>
              <div className="border border-border rounded-lg p-4 bg-card">
                <div className="font-semibold text-foreground text-sm flex items-center gap-2">
                  <span>⚠️</span> {t.feature2_title}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{t.feature2_desc}</p>
              </div>
              <div className="border border-border rounded-lg p-4 bg-card">
                <div className="font-semibold text-foreground text-sm flex items-center gap-2">
                  <span>✍️</span> {t.feature3_title}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{t.feature3_desc}</p>
              </div>
            </div>
          </div>

          <div className="tool-panel">
            <h3 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
              <span>📋</span> {t.install_guide_title}
            </h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-foreground">
              <li>{t.step1}</li>
              <li>{t.step2}</li>
              <li>{t.step3}</li>
              <li>{t.step4}</li>
              <li>{t.step5}</li>
            </ol>
          </div>

          <div className="tool-panel">
            <h3 className="text-base font-semibold text-foreground">{t.sim_title}</h3>
            <p className="text-xs text-muted-foreground mt-1 mb-4">{t.sim_subtitle}</p>

            <form onSubmit={handleSimulate} className="space-y-4">
              <div>
                <label htmlFor="simDomain" className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                  {t.sim_label}
                </label>
                <div className="flex gap-2">
                  <input
                    id="simDomain"
                    type="text"
                    value={simDomain}
                    onChange={e => setSimDomain(e.target.value)}
                    placeholder={t.sim_placeholder}
                    className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    required
                  />
                  <button type="submit" disabled={simLoading} className="button primary">
                    {simLoading ? t.simulating : t.sim_button}
                  </button>
                </div>
              </div>
            </form>

            {simResult && (
              <div className="mt-4 border border-border rounded-lg p-4 bg-card space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-muted-foreground">Domain: {simResult.domain}</span>
                  <span
                    className={`verdict ${
                      simResult.verdict === 'official'
                        ? 'verdict-official'
                        : simResult.verdict === 'blocked'
                        ? 'verdict-known_scam'
                        : 'verdict-unknown'
                    }`}
                  >
                    {simResult.verdict === 'official'
                      ? t.verdict_official
                      : simResult.verdict === 'blocked'
                      ? t.verdict_blocked
                      : t.verdict_unknown}
                  </span>
                </div>

                <div className="text-xs font-mono bg-background p-2 rounded border border-border space-y-1">
                  <div>SHA-256 Full: {simResult.fullHash}</div>
                  <div className="font-bold text-foreground">Client Prefix (4-byte): {simResult.prefix}</div>
                  {simResult.matchedName && (
                    <div className="text-accent">Matched Entity: {simResult.matchedName}</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'feed' && (
        <div className="space-y-6">
          <div className="tool-panel">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <span>🔑</span> {t.feed_title}
                </h2>
                <p className="text-xs text-muted-foreground mt-1">{t.feed_subtitle}</p>
              </div>
              <button
                type="button"
                onClick={handleFetchFeed}
                disabled={feedLoading}
                className="button secondary"
              >
                {feedLoading ? t.fetching_feed : `🔄 ${t.fetch_feed_btn}`}
              </button>
            </div>

            {feedError && (
              <div className="mt-4 p-3 rounded bg-destructive/10 text-destructive text-sm">
                {feedError}
              </div>
            )}

            {feedStats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <div className="border border-border rounded p-3 bg-card">
                  <div className="text-xs text-muted-foreground">{t.feed_version}</div>
                  <div className="text-xl font-bold text-foreground mt-1">v{feedStats.version}</div>
                </div>
                <div className="border border-border rounded p-3 bg-card">
                  <div className="text-xs text-muted-foreground">{t.feed_blocked_count}</div>
                  <div className="text-xl font-bold text-destructive mt-1">
                    {feedStats.total_blocked_prefixes}
                  </div>
                </div>
                <div className="border border-border rounded p-3 bg-card">
                  <div className="text-xs text-muted-foreground">{t.feed_official_count}</div>
                  <div className="text-xl font-bold text-accent mt-1">
                    {feedStats.total_official_prefixes}
                  </div>
                </div>
                <div className="border border-border rounded p-3 bg-card">
                  <div className="text-xs text-muted-foreground">{t.feed_algo}</div>
                  <div className="text-xl font-bold text-foreground mt-1">Ed25519</div>
                </div>
              </div>
            )}

            {feedData && (
              <div className="mt-6 space-y-4">
                <div className="border border-border rounded-lg p-4 bg-card space-y-2 text-xs font-mono">
                  <div>
                    <span className="text-muted-foreground">{t.feed_public_key}:</span>
                    <div className="text-foreground break-all">{feedData.public_key}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t.feed_checksum}:</span>
                    <div className="text-foreground break-all">{feedData.sha256_checksum}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t.feed_signature}:</span>
                    <div className="text-accent break-all">{feedData.signature}</div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                    {t.sample_prefixes}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {feedData.blocked_prefixes.slice(0, 16).map(p => (
                      <span
                        key={p}
                        className="px-2 py-1 rounded bg-destructive/10 text-destructive font-mono text-xs border border-destructive/20"
                      >
                        {p}
                      </span>
                    ))}
                    {feedData.blocked_prefixes.length > 16 && (
                      <span className="text-xs text-muted-foreground self-center">
                        +{feedData.blocked_prefixes.length - 16} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'pwa' && (
        <div className="space-y-6">
          <div className="tool-panel">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <span>📱</span> {t.pwa_title}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">{t.pwa_subtitle}</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              <div className="border border-border rounded-lg p-4 bg-card space-y-2">
                <div className="font-semibold text-foreground text-sm flex items-center gap-2">
                  <span>📲</span> {t.pwa_step1_title}
                </div>
                <p className="text-xs text-muted-foreground">{t.pwa_step1_desc}</p>
              </div>

              <div className="border border-border rounded-lg p-4 bg-card space-y-2">
                <div className="font-semibold text-foreground text-sm flex items-center gap-2">
                  <span>🔗</span> {t.pwa_step2_title}
                </div>
                <p className="text-xs text-muted-foreground">{t.pwa_step2_desc}</p>
              </div>

              <div className="border border-border rounded-lg p-4 bg-card space-y-2">
                <div className="font-semibold text-foreground text-sm flex items-center gap-2">
                  <span>💾</span> {t.pwa_step3_title}
                </div>
                <p className="text-xs text-muted-foreground">{t.pwa_step3_desc}</p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border flex flex-wrap gap-4 items-center">
              <Link
                href={`/${initialLocale}/verify?text=Check+this+suspicious+railway+link+https://irctc-fast-tatkal.xyz`}
                className="button secondary"
              >
                ↗️ {t.test_share_btn}
              </Link>
              <Link href={`/${initialLocale}/scamlens`} className="button secondary">
                🔍 ScamLens Analyzer
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
