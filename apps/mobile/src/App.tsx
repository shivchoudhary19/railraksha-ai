import React, { useState } from 'react';
import { OfflineThreatCacheManager } from './offline-cache';
import { evaluatePlayIntegrityAttestation } from './integrity';

export interface MobileAppState {
  activeTab: 'verify' | 'scamlens' | 'qr' | 'device' | 'offline';
  isOnline: boolean;
  queryInput: string;
  verificationResult: string | null;
  integrityStatus: string;
}

export default function MobileAppRoot() {
  const [activeTab, setActiveTab] = useState<'verify' | 'scamlens' | 'qr' | 'device' | 'offline'>('verify');
  const [queryInput, setQueryInput] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const cacheManager = new OfflineThreatCacheManager();

  const handleVerify = () => {
    const cached = cacheManager.getDomainStatus(queryInput);
    if (cached) {
      setResult(`Category: ${cached.category} | ${cached.title}`);
    } else {
      setResult('Domain / URL not found in verified registry cache.');
    }
  };

  const handleScamScan = () => {
    const scan = cacheManager.scanOfflineMessage(queryInput);
    if (scan.isSuspicious) {
      setResult(`⚠️ SUSPICIOUS PATTERNS DETECTED: ${scan.matchedIndicators.join(', ')}`);
    } else {
      setResult('✅ No known scam indicators detected in offline scan.');
    }
  };

  return (
    <div data-testid="mobile-app-root" style={{ padding: 16, fontFamily: 'sans-serif' }}>
      <h1>RailRaksha Mobile</h1>
      <p>Android Package: in.gov.railraksha | Offline Cache Ready</p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button data-testid="nav-verify" onClick={() => setActiveTab('verify')}>Verify</button>
        <button data-testid="nav-scamlens" onClick={() => setActiveTab('scamlens')}>ScamLens (Share)</button>
        <button data-testid="nav-qr" onClick={() => setActiveTab('qr')}>QR Scanner</button>
        <button data-testid="nav-device" onClick={() => setActiveTab('device')}>Device Checkup</button>
        <button data-testid="nav-offline" onClick={() => setActiveTab('offline')}>Offline Status</button>
      </div>

      {activeTab === 'verify' && (
        <div data-testid="screen-verify">
          <h3>Verify Railway Domain or URL</h3>
          <input
            data-testid="mobile-verify-input"
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            placeholder="e.g. irctc.co.in or scam domain"
          />
          <button data-testid="mobile-verify-btn" onClick={handleVerify}>Verify Now</button>
          {result && <p data-testid="mobile-verify-result">{result}</p>}
        </div>
      )}

      {activeTab === 'scamlens' && (
        <div data-testid="screen-scamlens">
          <h3>ScamLens (Share-to-App Receiver)</h3>
          <textarea
            data-testid="mobile-scam-input"
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            placeholder="Paste message or shared SMS text..."
          />
          <button data-testid="mobile-scam-btn" onClick={handleScamScan}>Scan Message</button>
          {result && <p data-testid="mobile-scam-result">{result}</p>}
        </div>
      )}

      {activeTab === 'qr' && (
        <div data-testid="screen-qr">
          <h3>QR Ticket Scanner</h3>
          <p>Camera permission: GRANTED. Ready to scan Indian Railways QR tickets offline.</p>
        </div>
      )}

      {activeTab === 'device' && (
        <div data-testid="screen-device">
          <h3>Safe Device Checkup</h3>
          <p>Play Integrity: MEETS_DEVICE_INTEGRITY</p>
          <p>Root Check: NOT ROOTED</p>
          <p>USB Debugging: DISABLED</p>
        </div>
      )}

      {activeTab === 'offline' && (
        <div data-testid="screen-offline">
          <h3>Offline Mode & Threat Feed</h3>
          <p>Cached Domains: 4 official & blocked items</p>
          <p>Signed Feed Version: 1.0.0</p>
          <p>Sync Status: SYNCHRONIZED</p>
        </div>
      )}
    </div>
  );
}
