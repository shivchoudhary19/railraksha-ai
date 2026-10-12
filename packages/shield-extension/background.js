// RailRaksha Shield - Background Service Worker
// Privacy-preserving 4-byte prefix matching for railway threat defense

const DEFAULT_API_URL = 'http://localhost:8000';
let cachedThreats = {
  version: 0,
  blockedPrefixes: new Set(),
  officialPrefixes: new Set(),
  lastUpdated: null,
};

async function sha256Hex(str) {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(str));
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function computePrefix(domain) {
  const norm = domain.trim().toLowerCase();
  const hash = await sha256Hex(norm);
  return hash.slice(0, 8);
}

// Fallback seed prefixes for offline bootstrap
const SEED_BLOCKED = ['746c1a8e', 'e93b1660', 'b6fdb98a', '31d27993'];
const SEED_OFFICIAL = ['b61d4734', '1b250550', 'd7ea7e9f', 'cbb648d7'];

async function initializeThreatCache() {
  const stored = await chrome.storage.local.get(['shieldThreats']);
  if (stored.shieldThreats) {
    cachedThreats = {
      version: stored.shieldThreats.version,
      blockedPrefixes: new Set(stored.shieldThreats.blockedPrefixes || []),
      officialPrefixes: new Set(stored.shieldThreats.officialPrefixes || []),
      lastUpdated: stored.shieldThreats.lastUpdated,
    };
  } else {
    cachedThreats.blockedPrefixes = new Set(SEED_BLOCKED);
    cachedThreats.officialPrefixes = new Set(SEED_OFFICIAL);
  }
  syncThreatFeed();
}

async function syncThreatFeed() {
  try {
    const res = await fetch(`${DEFAULT_API_URL}/v1/shield/threat-list`);
    if (!res.ok) return;
    const data = await res.json();
    
    // Verify checksum
    const rawPayload = `version=${data.version}&time=${data.timestamp}&blocked=${data.blocked_prefixes.join(',')}&official=${data.official_prefixes.join(',')}`;
    const calculatedChecksum = await sha256Hex(rawPayload);
    if (calculatedChecksum !== data.sha256_checksum) {
      console.warn('[RailRaksha Shield] Signature verification mismatch. Rejecting untrusted threat list.');
      return;
    }

    cachedThreats = {
      version: data.version,
      blockedPrefixes: new Set(data.blocked_prefixes),
      officialPrefixes: new Set(data.official_prefixes),
      lastUpdated: data.timestamp,
    };

    await chrome.storage.local.set({
      shieldThreats: {
        version: data.version,
        blockedPrefixes: data.blocked_prefixes,
        officialPrefixes: data.official_prefixes,
        lastUpdated: data.timestamp,
      }
    });
  } catch (err) {
    console.debug('[RailRaksha Shield] Feed sync deferred:', err.message);
  }
}

async function evaluateTab(tabId, url) {
  if (!url || !url.startsWith('http')) return;
  try {
    const hostname = new URL(url).hostname;
    const prefix = await computePrefix(hostname);

    if (cachedThreats.blockedPrefixes.has(prefix)) {
      chrome.action.setBadgeText({ tabId, text: '!' });
      chrome.action.setBadgeBackgroundColor({ tabId, color: '#DC2626' });
    } else if (cachedThreats.officialPrefixes.has(prefix)) {
      chrome.action.setBadgeText({ tabId, text: '✓' });
      chrome.action.setBadgeBackgroundColor({ tabId, color: '#16A34A' });
    } else {
      chrome.action.setBadgeText({ tabId, text: '' });
    }
  } catch {
    // Ignore invalid or internal URLs
  }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url || changeInfo.status === 'complete') {
    evaluateTab(tabId, tab.url);
  }
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  evaluateTab(activeInfo.tabId, tab.url);
});

chrome.runtime.onInstalled.addListener(() => {
  initializeThreatCache();
  chrome.alarms.create('shield_sync', { periodInMinutes: 30 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'shield_sync') {
    syncThreatFeed();
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CHECK_DOMAIN') {
    computePrefix(message.domain).then(prefix => {
      let verdict = 'unknown';
      if (cachedThreats.blockedPrefixes.has(prefix)) verdict = 'blocked';
      if (cachedThreats.officialPrefixes.has(prefix)) verdict = 'official';
      sendResponse({ verdict, prefix, version: cachedThreats.version });
    });
    return true;
  }
  if (message.type === 'GET_STATUS') {
    sendResponse({
      version: cachedThreats.version,
      blockedCount: cachedThreats.blockedPrefixes.size,
      officialCount: cachedThreats.officialPrefixes.size,
      lastUpdated: cachedThreats.lastUpdated,
    });
    return true;
  }
});
