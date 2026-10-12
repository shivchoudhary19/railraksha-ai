// RailRaksha Shield - Content Script
// Real-time detection of deceptive credential & payment forms targeting railway travelers

(function() {
  const host = window.location.hostname.toLowerCase();
  
  // Whitelist standard local testing / official roots
  if (host === 'localhost' || host === '127.0.0.1') return;

  chrome.runtime.sendMessage({ type: 'CHECK_DOMAIN', domain: host }, (response) => {
    if (!response) return;
    
    if (response.verdict === 'blocked') {
      injectWarningBanner('blocked');
      return;
    }

    if (response.verdict === 'official') {
      // Confirmed genuine railway domain - safe
      return;
    }

    // Domain is unverified / unknown: evaluate heuristic phishing triggers
    evaluateFormDeception();
  });

  function evaluateFormDeception() {
    const textContent = (document.title + ' ' + (document.body ? document.body.innerText.slice(0, 5000) : '')).toLowerCase();
    const railwayKeywords = ['irctc', 'tatkal', 'pnr status', 'indian railways', 'cris uts', 'rail madad'];
    const hasRailwayKeyword = railwayKeywords.some(kw => textContent.includes(kw));

    if (!hasRailwayKeyword) return;

    // Check for credential / payment inputs
    const sensitiveInputs = document.querySelectorAll(
      'input[type="password"], input[name*="otp" i], input[name*="pin" i], input[name*="cvv" i], input[name*="card" i], input[name*="upi" i]'
    );

    if (sensitiveInputs.length > 0) {
      injectWarningBanner('suspicious');
    }
  }

  function injectWarningBanner(kind) {
    if (document.getElementById('railraksha-shield-alert')) return;

    const banner = document.createElement('div');
    banner.id = 'railraksha-shield-alert';
    banner.setAttribute('role', 'alert');
    banner.style.position = 'fixed';
    banner.style.top = '0';
    banner.style.left = '0';
    banner.style.right = '0';
    banner.style.zIndex = '2147483647';
    banner.style.backgroundColor = kind === 'blocked' ? '#991B1B' : '#B45309';
    banner.style.color = '#FFFFFF';
    banner.style.padding = '12px 20px';
    banner.style.fontFamily = 'system-ui, -apple-system, sans-serif';
    banner.style.fontSize = '14px';
    banner.style.fontWeight = '600';
    banner.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
    banner.style.display = 'flex';
    banner.style.alignItems = 'center';
    banner.style.justifyContent = 'space-between';

    const text = kind === 'blocked'
      ? '🚨 RAILRAKSHA SHIELD ALERT: This domain is a CONFIRMED Railway Scam. Do NOT enter PNR, OTP, or Banking details!'
      : '⚠️ RAILRAKSHA SHIELD WARNING: Unverified site using Indian Railway branding. Beware of fake Tatkal booking & phishing!';

    banner.innerHTML = `
      <div style="display:flex; align-items:center; gap:12px;">
        <span style="font-size:20px;">🛡️</span>
        <span>${text}</span>
      </div>
      <div style="display:flex; align-items:center; gap:10px;">
        <a href="http://localhost:3000/en/verify" target="_blank" style="color:#FFFFFF; background:rgba(255,255,255,0.2); padding:6px 12px; border-radius:4px; text-decoration:none; font-size:12px;">Verify Official Registry</a>
        <button id="railraksha-dismiss-btn" style="background:transparent; border:none; color:#FFFFFF; font-size:18px; cursor:pointer; padding:0 8px;">✕</button>
      </div>
    `;

    document.body.prepend(banner);

    const dismissBtn = banner.querySelector('#railraksha-dismiss-btn');
    if (dismissBtn) {
      dismissBtn.addEventListener('click', () => {
        banner.remove();
      });
    }
  }
})();
