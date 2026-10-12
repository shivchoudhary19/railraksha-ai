// RailRaksha Shield - Popup Script

let currentLang = 'en';

const i18n = {
  en: {
    title: 'RailRaksha Shield',
    labelCurrent: 'Current Domain',
    checking: 'Checking...',
    official: 'OFFICIAL RAILWAY ASSET',
    blocked: 'KNOWN SCAM / MALICIOUS',
    unknown: 'UNVERIFIED DOMAIN',
    feedVer: 'Feed: v1',
    feedProtected: 'Protected',
    btnReport: 'Report Phishing Site',
    btnVerify: 'Official Directory',
    langToggle: 'हिंदी',
  },
  hi: {
    title: 'रेल रक्षा शील्ड',
    labelCurrent: 'वर्तमान डोमेन',
    checking: 'जांच जारी है...',
    official: 'आधिकारिक रेलवे संपत्ति',
    blocked: 'पुष्ट धोखाधड़ी / असुरक्षित',
    unknown: 'असत्यापित डोमेन',
    feedVer: 'संस्करण: 1',
    feedProtected: 'सुरक्षित',
    btnReport: 'धोखाधड़ी की रिपोर्ट करें',
    btnVerify: 'आधिकारिक निर्देशिका',
    langToggle: 'English',
  }
};

function updateStrings() {
  const dict = i18n[currentLang];
  document.getElementById('title-text').textContent = dict.title;
  document.getElementById('label-current').textContent = dict.labelCurrent;
  document.getElementById('feed-status').textContent = dict.feedProtected;
  document.getElementById('btn-report').textContent = dict.btnReport;
  document.getElementById('btn-verify').textContent = dict.btnVerify;
  document.getElementById('toggle-lang').textContent = dict.langToggle;
}

document.getElementById('toggle-lang').addEventListener('click', () => {
  currentLang = currentLang === 'en' ? 'hi' : 'en';
  updateStrings();
  refreshDomainVerdict();
});

let cachedDomain = '';
let cachedVerdict = 'unknown';

function renderVerdict(verdict) {
  cachedVerdict = verdict;
  const badge = document.getElementById('verdict-badge');
  const dict = i18n[currentLang];
  badge.className = 'status-badge';

  if (verdict === 'official') {
    badge.classList.add('status-official');
    badge.textContent = dict.official;
  } else if (verdict === 'blocked') {
    badge.classList.add('status-blocked');
    badge.textContent = dict.blocked;
  } else {
    badge.classList.add('status-unknown');
    badge.textContent = dict.unknown;
  }
}

function refreshDomainVerdict() {
  if (cachedDomain) {
    document.getElementById('current-domain').textContent = cachedDomain;
  }
  renderVerdict(cachedVerdict);
}

// Query active tab
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (!tabs || tabs.length === 0 || !tabs[0].url) {
    document.getElementById('current-domain').textContent = 'No active webpage';
    return;
  }

  try {
    const url = new URL(tabs[0].url);
    cachedDomain = url.hostname;
    document.getElementById('current-domain').textContent = cachedDomain;

    chrome.runtime.sendMessage({ type: 'CHECK_DOMAIN', domain: cachedDomain }, (resp) => {
      if (resp && resp.verdict) {
        renderVerdict(resp.verdict);
        if (resp.version) {
          document.getElementById('feed-ver').textContent = `Feed: v${resp.version}`;
        }
      }
    });
  } catch {
    document.getElementById('current-domain').textContent = 'Internal Page';
  }
});
