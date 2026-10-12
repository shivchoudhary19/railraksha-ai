'use client';

import React, { useState } from 'react';
import type {
  SandboxKeyResult,
  PartnerVerifyResult,
  TenantProfileResult,
  KPIDashboardResult,
} from '@railraksha/schemas';

interface DeveloperPortalProps {
  initialKpis: KPIDashboardResult;
  initialTenants: TenantProfileResult[];
  csrfToken: string;
  lang: 'en' | 'hi';
}

export function DeveloperPortal({
  initialKpis,
  initialTenants,
  csrfToken,
  lang,
}: DeveloperPortalProps) {
  const [activeTab, setActiveTab] = useState<'sandbox' | 'sdks' | 'stix' | 'tenants' | 'kpis'>('sandbox');

  // Sandbox key form
  const [orgName, setOrgName] = useState('Bharat FinTech Labs');
  const [devEmail, setDevEmail] = useState('developer@bharatfintech.in');
  const [useCase, setUseCase] = useState<'BANKING_UPI' | 'TELECOM_SMS' | 'COLLEGE_PORTAL' | 'GENERAL_APP'>('BANKING_UPI');
  const [generatedKey, setGeneratedKey] = useState<SandboxKeyResult | null>(null);
  const [keyLoading, setKeyLoading] = useState(false);

  // Live Verify Console
  const [verifyIdentifier, setVerifyIdentifier] = useState('irctc.co.in');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyResult, setVerifyResult] = useState<PartnerVerifyResult | null>(null);

  // STIX feed viewer
  const [stixJson, setStixJson] = useState<string | null>(null);
  const [stixLoading, setStixLoading] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isHindi = lang === 'hi';

  const t = {
    title: isHindi ? 'डेवलपर पोर्टल एवं पार्टनर इकोसिस्टम' : 'Developer Portal & Partner Ecosystem',
    subtitle: isHindi
      ? 'बैंकों, यूपीआई ऐप्स, टेलीकॉम और शैक्षणिक संस्थानों के लिए 10ms हाई-स्पीड पार्टनर एपीआई'
      : 'Sub-10ms partner verification API, SDKs & STIX 2.1 Threat Intel for banks, telecom, and universities',
    tabSandbox: isHindi ? 'सैंडबॉक्स और लाइव एपीआई' : 'Sandbox & Live API',
    tabSdks: isHindi ? 'एसडीके और कोड उदाहरण' : 'SDKs & Code Snippets',
    tabStix: isHindi ? 'STIX 2.1 थ्रेट फीड' : 'STIX 2.1 Threat Feed',
    tabTenants: isHindi ? 'पार्टनर और व्हाइट-लेबल' : 'Partners & White-Label',
    tabKpis: isHindi ? 'प्लेटफ़ॉर्म प्रभाव (केपीआई)' : 'Platform KPIs & Impact',
  };

  const handleGenerateKey = async () => {
    setKeyLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/tools/partner/keys/create-sandbox', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({
          organization_name: orgName,
          developer_email: devEmail,
          use_case: useCase,
        }),
      });
      if (!res.ok) throw new Error('Key generation failed');
      const data = await res.json();
      setGeneratedKey(data);
    } catch {
      setErrorMsg(isHindi ? 'सैंडबॉक्स कुंजी बनाने में त्रुटि हुई।' : 'Error generating sandbox API key.');
    } finally {
      setKeyLoading(false);
    }
  };

  const handleTestVerify = async () => {
    setVerifyLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/tools/partner/verify?identifier=${encodeURIComponent(verifyIdentifier)}`);
      if (!res.ok) throw new Error('Verification failed');
      const data = await res.json();
      setVerifyResult(data);
    } catch {
      setErrorMsg(isHindi ? 'सत्यापन अनुरोध विफल हुआ।' : 'Partner verification request failed.');
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleFetchStix = async () => {
    setStixLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/tools/partner/feed/stix2');
      if (!res.ok) throw new Error('Failed fetching STIX bundle');
      const data = await res.json();
      setStixJson(JSON.stringify(data, null, 2));
    } catch {
      setErrorMsg(isHindi ? 'STIX फीड लोड करने में त्रुटि हुई।' : 'Error loading STIX 2.1 threat feed.');
    } finally {
      setStixLoading(false);
    }
  };

  return (
    <div className="card space-y-6">
      <div>
        <h2 className="text-xl font-bold text-token-text-primary">{t.title}</h2>
        <p className="text-sm text-token-text-muted">{t.subtitle}</p>
      </div>

      {errorMsg && (
        <div role="alert" className="p-3 bg-token-danger-bg text-token-danger border border-token-danger rounded-md text-sm">
          {errorMsg}
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-token-border pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('sandbox')}
          className={`button button-small ${activeTab === 'sandbox' ? 'button-primary' : 'button-secondary'}`}
        >
          {t.tabSandbox}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('sdks')}
          className={`button button-small ${activeTab === 'sdks' ? 'button-primary' : 'button-secondary'}`}
        >
          {t.tabSdks}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('stix')}
          className={`button button-small ${activeTab === 'stix' ? 'button-primary' : 'button-secondary'}`}
        >
          {t.tabStix}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('tenants')}
          className={`button button-small ${activeTab === 'tenants' ? 'button-primary' : 'button-secondary'}`}
        >
          {t.tabTenants}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('kpis')}
          className={`button button-small ${activeTab === 'kpis' ? 'button-primary' : 'button-secondary'}`}
        >
          {t.tabKpis}
        </button>
      </div>

      {/* Tab 1: Sandbox & Live API */}
      {activeTab === 'sandbox' && (
        <div className="space-y-6">
          {/* Key Generator */}
          <div className="p-4 bg-token-surface-subtle border border-token-border rounded-lg space-y-3">
            <h4 className="font-semibold text-token-text-primary text-sm">
              {isHindi ? '1-क्लिक सैंडबॉक्स एपीआई कुंजी बनाएं' : '1-Click Sandbox API Key Generator'}
            </h4>
            <p className="text-xs text-token-text-muted">
              {isHindi
                ? 'क्रेडिट कार्ड की आवश्यकता नहीं। 10,000 दैनिक अनुरोधों के साथ 10 सेकंड में त्वरित परीक्षण प्रारंभ करें।'
                : 'No credit card required. Get instant sandbox access with 10,000 requests/day quota in <10 seconds.'}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label htmlFor="org-name" className="text-xs text-token-text-muted">{isHindi ? 'संगठन का नाम' : 'Organization Name'}</label>
                <input
                  id="org-name"
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full text-xs p-2 border border-token-border rounded bg-token-surface"
                />
              </div>
              <div>
                <label htmlFor="dev-email" className="text-xs text-token-text-muted">{isHindi ? 'डेवलपर ईमेल' : 'Developer Email'}</label>
                <input
                  id="dev-email"
                  type="email"
                  value={devEmail}
                  onChange={(e) => setDevEmail(e.target.value)}
                  className="w-full text-xs p-2 border border-token-border rounded bg-token-surface"
                />
              </div>
              <div>
                <label htmlFor="use-case-select" className="text-xs text-token-text-muted">{isHindi ? 'उपयोग का प्रकार' : 'Use Case'}</label>
                <select
                  id="use-case-select"
                  aria-label={isHindi ? 'उपयोग का प्रकार' : 'Use Case'}
                  value={useCase}
                  onChange={(e) => setUseCase(e.target.value as 'BANKING_UPI' | 'TELECOM_SMS' | 'COLLEGE_PORTAL' | 'GENERAL_APP')}
                  className="w-full text-xs p-2 border border-token-border rounded bg-token-surface"
                >
                  <option value="BANKING_UPI">Banking & UPI Payment Apps</option>
                  <option value="TELECOM_SMS">Telecom SMS Fraud Filtering</option>
                  <option value="COLLEGE_PORTAL">College & University Portals</option>
                  <option value="GENERAL_APP">General Application Integration</option>
                </select>
              </div>
            </div>
            <button
              type="button"
              onClick={handleGenerateKey}
              disabled={keyLoading}
              className="button button-small button-primary"
            >
              {keyLoading
                ? (isHindi ? 'कुंजी बनाई जा रही है...' : 'Generating Key...')
                : (isHindi ? 'त्वरित सैंडबॉक्स कुंजी बनाएं' : 'Generate Instant Sandbox Key')}
            </button>

            {generatedKey && (
              <div className="p-3 border border-token-success bg-token-surface rounded text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="font-bold text-token-success">{generatedKey.tier} KEY: {generatedKey.api_key}</span>
                  <span className="text-token-text-muted">Quota: {generatedKey.quota_limit_per_day.toLocaleString()} req/day</span>
                </div>
                <div className="p-2 bg-token-surface-subtle border border-token-border rounded font-mono text-[11px] whitespace-pre-wrap break-all">
                  {generatedKey.quickstart_curl}
                </div>
              </div>
            )}
          </div>

          {/* Interactive Live Verify Console */}
          <div className="p-4 border border-token-border rounded-lg space-y-3">
            <h4 className="font-semibold text-token-text-primary text-sm">
              {isHindi ? 'लाइव पार्टनर सत्यापन कंसोल (/v1/partner/verify)' : 'Live Partner API Verification Console'}
            </h4>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="text-token-text-muted">{isHindi ? 'उदाहरण:' : 'Presets:'}</span>
              <button
                type="button"
                onClick={() => setVerifyIdentifier('irctc.co.in')}
                className="text-token-accent underline"
              >
                irctc.co.in (Official)
              </button>
              <button
                type="button"
                onClick={() => setVerifyIdentifier('irctc-refund-help.shop')}
                className="text-token-accent underline"
              >
                irctc-refund-help.shop (Phishing)
              </button>
              <button
                type="button"
                onClick={() => setVerifyIdentifier('unregistered-agent.in')}
                className="text-token-accent underline"
              >
                unregistered-agent.in (Unknown)
              </button>
            </div>
            <div className="flex gap-2">
              <input
                id="verify-identifier"
                aria-label={isHindi ? 'सत्यापन के लिए पहचानकर्ता' : 'Identifier to verify'}
                type="text"
                value={verifyIdentifier}
                onChange={(e) => setVerifyIdentifier(e.target.value)}
                placeholder="Identifier to verify..."
                className="flex-1 text-xs p-2 border border-token-border rounded bg-token-surface"
              />
              <button
                type="button"
                onClick={handleTestVerify}
                disabled={verifyLoading}
                className="button button-small button-primary"
              >
                {verifyLoading ? (isHindi ? 'सत्यापन हो रहा है...' : 'Verifying...') : (isHindi ? 'परीक्षण करें' : 'Test API Call')}
              </button>
            </div>

            {verifyResult && (
              <div className="p-3 border border-token-border bg-token-surface-subtle rounded text-xs space-y-2">
                <div className="flex justify-between items-center">
                  <span className={`font-bold px-2 py-0.5 rounded ${
                    verifyResult.classification === 'OFFICIAL'
                      ? 'bg-token-success-bg text-token-success'
                      : verifyResult.classification === 'BLOCKED'
                      ? 'bg-token-danger-bg text-token-danger'
                      : 'bg-token-warning-bg text-token-warning'
                  }`}>
                    {verifyResult.classification} — {verifyResult.recommended_action}
                  </span>
                  <span className="text-token-text-muted">Latency: {verifyResult.latency_ms} ms (Cached: {String(verifyResult.cached)})</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-token-text-muted">Brand:</span>
                    <p className="font-semibold text-token-text-primary">{verifyResult.brand}</p>
                  </div>
                  <div>
                    <span className="text-token-text-muted">Risk Score:</span>
                    <p className="font-semibold text-token-text-primary">{verifyResult.risk_score} / 100</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: SDKs & Code Snippets */}
      {activeTab === 'sdks' && (
        <div className="space-y-4">
          <div className="p-4 bg-token-surface-subtle border border-token-border rounded-lg space-y-2">
            <h4 className="font-semibold text-token-text-primary text-sm">
              {isHindi ? 'आधिकारिक रेलसुरक्षा एसडीके पैकेज' : 'Official RailRaksha SDK Libraries'}
            </h4>
            <p className="text-xs text-token-text-muted">
              {isHindi
                ? 'टाइपस्क्रिप्ट, पायथन और जावा में शून्य-निर्भरता वाले क्लाइंट लाइब्रेरी।'
                : 'Zero-bloat client libraries with built-in retries, mTLS support, and local caching.'}
            </p>
          </div>

          <div className="space-y-3">
            <div className="p-3 border border-token-border rounded-lg bg-token-surface space-y-1">
              <span className="text-xs font-bold text-token-accent">TypeScript / Node.js SDK</span>
              <p className="text-[11px] text-token-text-muted">npm install @railraksha/sdk</p>
              <pre className="p-2 bg-token-surface-subtle border border-token-border rounded text-[11px] font-mono whitespace-pre-wrap break-all">
{`import { RailRakshaClient } from '@railraksha/sdk';

const client = new RailRakshaClient('rr_test_sandbox_123456');
const verdict = await client.verify('irctc.co.in');

if (verdict.recommended_action === 'BLOCK_TRANSACTION') {
  throw new Error('Blocked fraudulent railway entity');
}`}
              </pre>
            </div>

            <div className="p-3 border border-token-border rounded-lg bg-token-surface space-y-1">
              <span className="text-xs font-bold text-token-accent">Python SDK</span>
              <p className="text-[11px] text-token-text-muted">pip install railraksha</p>
              <pre className="p-2 bg-token-surface-subtle border border-token-border rounded text-[11px] font-mono whitespace-pre-wrap break-all">
{`import requests

response = requests.get(
    "https://railraksha.gov.in/v1/partner/verify",
    params={"identifier": "irctc.co.in"},
    headers={"X-API-Key": "rr_test_sandbox_123456"}
)
data = response.json()
print("Classification:", data["classification"])`}
              </pre>
            </div>

            <div className="p-3 border border-token-border rounded-lg bg-token-surface space-y-1">
              <span className="text-xs font-bold text-token-accent">Java / Android SDK</span>
              <p className="text-[11px] text-token-text-muted">implementation("in.gov.railraksha:sdk:1.0.0")</p>
              <pre className="p-2 bg-token-surface-subtle border border-token-border rounded text-[11px] font-mono whitespace-pre-wrap break-all">
{`RailRakshaClient client = new RailRakshaClient("rr_test_sandbox_123456");
VerifyResult result = client.verify("irctc-refund-help.shop");
if (result.isBlocked()) {
    showSecurityWarning();
}`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: STIX 2.1 Threat Feed */}
      {activeTab === 'stix' && (
        <div className="space-y-4">
          <div className="p-4 bg-token-surface-subtle border border-token-border rounded-lg space-y-2">
            <h4 className="font-semibold text-token-text-primary text-sm">
              {isHindi ? 'STIX/TAXII 2.1 साइबर खतरा खुफिया फ़ीड' : 'STIX/TAXII 2.1 Threat Intelligence Bundle'}
            </h4>
            <p className="text-xs text-token-text-muted">
              {isHindi
                ? 'सीईआरटी-इन, बैंकों और दूरसंचार सुरक्षा संचालन केंद्रों के लिए मानकीकृत खतरा संकेतक फ़ीड।'
                : 'Standardized threat intelligence feed for national CERTs, banks, and telecom SOCs.'}
            </p>
            <button
              type="button"
              onClick={handleFetchStix}
              disabled={stixLoading}
              className="button button-small button-primary"
            >
              {stixLoading
                ? (isHindi ? 'लोड हो रहा है...' : 'Loading STIX Bundle...')
                : (isHindi ? 'लाइव STIX 2.1 बंडल देखें' : 'Fetch Live STIX 2.1 Bundle')}
            </button>
          </div>

          {stixJson && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-token-success">STIX 2.1 JSON BUNDLE</span>
              <pre className="p-3 bg-token-surface-subtle border border-token-border rounded text-[11px] font-mono whitespace-pre-wrap break-all">
                {stixJson}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Partner Tenants & White-Label */}
      {activeTab === 'tenants' && (
        <div className="space-y-4">
          <div className="p-4 bg-token-surface-subtle border border-token-border rounded-lg space-y-2">
            <h4 className="font-semibold text-token-text-primary text-sm">
              {isHindi ? 'सक्रिय भागीदार एवं व्हाइट-लेबल टेनेंट्स' : 'Onboarded Partner Tenants & White-Label Portals'}
            </h4>
            <p className="text-xs text-token-text-muted">
              {isHindi
                ? 'रेलवे ज़ोन, राष्ट्रीय एजेंसियां और विश्वविद्यालय परिसरों का प्रबंधन।'
                : 'Multi-tenant segregation with custom white-label subdomains and dedicated quota pools.'}
            </p>
          </div>

          <div className="space-y-2">
            {initialTenants.map((ten) => (
              <div key={ten.tenant_id} className="p-3 border border-token-border rounded-lg bg-token-surface space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-token-text-primary">{ten.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-token-surface-subtle border border-token-border font-medium">
                    {ten.tier}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-token-text-muted">
                  <span>Domain: {ten.white_label_domain}</span>
                  <span>Usage: {ten.quota_used_today.toLocaleString()} / {ten.quota_limit_per_day.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 5: Platform KPIs & Impact */}
      {activeTab === 'kpis' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-token-surface-subtle border border-token-border rounded-lg">
              <span className="text-xs text-token-text-muted">{isHindi ? 'कुल सत्यापन अनुरोध' : 'Total Verifications'}</span>
              <p className="text-2xl font-bold text-token-accent">{initialKpis.total_verifications_count.toLocaleString()}</p>
              <span className="text-xs text-token-text-muted">Crores of citizen checks</span>
            </div>
            <div className="p-4 bg-token-surface-subtle border border-token-border rounded-lg">
              <span className="text-xs text-token-text-muted">{isHindi ? 'रोकी गई धोखाधड़ी' : 'Fraud Loss Prevented'}</span>
              <p className="text-2xl font-bold text-token-success">₹{(initialKpis.estimated_fraud_loss_prevented_inr / 10000000).toFixed(1)} Crores</p>
              <span className="text-xs text-token-text-muted">Estimated citizen savings</span>
            </div>
            <div className="p-4 bg-token-surface-subtle border border-token-border rounded-lg">
              <span className="text-xs text-token-text-muted">{isHindi ? 'हटाए गए नकली डोमेन' : 'Fake Domains Dismantled'}</span>
              <p className="text-2xl font-bold text-token-text-primary">{initialKpis.fake_domains_dismantled.toLocaleString()}</p>
              <span className="text-xs text-token-text-muted">Takedown success MTTR &lt; 2h</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-token-surface-subtle border border-token-border rounded-lg">
              <span className="text-xs text-token-text-muted">{isHindi ? 'संबद्ध कॉलेज परिसर' : 'Active Campuses'}</span>
              <p className="text-2xl font-bold text-token-text-primary">{initialKpis.active_institutions_onboarded}</p>
              <span className="text-xs text-token-text-muted">Student Safe Zones</span>
            </div>
            <div className="p-4 bg-token-surface-subtle border border-token-border rounded-lg">
              <span className="text-xs text-token-text-muted">{isHindi ? 'नागरिक विश्वास सूचकांक' : 'Citizen Trust Index'}</span>
              <p className="text-2xl font-bold text-token-success">{initialKpis.citizen_trust_index_percent}%</p>
              <span className="text-xs text-token-text-muted">Audited satisfaction</span>
            </div>
            <div className="p-4 bg-token-surface-subtle border border-token-border rounded-lg">
              <span className="text-xs text-token-text-muted">{isHindi ? 'प्लेटफ़ॉर्म उपलब्धता' : 'Platform Uptime'}</span>
              <p className="text-2xl font-bold text-token-success">{initialKpis.platform_uptime_percent}%</p>
              <span className="text-xs text-token-text-muted">Strict 99.9% SLO</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
