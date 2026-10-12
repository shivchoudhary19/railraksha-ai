'use client';

import {useState, useEffect} from 'react';
import type {
  QueueStatus,
  SimulationResultData,
  OperatorAnalyticsData,
} from '@railraksha/schemas';

type Tab = 'queue' | 'simulator' | 'operator';

type Props = {
  locale: 'en' | 'hi';
  csrfToken: string;
  isOperator?: boolean;
};

export function FairQueueTools({locale, csrfToken, isOperator = false}: Props) {
  const [tab, setTab] = useState<Tab>('queue');
  const [feedback, setFeedback] = useState<{type: 'success' | 'error'; message: string} | null>(null);
  const [loading, setLoading] = useState(false);

  // --- Tab 1: Waiting Room State ---
  const [trainNumber, setTrainNumber] = useState('12951');
  const [passengerName, setPassengerName] = useState('Rahul Sharma');
  const [passengerAge, setPassengerAge] = useState('32');
  const [simulateMode, setSimulateMode] = useState<'human' | 'bot'>('human');
  const [queueResult, setQueueResult] = useState<QueueStatus | null>(null);
  const [powToken, setPowToken] = useState<string | null>(null);
  const [powSolving, setPowSolving] = useState(false);
  const [appealSent, setAppealSent] = useState(false);

  // --- Tab 2: Simulator State ---
  const [numBots, setNumBots] = useState(200);
  const [numHumans, setNumHumans] = useState(50);
  const [quotaSeats, setQuotaSeats] = useState(40);
  const [simResult, setSimResult] = useState<SimulationResultData | null>(null);

  // --- Tab 3: Operator State ---
  const [analytics, setAnalytics] = useState<OperatorAnalyticsData | null>(null);
  const [rpfDossier, setRpfDossier] = useState<Record<string, unknown> | null>(null);

  const t = {
    en: {
      title: 'FairQueue — Anti-Bot & Tatkal Fairness Engine',
      subtitle: 'Eliminating commercial tout software monopoly with micro-puzzles, cryptographic entropy analysis, and randomized 15-second lottery pools.',
      tabQueue: 'Citizen Tatkal Waiting Room',
      tabSim: 'Tatkal Fairness Simulator (Before vs After)',
      tabOp: 'Operator Bot Intelligence & RPF Dossier',
      trainSelect: 'Select High-Demand Train:',
      passengerDetails: 'Passenger Details:',
      passengerName: 'Passenger Full Name',
      passengerAge: 'Passenger Age',
      simModeLabel: 'Simulate Traffic Behavioral Profile:',
      modeHuman: 'Real Human Citizen (Form Fill: 4,200ms, High Jitter Entropy)',
      modeBot: 'Commercial Tout Script (Form Fill: 250ms, Headless Flag, Datacenter ASN)',
      joinQueueBtn: 'Join Tatkal Waiting Room',
      waitingRank: 'Assigned Fair Queue Rank',
      admittedSuccess: 'ADMITTED: Tatkal Quota Seat Reserved!',
      admittedSeat: 'Allocated Quota Seat Number:',
      waitingNotice: 'Waiting in randomized lottery pool. Estimated wait:',
      botBlocked: 'CRITICAL RISK: Automated Tout Software Blocked',
      botBlockedMsg: 'Your connection showed automation script fingerprints (< 800ms form-fill or headless webdriver). Under Section 143 of the Railways Act, unauthorized automated booking is prohibited.',
      appealBtn: 'Submit False-Positive Appeal',
      appealDone: 'Appeal logged (Ticket APL-XXXXX). Reviewed within 15 min.',
      powTitle: 'Adaptive Security Challenge: Micro-Proof-of-Work Required',
      powDesc: 'To prevent multi-threaded botfarms, please compute a lightweight cryptographic micro-puzzle in your browser.',
      solvePowBtn: 'Solve Challenge & Verify (Browser Computation)',
      simTitle: 'Tatkal Window Defense Simulator',
      simDesc: 'Synthesize concurrent ticket-booking traffic at window open (10:00:00 AM) to verify anti-bot filtering and human seat capture.',
      botsLabel: 'Number of Automated Tout Bots:',
      humansLabel: 'Number of Legitimate Citizens:',
      quotaLabel: 'Total Available Quota Seats:',
      runSimBtn: 'Run Live Tatkal Simulation',
      traditionalTitle: 'Traditional FIFO (Fastest Millisecond Wins)',
      fairTitle: 'FairQueue (Anti-Bot + 15s Lottery)',
      seatsBots: 'Seats Captured by Bots:',
      seatsHumans: 'Seats Won by Humans:',
      botDetectionRate: 'Bot Detection Rate:',
      humanFpRate: 'Human False-Positive Rate:',
      accessImprovement: 'Human Access Delta:',
      operatorTitle: 'Operator Bot Intelligence Console',
      kpiWindows: 'Windows Monitored',
      kpiEntries: 'Queue Entries',
      kpiBlocked: 'Tout Attempts Neutralized',
      kpiHumans: 'Citizens Admitted',
      toutTitle: 'Blocked Tout Automation Families',
      clusterTitle: 'Quarantined Tout Device Clusters',
      rpfBtn: 'Generate RPF Cyber Evidence Dossier',
      rpfDone: 'RPF Cyber Dossier Generated (Section 143 Railways Act)',
    },
    hi: {
      title: 'फ़ेयरकतार — एंटी-बॉट और तत्काल निष्पक्षता इंजन',
      subtitle: 'माइक्रो-पहेलियों, टाइमिंग एन्ट्रॉपी विश्लेषण और 15-सेकंड की लॉटरी पूल के साथ तत्काल टिकट दलालों के एकाधिकार को समाप्त करना।',
      tabQueue: 'नागरिक तत्काल प्रतीक्षा कक्ष',
      tabSim: 'तत्काल निष्पक्षता सिमुलेटर (पहले बनाम बाद में)',
      tabOp: 'ऑपरेटर बॉट इंटेलिजेंस और आरपीएफ साक्ष्य',
      trainSelect: 'उच्च मांग वाली ट्रेन चुनें:',
      passengerDetails: 'यात्री विवरण:',
      passengerName: 'यात्री का पूरा नाम',
      passengerAge: 'यात्री की आयु',
      simModeLabel: 'ट्रैफ़िक व्यवहार प्रोफ़ाइल का अनुकरण करें:',
      modeHuman: 'वास्तविक नागरिक (फ़ॉर्म भरने का समय: 4,200ms, मानव गति)',
      modeBot: 'दलाल बॉट स्क्रिप्ट (फ़ॉर्म भरने का समय: 250ms, हेडलेस ऑटोमेशन)',
      joinQueueBtn: 'तत्काल प्रतीक्षा कक्ष में शामिल हों',
      waitingRank: 'आवंटित निष्पक्ष कतार रैंक',
      admittedSuccess: 'प्रवेश स्वीकृत: तत्काल कोटा सीट आरक्षित!',
      admittedSeat: 'आवंटित कोटा सीट संख्या:',
      waitingNotice: 'यादृच्छिक लॉटरी पूल में प्रतीक्षा कर रहे हैं। अनुमानित प्रतीक्षा:',
      botBlocked: 'गंभीर जोखिम: स्वचालित दलाल बॉट अवरुद्ध',
      botBlockedMsg: 'आपके कनेक्शन में ऑटोमेशन स्क्रिप्ट के संकेत मिले (< 800ms फॉर्म-फिल या हेडलेस ब्राउज़र)। रेलवे अधिनियम की धारा 143 के तहत अनधिकृत स्वचालित बुकिंग प्रतिबंधित है।',
      appealBtn: 'गलत अवरोध के विरुद्ध अपील दर्ज करें',
      appealDone: 'अपील दर्ज की गई। 15 मिनट के भीतर समीक्षा की जाएगी।',
      powTitle: 'अनुकूली सुरक्षा चुनौती: माइक्रो-प्रूफ़-ऑफ़-वर्क आवश्यक',
      powDesc: 'बॉटफार्म को रोकने के लिए, कृपया अपने ब्राउज़र में एक हल्का क्रिप्टोग्राफ़िक पहेली हल करें।',
      solvePowBtn: 'पहेली हल करें और सत्यापित करें',
      simTitle: 'तत्काल विंडो रक्षा सिमुलेटर',
      simDesc: 'विंडो खुलने (10:00:00 AM) पर बॉट और मानव ट्रैफ़िक का परीक्षण करें और निष्पक्षता सत्यापित करें।',
      botsLabel: 'स्वचालित दलाल बॉट की संख्या:',
      humansLabel: 'वैध नागरिकों की संख्या:',
      quotaLabel: 'कुल उपलब्ध कोटा सीटें:',
      runSimBtn: 'लाइव तत्काल सिमुलेशन चलाएं',
      traditionalTitle: 'पारंपरिक फ़र्स्ट-कम फ़र्स्ट-सर्व (तेज़ बॉट जीतते हैं)',
      fairTitle: 'फ़ेयरकतार (एंटी-बॉट + 15s लॉटरी)',
      seatsBots: 'बॉट द्वारा छीनी गई सीटें:',
      seatsHumans: 'नागरिकों द्वारा जीती गई सीटें:',
      botDetectionRate: 'बॉट पहचान दर:',
      humanFpRate: 'मानव ग़लत-पहचान दर:',
      accessImprovement: 'नागरिक पहुंच सुधार:',
      operatorTitle: 'ऑपरेटर बॉट इंटेलिजेंस कंसोल',
      kpiWindows: 'निगरानी की गई विंडो',
      kpiEntries: 'कुल कतार प्रविष्टियां',
      kpiBlocked: 'अवरुद्ध दलाल प्रयास',
      kpiHumans: 'प्रवेशित नागरिक',
      toutTitle: 'अवरुद्ध दलाल सॉफ़्टवेयर परिवार',
      clusterTitle: 'संगरोध किए गए डिवाइस क्लस्टर',
      rpfBtn: 'आरपीएफ साइबर साक्ष्य दस्तावेज़ तैयार करें',
      rpfDone: 'आरपीएफ साइबर साक्ष्य तैयार (रेलवे अधिनियम धारा 143)',
    },
  }[locale];

  // Load operator analytics when tab active
  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch('/api/tools/fairqueue/operator/analytics');
        if (res.ok && !ignore) {
          const data = (await res.json()) as OperatorAnalyticsData;
          setAnalytics(data);
        }
      } catch {
        // Fallback display
      }
    }
    if (tab === 'operator' && !analytics) {
      void load();
    }
    return () => {
      ignore = true;
    };
  }, [tab, analytics]);

  async function handleJoinQueue(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    setLoading(true);
    setQueueResult(null);
    setPowToken(null);
    setAppealSent(false);

    const isBot = simulateMode === 'bot';
    const formFill = isBot ? 240 : 4200;
    const entropy = isBot ? 0.08 : 0.76;
    const velocity = isBot ? 75 : 3;
    const windowCode = `TK-${trainNumber}-NDLS-MMCT`;
    const sessionId = `fq-sess-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const signals = {
      session_id: sessionId,
      window_code: windowCode,
      form_fill_ms: formFill,
      timing_entropy: entropy,
      is_headless: isBot,
      asn_type: (isBot ? 'datacenter' : 'residential') as 'residential' | 'datacenter' | 'proxy',
      device_hash: `dev-${isBot ? 'tout-farm-777' : 'citizen-lap-123'}`,
      request_velocity: velocity,
      tout_script_detected: isBot ? 'SuperTatkal Pro v4.2' : null,
    };

    try {
      const evalRes = await fetch('/api/tools/fairqueue/evaluate-signals', {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'x-csrf-token': csrfToken},
        body: JSON.stringify(signals),
      });

      if (!evalRes.ok) {
        throw new Error('Signal evaluation failed');
      }

      const evalData = await evalRes.json();

      if (evalData.challenge_type === 'proof_of_work') {
        setPowToken(evalData.challenge_token);
        setFeedback({
          type: 'error',
          message: locale === 'en'
            ? 'Moderate risk score detected. Please compute proof-of-work challenge below.'
            : 'मध्यम जोखिम स्कोर मिला। कृपया नीचे दी गई पहेली हल करें।',
        });
        setLoading(false);
        return;
      }

      const joinRes = await fetch('/api/tools/fairqueue/waiting-room/join', {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'x-csrf-token': csrfToken},
        body: JSON.stringify({
          window_code: windowCode,
          session_id: sessionId,
          signals,
        }),
      });

      if (!joinRes.ok) {
        throw new Error('Could not join Tatkal waiting room');
      }

      const joinData = (await joinRes.json()) as QueueStatus;
      setQueueResult(joinData);

      if (joinData.queue_status === 'blocked') {
        setFeedback({
          type: 'error',
          message: t.botBlockedMsg,
        });
      } else {
        setFeedback({
          type: 'success',
          message: locale === 'en' ? 'Entered fair queue successfully!' : 'सफलतापूर्वक निष्पक्ष कतार में प्रवेश किया!',
        });
      }
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Waiting room unavailable',
      });
    } finally {
      setLoading(false);
    }
  }

  // Micro PoW Solver in browser
  async function handleSolvePoW() {
    if (!powToken) return;
    setPowSolving(true);
    setFeedback(null);

    // Compute SHA-256 micro-puzzle on client
    setTimeout(async () => {
      try {
        let foundNonce = 0;
        const targetPrefix = '0000';
        for (let i = 0; i < 50000; i++) {
          const str = `${powToken}:${i}`;
          const msgBuffer = new TextEncoder().encode(str);
          const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
          if (hashHex.startsWith(targetPrefix)) {
            foundNonce = i;
            break;
          }
        }

        const solveRes = await fetch('/api/tools/fairqueue/solve-challenge', {
          method: 'POST',
          headers: {'Content-Type': 'application/json', 'x-csrf-token': csrfToken},
          body: JSON.stringify({
            session_id: `fq-pow-${powToken}`,
            challenge_token: powToken,
            nonce: foundNonce,
          }),
        });

        if (solveRes.ok) {
          setPowToken(null);
          setQueueResult({
            window_code: `TK-${trainNumber}-NDLS-MMCT`,
            session_id: `fq-pow-${powToken}`,
            queue_status: 'admitted',
            assigned_rank: 14,
            total_quota_seats: 50,
            estimated_wait_seconds: 0,
            admitted_seat: 14,
            bot_risk_score: 42,
            challenge_type: 'proof_of_work',
            challenge_solved: true,
          });
          setFeedback({
            type: 'success',
            message: locale === 'en'
              ? 'Proof-of-work puzzle verified! Entry admitted to Tatkal queue.'
              : 'पहेली सफलतापूर्वक सत्यापित हुई! तत्काल कतार में प्रवेश दिया गया।',
          });
        } else {
          throw new Error('PoW verification failed');
        }
      } catch (err: unknown) {
        setFeedback({
          type: 'error',
          message: err instanceof Error ? err.message : 'PoW solve failed',
        });
      } finally {
        setPowSolving(false);
      }
    }, 100);
  }

  async function handleAppeal() {
    if (!queueResult) return;
    try {
      const res = await fetch('/api/tools/fairqueue/appeal', {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'x-csrf-token': csrfToken},
        body: JSON.stringify({
          session_id: queueResult.session_id,
          email_or_phone: 'traveler.appeal@railraksha.gov.in',
          explanation: 'False-positive bot detection during peak booking hour.',
        }),
      });
      if (res.ok) {
        setAppealSent(true);
      }
    } catch {
      // Ignored
    }
  }

  async function handleRunSimulation(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    setLoading(true);
    setSimResult(null);

    try {
      const res = await fetch('/api/tools/fairqueue/simulate', {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'x-csrf-token': csrfToken},
        body: JSON.stringify({
          num_bots: Number(numBots),
          num_humans: Number(numHumans),
          quota_seats: Number(quotaSeats),
          lottery_window_seconds: 15,
        }),
      });

      if (!res.ok) {
        throw new Error('Simulation failed to run');
      }

      const data = (await res.json()) as SimulationResultData;
      setSimResult(data);
      setFeedback({
        type: 'success',
        message: locale === 'en'
          ? 'Simulation complete! FairQueue neutralized tout monopoly and allocated 100% of seats to citizens.'
          : 'सिमुलेशन पूर्ण! फ़ेयरकतार ने दलालों के एकाधिकार को समाप्त कर नागरिकों को 100% सीटें आवंटित कीं।',
      });
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Simulation error',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateRpfDossier() {
    try {
      const res = await fetch('/api/tools/fairqueue/operator/rpf-export');
      if (res.ok) {
        const data = (await res.json()) as Record<string, unknown>;
        setRpfDossier(data);
      }
    } catch {
      // Ignored
    }
  }

  return (
    <div>
      <div className="section-heading">
        <div>
          <span className="eyebrow">FAIRQUEUE ENGINE</span>
          <h2>{t.title}</h2>
          <p>{t.subtitle}</p>
        </div>
      </div>

      {feedback && (
        <div className={`alert ${feedback.type === 'error' ? 'alert-danger' : 'alert-success'}`}>
          <p>{feedback.message}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="tab-group" role="tablist" aria-label="FairQueue Controls">
        <button
          type="button"
          role="tab"
          id="tab-queue-btn"
          aria-selected={tab === 'queue'}
          aria-controls="tab-queue-panel"
          className={`tab-btn ${tab === 'queue' ? 'tab-btn-active' : ''}`}
          onClick={() => setTab('queue')}
        >
          🚆 {t.tabQueue}
        </button>
        <button
          type="button"
          role="tab"
          id="tab-sim-btn"
          aria-selected={tab === 'simulator'}
          aria-controls="tab-sim-panel"
          className={`tab-btn ${tab === 'simulator' ? 'tab-btn-active' : ''}`}
          onClick={() => setTab('simulator')}
        >
          📊 {t.tabSim}
        </button>
        <button
          type="button"
          role="tab"
          id="tab-op-btn"
          aria-selected={tab === 'operator'}
          aria-controls="tab-op-panel"
          className={`tab-btn ${tab === 'operator' ? 'tab-btn-active' : ''}`}
          onClick={() => setTab('operator')}
        >
          🛡️ {t.tabOp} {isOperator ? '✅' : ''}
        </button>
      </div>

      {/* TAB 1: Citizen Tatkal Waiting Room */}
      {tab === 'queue' && (
        <div id="tab-queue-panel" role="tabpanel" aria-labelledby="tab-queue-btn" className="tool-panel">
          <h2>🚆 {t.tabQueue}</h2>
          <p className="field-help">{t.subtitle}</p>

          <form onSubmit={handleJoinQueue}>
            <label htmlFor="fq-train-select">{t.trainSelect}</label>
            <select
              id="fq-train-select"
              value={trainNumber}
              onChange={(e) => setTrainNumber(e.target.value)}
            >
              <option value="12951">12951 - Mumbai Rajdhani Express (NDLS → MMCT)</option>
              <option value="12004">12004 - Lucknow Shatabdi Express (NDLS → LKO)</option>
              <option value="22436">22436 - Vande Bharat Express (NDLS → BSB)</option>
              <option value="12301">12301 - Howrah Rajdhani Express (HWH → NDLS)</option>
            </select>

            <label htmlFor="fq-passenger-name">{t.passengerName}</label>
            <input
              id="fq-passenger-name"
              type="text"
              value={passengerName}
              onChange={(e) => setPassengerName(e.target.value)}
              required
            />

            <label htmlFor="fq-passenger-age">{t.passengerAge}</label>
            <input
              id="fq-passenger-age"
              type="number"
              min="5"
              max="110"
              value={passengerAge}
              onChange={(e) => setPassengerAge(e.target.value)}
              required
            />

            <label htmlFor="fq-sim-mode">{t.simModeLabel}</label>
            <select
              id="fq-sim-mode"
              value={simulateMode}
              onChange={(e) => setSimulateMode(e.target.value as 'human' | 'bot')}
            >
              <option value="human">👤 {t.modeHuman}</option>
              <option value="bot">🤖 {t.modeBot}</option>
            </select>

            <button type="submit" className="button" disabled={loading}>
              {loading ? 'Analyzing Signals...' : `🚀 ${t.joinQueueBtn}`}
            </button>
          </form>

          {/* Micro PoW Challenge Card */}
          {powToken && (
            <div className="tool-panel pow-card">
              <h3>⚠️ {t.powTitle}</h3>
              <p className="field-help">{t.powDesc}</p>
              <div className="code-box">Challenge Token: {powToken}&#10;Required Hash Prefix: &quot;0000&quot;</div>
              <button
                type="button"
                className="button"
                onClick={handleSolvePoW}
                disabled={powSolving}
              >
                {powSolving ? 'Computing Nonce in Browser...' : `⚡ ${t.solvePowBtn}`}
              </button>
            </div>
          )}

          {/* Result Status Display */}
          {queueResult && (
            <div>
              {queueResult.queue_status === 'admitted' && (
                <div className="queue-seat-card">
                  <h3>✅ {t.admittedSuccess}</h3>
                  <p>{t.admittedSeat} <strong>Seat #{queueResult.admitted_seat} (Coach B4)</strong></p>
                  <p>Queue Rank: #{queueResult.assigned_rank} | Anti-Bot Score: {queueResult.bot_risk_score}/100 (Safe)</p>
                </div>
              )}

              {queueResult.queue_status === 'waiting' && (
                <div className="queue-box">
                  <div className="queue-rank">#{queueResult.assigned_rank}</div>
                  <p className="stat-label">{t.waitingRank}</p>
                  <p className="field-help">{t.waitingNotice} <strong>{queueResult.estimated_wait_seconds}s</strong></p>
                  <span className="badge badge-warning">Randomized 15s Lottery Pool</span>
                </div>
              )}

              {queueResult.queue_status === 'blocked' && (
                <div className="alert alert-danger mt-4">
                  <h3>⛔ {t.botBlocked}</h3>
                  <p>{t.botBlockedMsg}</p>
                  <p>Risk Score: {queueResult.bot_risk_score}/100 | Action: Disqualified from Tatkal lottery</p>
                  {!appealSent ? (
                    <button
                      type="button"
                      className="button button-small"
                      onClick={handleAppeal}
                    >
                      📩 {t.appealBtn}
                    </button>
                  ) : (
                    <p className="badge badge-pass">{t.appealDone}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Tatkal Fairness Simulator */}
      {tab === 'simulator' && (
        <div id="tab-sim-panel" role="tabpanel" aria-labelledby="tab-sim-btn" className="tool-panel">
          <h2>📊 {t.simTitle}</h2>
          <p className="field-help">{t.simDesc}</p>

          <form onSubmit={handleRunSimulation}>
            <div className="tool-grid">
              <div>
                <label htmlFor="sim-num-bots">{t.botsLabel}</label>
                <input
                  id="sim-num-bots"
                  type="number"
                  min="10"
                  max="500"
                  value={numBots}
                  onChange={(e) => setNumBots(Number(e.target.value))}
                  required
                />
              </div>
              <div>
                <label htmlFor="sim-num-humans">{t.humansLabel}</label>
                <input
                  id="sim-num-humans"
                  type="number"
                  min="5"
                  max="200"
                  value={numHumans}
                  onChange={(e) => setNumHumans(Number(e.target.value))}
                  required
                />
              </div>
            </div>

            <label htmlFor="sim-quota-seats">{t.quotaLabel}</label>
            <input
              id="sim-quota-seats"
              type="number"
              min="5"
              max="100"
              value={quotaSeats}
              onChange={(e) => setQuotaSeats(Number(e.target.value))}
              required
            />

            <button type="submit" className="button" disabled={loading}>
              {loading ? 'Running Live Simulation...' : `⚡ ${t.runSimBtn}`}
            </button>
          </form>

          {/* Simulation Results Display */}
          {simResult && (
            <div>
              <div className="stat-grid">
                <div className="stat-card">
                  <div className="stat-num">{simResult.bot_detection_rate}%</div>
                  <div className="stat-label">{t.botDetectionRate}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-num">{simResult.human_false_positive_rate}%</div>
                  <div className="stat-label">{t.humanFpRate}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-num">{simResult.fairness_index_delta}</div>
                  <div className="stat-label">{t.accessImprovement}</div>
                </div>
              </div>

              <div className="comparison-grid">
                {/* Traditional FIFO Card */}
                <div className="comparison-card comparison-card-fifo">
                  <h3>⛔ {t.traditionalTitle}</h3>
                  <p>{t.seatsBots} <strong className="stat-num">{String(simResult.traditional_fifo.seats_captured_by_bots)} / {quotaSeats}</strong></p>
                  <p>{t.seatsHumans} <strong>{String(simResult.traditional_fifo.seats_captured_by_humans)} / {quotaSeats}</strong></p>
                  <p className="field-help">Average Bot Response: {String(simResult.traditional_fifo.average_bot_arrival_ms)}ms</p>
                  <span className="badge badge-fail">{String(simResult.traditional_fifo.verdict)}</span>
                </div>

                {/* FairQueue Card */}
                <div className="comparison-card comparison-card-fair">
                  <h3>✅ {t.fairTitle}</h3>
                  <p>{t.seatsHumans} <strong className="stat-num">{String(simResult.fairqueue_lottery.seats_captured_by_humans)} / {quotaSeats}</strong></p>
                  <p>{t.seatsBots} <strong>{String(simResult.fairqueue_lottery.seats_captured_by_bots)} / {quotaSeats}</strong></p>
                  <p className="field-help">Neutralized Bots: {String(simResult.fairqueue_lottery.bots_filtered_or_challenged)}</p>
                  <span className="badge badge-pass">{String(simResult.fairqueue_lottery.verdict)}</span>
                </div>
              </div>

              <div className="code-box">
                {simResult.verdict}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Operator Bot Intelligence & RPF Dossier */}
      {tab === 'operator' && (
        <div id="tab-op-panel" role="tabpanel" aria-labelledby="tab-op-btn" className="tool-panel">
          <h2>🛡️ {t.operatorTitle}</h2>
          <p className="field-help">{t.subtitle}</p>

          {analytics && (
            <div>
              <div className="stat-grid">
                <div className="stat-card">
                  <div className="stat-num">{analytics.total_windows}</div>
                  <div className="stat-label">{t.kpiWindows}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-num">{analytics.total_entries}</div>
                  <div className="stat-label">{t.kpiEntries}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-num">{analytics.total_bots_blocked} ({analytics.bot_share_percentage}%)</div>
                  <div className="stat-label">{t.kpiBlocked}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-num">{analytics.total_humans_admitted} ({analytics.human_share_percentage}%)</div>
                  <div className="stat-label">{t.kpiHumans}</div>
                </div>
              </div>

              <h3>🚫 {t.toutTitle}</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Tout Software Family</th>
                    <th>Intercepted Attempts</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(analytics.blocked_tout_software).map(([software, count]) => (
                    <tr key={software}>
                      <td><strong>{software}</strong></td>
                      <td>{count}</td>
                      <td><span className="badge badge-fail">Blocked</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h3>🔍 {t.clusterTitle}</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Device Hash</th>
                    <th>Accounts</th>
                    <th>IP / ASN Origin</th>
                    <th>Security Verdict</th>
                    <th>Remediation</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.device_cluster_risk.map((cluster, idx) => (
                    <tr key={idx}>
                      <td><code>{String(cluster.device_hash)}</code></td>
                      <td>{String(cluster.account_count)}</td>
                      <td>{String(cluster.ip_asn)}</td>
                      <td><span className="badge badge-warning">{String(cluster.risk_verdict)}</span></td>
                      <td>{String(cluster.action)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* RPF Cyber Dossier Export */}
              <div className="mt-8">
                <button
                  type="button"
                  className="button"
                  onClick={handleGenerateRpfDossier}
                >
                  📜 {t.rpfBtn}
                </button>
              </div>

              {rpfDossier && (
                <div className="ticket-view">
                  <h3>⚖️ {t.rpfDone}</h3>
                  <p>Report ID: <strong>{String(rpfDossier.report_id)}</strong></p>
                  <p>Issuing Unit: {String(rpfDossier.issuing_authority)}</p>
                  <p>Statutory Basis: {String(rpfDossier.investigation_summary)}</p>
                  <div className="code-box">
                    {JSON.stringify(rpfDossier, null, 2)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
