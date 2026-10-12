'use client';

import React, { useState } from 'react';
import type {
  FederatedStatusResult,
  FederatedRoundResult,
  IVRCallResult,
  IVRHistoryItemResult,
  TelecomHeaderResult,
  UPIVerifyResult,
  FraudRingsResult,
  DriftMetricsResult,
  BugBountyResult,
} from '@railraksha/schemas';

interface AdvancedRdToolsProps {
  initialFederated: FederatedStatusResult;
  initialIVRHistory: IVRHistoryItemResult[];
  initialFraudRings: FraudRingsResult;
  initialDrift: DriftMetricsResult;
  initialBounty: BugBountyResult;
  csrfToken: string;
  lang: 'en' | 'hi';
}

export function AdvancedRdTools({
  initialFederated,
  initialIVRHistory,
  initialFraudRings,
  initialDrift,
  initialBounty,
  csrfToken,
  lang,
}: AdvancedRdToolsProps) {
  const [activeTab, setActiveTab] = useState<'federated' | 'ivr' | 'telecom_upi' | 'fraud_rings' | 'drift_bounty'>('federated');

  // Tab 1: Federated Round State
  const [flDeviceId, setFlDeviceId] = useState('pixel-edge-9401');
  const [flSamples, setFlSamples] = useState(150);
  const [flLoss, setFlLoss] = useState(0.042);
  const [flDpEnabled, setFlDpEnabled] = useState(true);
  const [flLoading, setFlLoading] = useState(false);
  const [flResult, setFlResult] = useState<FederatedRoundResult | null>(null);

  // Tab 2: IVR State
  const [ivrPhone, setIvrPhone] = useState('+919876543210');
  const [ivrLang, setIvrLang] = useState<'hi-IN' | 'en-IN' | 'ta-IN' | 'te-IN' | 'bn-IN' | 'mr-IN'>('hi-IN');
  const [ivrQuery, setIvrQuery] = useState('139');
  const [ivrInputType, setIvrInputType] = useState<'DTMF_DIGITS' | 'SPEECH_TEXT'>('DTMF_DIGITS');
  const [ivrLoading, setIvrLoading] = useState(false);
  const [ivrResult, setIvrResult] = useState<IVRCallResult | null>(null);
  const [ivrHistory, setIvrHistory] = useState<IVRHistoryItemResult[]>(initialIVRHistory);

  // Tab 3: Telecom & UPI State
  const [smsHeader, setSmsHeader] = useState('VM-IRCTC');
  const [smsLoading, setSmsLoading] = useState(false);
  const [smsResult, setSmsResult] = useState<TelecomHeaderResult | null>(null);

  const [upiHandle, setUpiHandle] = useState('irctc@icici');
  const [upiAmount, setUpiAmount] = useState(1250);
  const [upiLoading, setUpiLoading] = useState(false);
  const [upiResult, setUpiResult] = useState<UPIVerifyResult | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isHindi = lang === 'hi';

  const t = {
    title: isHindi ? 'उन्नत अनुसंधान एवं निरंतर सुधार (चरण 15)' : 'Continuous Improvement & Advanced R&D (Phase 15)',
    subtitle: isHindi
      ? 'फेडरेटेड लर्निंग (डीपी), बहुभाषी वॉयस आईवीआर, टेलीकॉम डीएलटी हेडर, यूपीआई शील्ड और फ्रॉड-रिंग सिंडिकेट डिटेक्शन'
      : 'Federated Learning (DP), Regional Voice IVR, Telecom DLT Header verification, UPI Shield & Fraud-Ring Syndicate Analysis',
    tabFederated: isHindi ? 'फेडरेटेड लर्निंग और विभेदक गोपनीयता' : 'Federated Learning & DP',
    tabIvr: isHindi ? 'क्षेत्रीय वॉयस आईवीआर (फीचर फोन)' : 'Regional Voice IVR',
    tabTelecomUpi: isHindi ? 'टेलीकॉम हेडर और यूपीआई शील्ड' : 'Telecom DLT & UPI Shield',
    tabFraudRings: isHindi ? 'फ्रॉड-रिंग सिंडिकेट ग्राफ' : 'Fraud-Ring Syndicates',
    tabDriftBounty: isHindi ? 'मॉडल ड्रिफ्ट और बग बाउंटी' : 'Model Drift & Bug Bounty',
  };

  const handleFederatedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFlLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/tools/advanced-rd/federated/round', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({
          device_id: flDeviceId,
          local_samples_count: Number(flSamples),
          local_loss: Number(flLoss),
          gradient_norm: 0.14,
          clip_threshold: 1.0,
          differential_privacy_noise: flDpEnabled,
        }),
      });
      if (!res.ok) throw new Error(isHindi ? 'फेडरेटेड अपडेट विफल रहा' : 'Federated update failed');
      const data: FederatedRoundResult = await res.json();
      setFlResult(data);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error');
    } finally {
      setFlLoading(false);
    }
  };

  const handleIvrCall = async (e: React.FormEvent) => {
    e.preventDefault();
    setIvrLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/tools/advanced-rd/ivr/call-verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({
          caller_number: ivrPhone,
          language: ivrLang,
          query_input: ivrQuery,
          input_type: ivrInputType,
        }),
      });
      if (!res.ok) throw new Error(isHindi ? 'आईवीआर कॉल विफल रही' : 'IVR verification failed');
      const data: IVRCallResult = await res.json();
      setIvrResult(data);
      setIvrHistory((prev) => [
        {
          session_id: data.call_session_id,
          caller_number: data.caller_number,
          language: data.language,
          query_input: data.query_input,
          classification: data.classification,
          risk_score: data.risk_score,
          timestamp: data.timestamp,
        },
        ...prev.slice(0, 9),
      ]);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error');
    } finally {
      setIvrLoading(false);
    }
  };

  const handleSmsVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setSmsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/tools/advanced-rd/telecom/header-verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({
          sms_header: smsHeader,
          message_sample: 'Your ticket PNR has been updated.',
        }),
      });
      if (!res.ok) throw new Error(isHindi ? 'हेडर सत्यापन विफल रहा' : 'Header verification failed');
      const data: TelecomHeaderResult = await res.json();
      setSmsResult(data);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error');
    } finally {
      setSmsLoading(false);
    }
  };

  const handleUpiVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpiLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/tools/advanced-rd/upi/verify-vpa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({
          vpa_handle: upiHandle,
          amount_inr: Number(upiAmount),
        }),
      });
      if (!res.ok) throw new Error(isHindi ? 'यूपीआई सत्यापन विफल रहा' : 'UPI verification failed');
      const data: UPIVerifyResult = await res.json();
      setUpiResult(data);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error');
    } finally {
      setUpiLoading(false);
    }
  };

  return (
    <div className="card space-y-6">
      <div>
        <h2 className="text-xl font-bold text-token-text-primary">{t.title}</h2>
        <p className="text-sm text-token-text-muted mt-1">{t.subtitle}</p>
      </div>

      {errorMsg && (
        <div role="alert" className="p-3 bg-token-danger-bg text-token-danger border border-token-danger rounded-md text-sm">
          {errorMsg}
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-token-border pb-3" role="tablist" aria-label="R&D Modules">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'federated'}
          onClick={() => setActiveTab('federated')}
          className={`button button-small ${activeTab === 'federated' ? 'button-primary' : 'button-secondary'}`}
        >
          {t.tabFederated}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'ivr'}
          onClick={() => setActiveTab('ivr')}
          className={`button button-small ${activeTab === 'ivr' ? 'button-primary' : 'button-secondary'}`}
        >
          {t.tabIvr}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'telecom_upi'}
          onClick={() => setActiveTab('telecom_upi')}
          className={`button button-small ${activeTab === 'telecom_upi' ? 'button-primary' : 'button-secondary'}`}
        >
          {t.tabTelecomUpi}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'fraud_rings'}
          onClick={() => setActiveTab('fraud_rings')}
          className={`button button-small ${activeTab === 'fraud_rings' ? 'button-primary' : 'button-secondary'}`}
        >
          {t.tabFraudRings}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'drift_bounty'}
          onClick={() => setActiveTab('drift_bounty')}
          className={`button button-small ${activeTab === 'drift_bounty' ? 'button-primary' : 'button-secondary'}`}
        >
          {t.tabDriftBounty}
        </button>
      </div>

      {/* Tab 1: Federated Learning & DP */}
      {activeTab === 'federated' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-token-surface-subtle border border-token-border rounded-lg">
              <span className="text-xs text-token-text-muted uppercase tracking-wider font-semibold block">
                {isHindi ? 'वैश्विक मॉडल सटीकता' : 'Global Model Accuracy'}
              </span>
              <p className="text-2xl font-bold text-token-success mt-1">
                {initialFederated.accuracy_percent}%
              </p>
              <span className="text-xs text-token-text-muted mt-1 block">
                Loss: {initialFederated.global_loss}
              </span>
            </div>
            <div className="p-4 bg-token-surface-subtle border border-token-border rounded-lg">
              <span className="text-xs text-token-text-muted uppercase tracking-wider font-semibold block">
                {isHindi ? 'विभेदक गोपनीयता बजट (ε)' : 'DP Privacy Budget (ε)'}
              </span>
              <p className="text-2xl font-bold text-token-accent mt-1">
                ε = {initialFederated.differential_privacy_epsilon}
              </p>
              <span className="text-xs text-token-text-muted mt-1 block">
                δ = {initialFederated.differential_privacy_delta} (Laplace)
              </span>
            </div>
            <div className="p-4 bg-token-surface-subtle border border-token-border rounded-lg">
              <span className="text-xs text-token-text-muted uppercase tracking-wider font-semibold block">
                {isHindi ? 'सक्रिय राउंड और नोड्स' : 'Active Round & Nodes'}
              </span>
              <p className="text-2xl font-bold text-token-text-primary mt-1">
                Round #{initialFederated.active_round}
              </p>
              <span className="text-xs text-token-text-muted mt-1 block">
                {initialFederated.participating_edge_devices.toLocaleString()} edge devices
              </span>
            </div>
            <div className="p-4 bg-token-surface-subtle border border-token-border rounded-lg">
              <span className="text-xs text-token-text-muted uppercase tracking-wider font-semibold block">
                {isHindi ? 'ओएस वितरण' : 'Edge OS Distribution'}
              </span>
              <p className="text-sm font-bold text-token-text-primary mt-1">
                Android {initialFederated.device_os_distribution['Android']}% • iOS {initialFederated.device_os_distribution['iOS']}%
              </p>
              <span className="text-xs text-token-text-muted mt-1 block">
                Secure FedAvg on-device
              </span>
            </div>
          </div>

          {/* FL Simulator Form */}
          <div className="p-5 border border-token-border rounded-lg bg-token-surface space-y-4">
            <h3 className="text-base font-bold text-token-text-primary">
              {isHindi ? 'ऑन-डिवाइस फेडरेटेड अपडेट सिम्युलेटर (सुरक्षित FedAvg + DP)' : 'On-Device Federated Update Simulator (Secure FedAvg + DP)'}
            </h3>
            <p className="text-xs text-token-text-muted">
              {isHindi
                ? 'नागरिक का व्यक्तिगत डेटा डिवाइस पर ही रहता है। केवल क्लिप किए गए ग्रेडिएंट वजन लाप्लास नॉइज़ के साथ सर्वर को भेजे जाते हैं।'
                : 'Raw user data never leaves the mobile device. Local models train locally, and only clipped gradient weights with DP noise are aggregated.'}
            </p>

            <form onSubmit={handleFederatedSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label htmlFor="fl-device-id" className="block text-xs text-token-text-muted mb-1">
                  {isHindi ? 'डिवाइस पहचानकर्ता' : 'Device ID'}
                </label>
                <input
                  id="fl-device-id"
                  type="text"
                  value={flDeviceId}
                  onChange={(e) => setFlDeviceId(e.target.value)}
                  className="w-full text-xs p-2 border border-token-border rounded bg-token-surface text-token-text-primary"
                  required
                />
              </div>
              <div>
                <label htmlFor="fl-samples" className="block text-xs text-token-text-muted mb-1">
                  {isHindi ? 'स्थानीय नमूने (Samples)' : 'Local Samples'}
                </label>
                <input
                  id="fl-samples"
                  type="number"
                  min="10"
                  max="5000"
                  value={flSamples}
                  onChange={(e) => setFlSamples(Number(e.target.value))}
                  className="w-full text-xs p-2 border border-token-border rounded bg-token-surface text-token-text-primary"
                  required
                />
              </div>
              <div>
                <label htmlFor="fl-loss" className="block text-xs text-token-text-muted mb-1">
                  {isHindi ? 'स्थानीय हानि (Local Loss)' : 'Local Loss'}
                </label>
                <input
                  id="fl-loss"
                  type="number"
                  step="0.001"
                  min="0.001"
                  max="1.0"
                  value={flLoss}
                  onChange={(e) => setFlLoss(Number(e.target.value))}
                  className="w-full text-xs p-2 border border-token-border rounded bg-token-surface text-token-text-primary"
                  required
                />
              </div>
              <div className="flex items-center gap-2 pt-5">
                <input
                  id="fl-dp-toggle"
                  type="checkbox"
                  checked={flDpEnabled}
                  onChange={(e) => setFlDpEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-token-border"
                />
                <label htmlFor="fl-dp-toggle" className="text-xs text-token-text-primary">
                  {isHindi ? 'विभेदक गोपनीयता (DP)' : 'Enable DP Noise'}
                </label>
              </div>
              <div className="md:col-span-4">
                <button
                  type="submit"
                  disabled={flLoading}
                  className="button button-small button-primary"
                >
                  {flLoading
                    ? (isHindi ? 'एकत्रीकरण जारी है...' : 'Aggregating Weights...')
                    : (isHindi ? 'सुरक्षित वजन जमा करें (FedAvg)' : 'Submit Weight Update (FedAvg)')}
                </button>
              </div>
            </form>

            {flResult && (
              <div className="p-3 border border-token-success bg-token-surface rounded text-xs space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-token-success">✓ {flResult.status} (Round #{flResult.round_number})</span>
                  <span className="text-token-text-muted">Global Accuracy: {flResult.updated_accuracy_percent}%</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] text-token-text-muted">
                  <div>DP Noise Added: {flResult.dp_noise_added}</div>
                  <div>Updated Loss: {flResult.updated_global_loss}</div>
                  <div>Epsilon Δ: +{flResult.consumed_epsilon_increment}</div>
                  <div>Device: {flResult.device_id}</div>
                </div>
                <p className="text-[11px] text-token-text-muted border-t border-token-border pt-1">
                  {flResult.client_feedback}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Regional Voice IVR */}
      {activeTab === 'ivr' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 p-5 border border-token-border rounded-lg bg-token-surface space-y-4">
              <h3 className="text-base font-bold text-token-text-primary">
                {isHindi ? 'फीचर फोन नागरिक आईवीआर सिम्युलेटर' : 'Feature-Phone Citizen IVR Simulator'}
              </h3>
              <p className="text-xs text-token-text-muted">
                {isHindi
                  ? 'बिना स्मार्टफोन वाले नागरिक 139 डायल करके किसी भी फोन नंबर या लिंक को अपनी क्षेत्रीय भाषा में सत्यापित कर सकते हैं।'
                  : 'Citizens on 2G/feature phones call 139 to verify any phone number, SMS sender, or refund link in their native regional language.'}
              </p>

              <form onSubmit={handleIvrCall} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="ivr-caller" className="block text-xs text-token-text-muted mb-1">
                      {isHindi ? 'कॉलर फोन नंबर' : 'Caller Mobile Number'}
                    </label>
                    <input
                      id="ivr-caller"
                      type="text"
                      value={ivrPhone}
                      onChange={(e) => setIvrPhone(e.target.value)}
                      className="w-full text-xs p-2 border border-token-border rounded bg-token-surface text-token-text-primary"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="ivr-lang" className="block text-xs text-token-text-muted mb-1">
                      {isHindi ? 'आईवीआर संवाद भाषा' : 'IVR Regional Language'}
                    </label>
                    <select
                      id="ivr-lang"
                      aria-label="IVR Language Selector"
                      value={ivrLang}
                      onChange={(e) => setIvrLang(e.target.value as typeof ivrLang)}
                      className="w-full text-xs p-2 border border-token-border rounded bg-token-surface text-token-text-primary"
                    >
                      <option value="hi-IN">हिन्दी (Hindi - hi-IN)</option>
                      <option value="en-IN">English (Indian - en-IN)</option>
                      <option value="ta-IN">தமிழ் (Tamil - ta-IN)</option>
                      <option value="te-IN">తెలుగు (Telugu - te-IN)</option>
                      <option value="bn-IN">বাংলা (Bengali - bn-IN)</option>
                      <option value="mr-IN">मराठी (Marathi - mr-IN)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="ivr-query" className="block text-xs text-token-text-muted mb-1">
                      {isHindi ? 'सत्यापन प्रश्न (नंबर, लिंक, या डोमेन)' : 'Query Entity (Number, Link, or Domain)'}
                    </label>
                    <input
                      id="ivr-query"
                      type="text"
                      value={ivrQuery}
                      onChange={(e) => setIvrQuery(e.target.value)}
                      className="w-full text-xs p-2 border border-token-border rounded bg-token-surface text-token-text-primary"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="ivr-input-type" className="block text-xs text-token-text-muted mb-1">
                      {isHindi ? 'इनपुट विधि' : 'Input Mode'}
                    </label>
                    <select
                      id="ivr-input-type"
                      aria-label="IVR Input Mode"
                      value={ivrInputType}
                      onChange={(e) => setIvrInputType(e.target.value as typeof ivrInputType)}
                      className="w-full text-xs p-2 border border-token-border rounded bg-token-surface text-token-text-primary"
                    >
                      <option value="DTMF_DIGITS">DTMF Keypad (Phone Digits)</option>
                      <option value="SPEECH_TEXT">ASR Voice Recognition (Speech)</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="text-xs text-token-text-muted self-center">{isHindi ? 'त्वरित नमूने:' : 'Quick samples:'}</span>
                  <button
                    type="button"
                    onClick={() => setIvrQuery('139')}
                    className="button button-small button-secondary"
                  >
                    139 (Official)
                  </button>
                  <button
                    type="button"
                    onClick={() => setIvrQuery('irctc.co.in')}
                    className="button button-small button-secondary"
                  >
                    irctc.co.in (Official)
                  </button>
                  <button
                    type="button"
                    onClick={() => setIvrQuery('refund.irctc@oksbi')}
                    className="button button-small button-secondary"
                  >
                    refund.irctc@oksbi (Scam)
                  </button>
                  <button
                    type="button"
                    onClick={() => setIvrQuery('9876543210')}
                    className="button button-small button-secondary"
                  >
                    +91 9876543210 (Scam)
                  </button>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={ivrLoading}
                    className="button button-small button-primary"
                  >
                    {ivrLoading
                      ? (isHindi ? 'कॉल कनेक्ट हो रही है...' : 'Connecting Call...')
                      : (isHindi ? '📞 आईवीआर कॉल डायल करें और सुनें' : '📞 Dial IVR & Verify Voice Prompt')}
                  </button>
                </div>
              </form>

              {ivrResult && (
                <div className="p-4 bg-token-surface-subtle border border-token-border rounded-lg space-y-3">
                  <div className="flex flex-wrap justify-between items-center gap-2 border-b border-token-border pb-2">
                    <span className="text-xs font-bold text-token-text-primary">
                      Session: {ivrResult.call_session_id} • Language: {ivrResult.language}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-bold ${
                        ivrResult.classification === 'OFFICIAL'
                          ? 'bg-token-surface border border-token-success text-token-success'
                          : 'bg-token-surface border border-token-danger text-token-danger'
                      }`}
                    >
                      {ivrResult.classification} (Risk: {ivrResult.risk_score}/100)
                    </span>
                  </div>

                  <div>
                    <span className="text-xs text-token-text-muted font-semibold block mb-1">
                      {isHindi ? 'आईवीआर बोले गए संवाद:' : 'IVR Spoken Audio Script:'}
                    </span>
                    <div className="p-3 bg-token-surface border border-token-border rounded text-xs text-token-text-primary font-medium">
                      🔊 &ldquo;{ivrResult.audio_script}&rdquo;
                    </div>
                  </div>

                  <div>
                    <span className="text-xs text-token-text-muted font-semibold block mb-1">
                      {isHindi ? 'टेलीकॉम एसएसएमएल मार्कअप:' : 'Telecom SSML Markup:'}
                    </span>
                    <pre className="p-2 bg-token-surface border border-token-border rounded text-[11px] font-mono text-token-text-primary whitespace-pre-wrap break-all">
                      {ivrResult.ssml_markup}
                    </pre>
                  </div>

                  <div className="p-2 bg-token-surface border border-token-border rounded text-xs text-token-text-primary">
                    <span className="font-bold">⚠️ Safety Guidance: </span>
                    {ivrResult.safety_guidance}
                  </div>
                </div>
              )}
            </div>

            {/* History */}
            <div className="p-5 border border-token-border rounded-lg bg-token-surface space-y-3">
              <h3 className="text-sm font-bold text-token-text-primary">
                {isHindi ? 'हालिया आईवीआर सत्यापन' : 'Recent IVR Verification Calls'}
              </h3>
              <div className="space-y-2">
                {ivrHistory.map((item) => (
                  <div key={item.session_id} className="p-2 bg-token-surface-subtle border border-token-border rounded text-xs space-y-1">
                    <div className="flex justify-between font-semibold text-token-text-primary">
                      <span>{item.query_input}</span>
                      <span className={item.classification === 'OFFICIAL' ? 'text-token-success' : 'text-token-danger'}>
                        {item.classification}
                      </span>
                    </div>
                    <div className="text-[11px] text-token-text-muted flex justify-between">
                      <span>{item.caller_number} ({item.language})</span>
                      <span>Risk: {item.risk_score}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Telecom DLT & UPI Shield */}
      {activeTab === 'telecom_upi' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Telecom Header */}
          <div className="p-5 border border-token-border rounded-lg bg-token-surface space-y-4">
            <h3 className="text-base font-bold text-token-text-primary">
              {isHindi ? 'ट्राई डीएलटी एसएमएस हेडर सत्यापन' : 'TRAI DLT SMS Header Registry'}
            </h3>
            <p className="text-xs text-token-text-muted">
              {isHindi
                ? 'टेलीकॉम गेटवे पर जाली एसएमएस हेडर को रोकने के लिए पंजीकृत संस्थाओं का सत्यापन।'
                : 'Validates DLT principal entity IDs and alpha headers before delivery to stop SMS spoofing attacks.'}
            </p>

            <form onSubmit={handleSmsVerify} className="space-y-3">
              <div>
                <label htmlFor="sms-header-input" className="block text-xs text-token-text-muted mb-1">
                  {isHindi ? 'एसएमएस हेडर' : 'SMS Header'}
                </label>
                <input
                  id="sms-header-input"
                  type="text"
                  value={smsHeader}
                  onChange={(e) => setSmsHeader(e.target.value)}
                  className="w-full text-xs p-2 border border-token-border rounded bg-token-surface text-token-text-primary"
                  required
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSmsHeader('VM-IRCTC')}
                  className="button button-small button-secondary"
                >
                  VM-IRCTC
                </button>
                <button
                  type="button"
                  onClick={() => setSmsHeader('AD-RAILIN')}
                  className="button button-small button-secondary"
                >
                  AD-RAILIN
                </button>
                <button
                  type="button"
                  onClick={() => setSmsHeader('IRCTCi')}
                  className="button button-small button-secondary"
                >
                  IRCTCi (Spoof)
                </button>
              </div>

              <button type="submit" disabled={smsLoading} className="button button-small button-primary">
                {smsLoading ? 'Verifying...' : 'Verify DLT Header'}
              </button>
            </form>

            {smsResult && (
              <div className="p-3 border border-token-border bg-token-surface-subtle rounded text-xs space-y-1.5">
                <div className="flex justify-between items-center font-bold">
                  <span className="text-token-text-primary">{smsResult.sms_header}</span>
                  <span className={smsResult.verdict === 'OFFICIAL_DLT_VERIFIED' ? 'text-token-success' : 'text-token-danger'}>
                    {smsResult.verdict}
                  </span>
                </div>
                <p className="text-token-text-muted">
                  <span className="font-semibold">{isHindi ? 'संस्था: ' : 'Entity: '}</span>
                  {smsResult.principal_entity}
                </p>
                <p className="text-token-text-muted">
                  <span className="font-semibold">{isHindi ? 'कार्रवाई: ' : 'Action: '}</span>
                  <span className="font-bold text-token-accent">{smsResult.telecom_action}</span>
                </p>
                <p className="text-token-text-muted text-[11px] border-t border-token-border pt-1">
                  {smsResult.explanation}
                </p>
              </div>
            )}
          </div>

          {/* UPI Shield */}
          <div className="p-5 border border-token-border rounded-lg bg-token-surface space-y-4">
            <h3 className="text-base font-bold text-token-text-primary">
              {isHindi ? 'रेलवे यूपीआई मर्चेंट शील्ड' : 'Railway UPI Merchant Shield'}
            </h3>
            <p className="text-xs text-token-text-muted">
              {isHindi
                ? 'आईआरसीटीसी के नाम पर फर्जी रिफंड कलेक्ट रिक्वेस्ट और व्यक्तिगत खातों के यूपीआई हैंडल की त्वरित पहचान।'
                : 'Blocks fake refund collect requests and checks UPI VPAs against the official Indian Railway merchant registry.'}
            </p>

            <form onSubmit={handleUpiVerify} className="space-y-3">
              <div>
                <label htmlFor="upi-vpa-input" className="block text-xs text-token-text-muted mb-1">
                  {isHindi ? 'यूपीआई हैंडल (VPA)' : 'UPI VPA Handle'}
                </label>
                <input
                  id="upi-vpa-input"
                  type="text"
                  value={upiHandle}
                  onChange={(e) => setUpiHandle(e.target.value)}
                  className="w-full text-xs p-2 border border-token-border rounded bg-token-surface text-token-text-primary"
                  required
                />
              </div>

              <div>
                <label htmlFor="upi-amount-input" className="block text-xs text-token-text-muted mb-1">
                  {isHindi ? 'राशि (INR)' : 'Amount (INR)'}
                </label>
                <input
                  id="upi-amount-input"
                  type="number"
                  value={upiAmount}
                  onChange={(e) => setUpiAmount(Number(e.target.value))}
                  className="w-full text-xs p-2 border border-token-border rounded bg-token-surface text-token-text-primary"
                  required
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setUpiHandle('irctc@icici')}
                  className="button button-small button-secondary"
                >
                  irctc@icici
                </button>
                <button
                  type="button"
                  onClick={() => setUpiHandle('refund.irctc@oksbi')}
                  className="button button-small button-secondary"
                >
                  refund.irctc@oksbi
                </button>
              </div>

              <button type="submit" disabled={upiLoading} className="button button-small button-primary">
                {upiLoading ? 'Verifying...' : 'Verify UPI Handle'}
              </button>
            </form>

            {upiResult && (
              <div className="p-3 border border-token-border bg-token-surface-subtle rounded text-xs space-y-1.5">
                <div className="flex justify-between items-center font-bold">
                  <span className="text-token-text-primary">{upiResult.vpa_handle}</span>
                  <span className={upiResult.risk_level === 'LOW_VERIFIED' ? 'text-token-success' : 'text-token-danger'}>
                    {upiResult.risk_level}
                  </span>
                </div>
                <p className="text-token-text-muted">
                  <span className="font-semibold">Merchant: </span>
                  {upiResult.merchant_name}
                </p>
                <p className="text-token-text-muted">
                  <span className="font-semibold">Action: </span>
                  <span className="font-bold text-token-accent">{upiResult.recommended_action}</span>
                </p>
                <p className="text-token-text-muted text-[11px] border-t border-token-border pt-1">
                  {upiResult.warning_message}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Fraud-Ring Syndicates Graph */}
      {activeTab === 'fraud_rings' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold text-token-text-primary">
              {isHindi ? 'ग्राफ-आधारित संगठित सिंडिकेट डिटेक्टर' : 'Graph-Based Organized Fraud-Ring Syndicates'}
            </h3>
            <span className="text-xs text-token-text-muted">
              {initialFraudRings.total_active_syndicates} Syndicates • {initialFraudRings.total_nodes_tracked} Nodes • {initialFraudRings.total_edges_mapped} Links
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {initialFraudRings.syndicates.map((syndicate) => (
              <div key={syndicate.syndicate_id} className="p-4 border border-token-danger bg-token-surface rounded-lg space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-xs font-mono font-bold text-token-danger block">{syndicate.syndicate_id}</span>
                    <h4 className="text-sm font-bold text-token-text-primary">{syndicate.name}</h4>
                    <span className="text-[11px] text-token-text-muted">{syndicate.origin_district}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-token-surface border border-token-danger text-token-danger">
                    {syndicate.risk_level}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-token-surface-subtle p-2.5 rounded border border-token-border">
                  <div>
                    <span className="text-token-text-muted block text-[11px]">Victims:</span>
                    <span className="font-bold text-token-text-primary">{syndicate.estimated_victim_count} citizens</span>
                  </div>
                  <div>
                    <span className="text-token-text-muted block text-[11px]">Estimated Fraud:</span>
                    <span className="font-bold text-token-text-primary">₹{(syndicate.estimated_fraud_inr / 100000).toFixed(1)} Lakhs</span>
                  </div>
                  <div className="col-span-2 pt-1 border-t border-token-border">
                    <span className="text-token-text-muted block text-[11px]">Central Hub Node:</span>
                    <span className="font-mono text-token-danger text-[11px]">{syndicate.central_hub}</span>
                  </div>
                </div>

                <div>
                  <span className="text-xs font-semibold text-token-text-primary block mb-1">
                    Connected Nodes ({syndicate.nodes.length}):
                  </span>
                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    {syndicate.nodes.map((node) => (
                      <div key={node.id} className="p-1.5 bg-token-surface-subtle border border-token-border rounded flex justify-between">
                        <span className="truncate max-w-[120px] text-token-text-primary">{node.label}</span>
                        <span className="text-token-danger font-bold text-[10px]">{node.risk_score}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 5: Model Drift & Bug Bounty */}
      {activeTab === 'drift_bounty' && (
        <div className="space-y-6">
          <div className="p-5 border border-token-border rounded-lg bg-token-surface space-y-3">
            <h3 className="text-base font-bold text-token-text-primary">
              {isHindi ? 'एआई मॉडल ड्रिफ्ट और निरंतर पुनःप्रशिक्षण' : 'AI Model Drift & Continuous Retraining Pipeline'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="p-3 bg-token-surface-subtle border border-token-border rounded">
                <span className="text-xs text-token-text-muted block">PSI Metric</span>
                <span className="text-xl font-bold text-token-success block">{initialDrift.population_stability_index}</span>
                <span className="text-[10px] text-token-text-muted">Threshold: {initialDrift.psi_threshold}</span>
              </div>
              <div className="p-3 bg-token-surface-subtle border border-token-border rounded">
                <span className="text-xs text-token-text-muted block">False Positive Rate</span>
                <span className="text-xl font-bold text-token-text-primary block">{initialDrift.false_positive_rate_percent}%</span>
                <span className="text-[10px] text-token-success">&lt; 0.2% SLA achieved</span>
              </div>
              <div className="p-3 bg-token-surface-subtle border border-token-border rounded">
                <span className="text-xs text-token-text-muted block">F1-Score</span>
                <span className="text-xl font-bold text-token-text-primary block">{initialDrift.f1_score}</span>
                <span className="text-[10px] text-token-text-muted">284k slices evaluated</span>
              </div>
              <div className="p-3 bg-token-surface-subtle border border-token-border rounded">
                <span className="text-xs text-token-text-muted block">Pipeline Status</span>
                <span className="text-sm font-bold text-token-success mt-1 block">✓ {initialDrift.retraining_pipeline_status}</span>
                <span className="text-[10px] text-token-text-muted">Continuous</span>
              </div>
            </div>
          </div>

          <div className="p-5 border border-token-border rounded-lg bg-token-surface space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-token-text-primary">
                {isHindi ? 'जिम्मेदार प्रकटीकरण एवं बग बाउंटी' : 'Responsible Disclosure & Bug Bounty Hall of Fame'}
              </h3>
              <span className="text-xs text-token-text-muted">
                {initialBounty.valid_bounties_awarded} Bounties • ₹{initialBounty.total_bounties_inr.toLocaleString()} Awarded
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {initialBounty.researchers.map((res) => (
                <div key={res.handle} className="p-3 bg-token-surface-subtle border border-token-border rounded space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xs text-token-text-primary">{res.handle}</span>
                    <span className="text-[10px] font-bold text-token-accent">{res.badge}</span>
                  </div>
                  <p className="text-[11px] text-token-text-muted">{res.specialization}</p>
                  <div className="flex justify-between text-xs pt-1 border-t border-token-border">
                    <span className="text-token-text-muted">{res.valid_reports} bugs</span>
                    <span className="font-bold text-token-success">₹{res.bounty_awarded_inr.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
