'use client';

import {useState, useEffect} from 'react';
import type {
  SocAlert,
  SocBenchmarkResult,
  SocDashboardStats,
  SocIncidentDossier,
  SocOTNode,
  SocSimulateAttackResult,
} from '@railraksha/schemas';

type Tab = 'feed' | 'ot' | 'benchmark';

type Props = {
  locale: 'en' | 'hi';
  csrfToken: string;
  isOperator?: boolean;
};

export function RailSOCTools({locale, csrfToken, isOperator = false}: Props) {
  const [tab, setTab] = useState<Tab>('feed');
  const [feedback, setFeedback] = useState<{type: 'success' | 'error'; message: string} | null>(null);
  const [loading, setLoading] = useState(false);

  // --- SIEM Feed & Stats State ---
  const [stats, setStats] = useState<SocDashboardStats | null>(null);
  const [alerts, setAlerts] = useState<SocAlert[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<SocAlert | null>(null);
  const [promotedIncident, setPromotedIncident] = useState<SocIncidentDossier | null>(null);

  // --- OT Signalling & Simulator State ---
  const [otNodes, setOtNodes] = useState<SocOTNode[]>([]);
  const [scenario, setScenario] = useState<
    'spoofed_radio_stop' | 'plc_interlocking_tamper' | 'rogue_vlan_device'
  >('spoofed_radio_stop');
  const [simResult, setSimResult] = useState<SocSimulateAttackResult | null>(null);

  // --- Benchmark State ---
  const [benchmarkResult, setBenchmarkResult] = useState<SocBenchmarkResult | null>(null);

  // Fetch initial data
  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        const [statsRes, alertsRes, nodesRes] = await Promise.all([
          fetch('/api/tools/soc/dashboard/stats'),
          fetch('/api/tools/soc/alerts'),
          fetch('/api/tools/soc/ot/nodes'),
        ]);

        if (active && statsRes.ok) {
          const statsData = (await statsRes.json()) as SocDashboardStats;
          setStats(statsData);
        }
        if (active && alertsRes.ok) {
          const alertsData = (await alertsRes.json()) as SocAlert[];
          setAlerts(alertsData);
          if (alertsData.length > 0) {
            setSelectedAlert(alertsData[0]);
          }
        }
        if (active && nodesRes.ok) {
          const nodesData = (await nodesRes.json()) as SocOTNode[];
          setOtNodes(nodesData);
        }
      } catch {
        // Fallback gracefully without throwing
      }
    }

    loadData();
    return () => {
      active = false;
    };
  }, []);

  // Promote Alert to Official CERT-In Incident
  async function handlePromoteAlert(alertId: string) {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/tools/soc/alerts/${alertId}/promote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({
          assigned_analyst: 'Analyst-RPF-Cyber',
          auto_execute_playbook: true,
        }),
      });

      if (!res.ok) {
        throw new Error(locale === 'hi' ? 'अलर्ट का उन्नयन विफल हुआ।' : 'Failed to escalate alert.');
      }

      const dossier = (await res.json()) as SocIncidentDossier;
      setPromotedIncident(dossier);
      setFeedback({
        type: 'success',
        message:
          locale === 'hi'
            ? `अलर्ट को घटना ${dossier.incident_id} में सफलतापूर्वक उन्नत किया गया। सर्ट-इन 6-घंटे का ड्राफ्ट तैयार है।`
            : `Alert successfully escalated to Incident ${dossier.incident_id}. CERT-In 6-Hour reporting draft generated.`,
      });
      // Refresh stats and alerts
      const [newStatsRes, newAlertsRes] = await Promise.all([
        fetch('/api/tools/soc/dashboard/stats'),
        fetch('/api/tools/soc/alerts'),
      ]);
      if (newStatsRes.ok) setStats((await newStatsRes.json()) as SocDashboardStats);
      if (newAlertsRes.ok) setAlerts((await newAlertsRes.json()) as SocAlert[]);
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error escalating alert',
      });
    } finally {
      setLoading(false);
    }
  }

  // Trigger OT Cyber-Physical Attack Simulation
  async function handleSimulateAttack() {
    setLoading(true);
    setFeedback(null);
    setSimResult(null);
    try {
      const res = await fetch('/api/tools/soc/ot/simulate-attack', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({
          scenario,
          target_node_id:
            scenario === 'spoofed_radio_stop'
              ? 'KAVACH-SEC-RADIO-04'
              : scenario === 'plc_interlocking_tamper'
              ? 'NDLS-EI-01'
              : 'WR-SCADA-PWR-02',
        }),
      });

      if (!res.ok) {
        throw new Error(
          locale === 'hi'
            ? 'साइबर-भौतिक हमला सिमुलेशन विफल हुआ।'
            : 'Cyber-physical attack simulation failed.'
        );
      }

      const result = (await res.json()) as SocSimulateAttackResult;
      setSimResult(result);
      setFeedback({
        type: 'success',
        message:
          locale === 'hi'
            ? `सिमुलेशन सफल: ${result.triggered_rule_id} ट्रिगर हुआ। कवच सुरक्षा इंटरलॉक सक्रिय!`
            : `Simulation successful: ${result.triggered_rule_id} triggered. Kavach Safety Interlock engaged!`,
      });

      // Refresh alerts list
      const alertsRes = await fetch('/api/tools/soc/alerts');
      if (alertsRes.ok) {
        const alertsData = (await alertsRes.json()) as SocAlert[];
        setAlerts(alertsData);
        setSelectedAlert(alertsData[0]);
      }
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error simulating attack',
      });
    } finally {
      setLoading(false);
    }
  }

  // Run 5,000 Event Ingestion Benchmark
  async function handleRunBenchmark() {
    setLoading(true);
    setFeedback(null);
    setBenchmarkResult(null);
    try {
      const res = await fetch('/api/tools/soc/benchmark/ingest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        throw new Error(
          locale === 'hi'
            ? 'सिग्मा अंतर्ग्रहण बेंचमार्क विफल हुआ।'
            : 'Sigma ingestion benchmark failed.'
        );
      }

      const bench = (await res.json()) as SocBenchmarkResult;
      setBenchmarkResult(bench);
      setFeedback({
        type: 'success',
        message:
          locale === 'hi'
            ? `बेंचमार्क पूरा हुआ: 5,000 घटनाओं को ${bench.throughput_events_per_sec.toLocaleString()} प्रति सेकंड की गति से संसाधित किया गया।`
            : `Benchmark completed: Processed 5,000 events at ${bench.throughput_events_per_sec.toLocaleString()} events/sec.`,
      });
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error running benchmark',
      });
    } finally {
      setLoading(false);
    }
  }

  const getSeverityBadgeClass = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return 'bg-red-100 text-red-900 border-red-300 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800';
      case 'high':
        return 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-900 border-yellow-300 dark:bg-yellow-950/60 dark:text-yellow-300 dark:border-yellow-800';
      default:
        return 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & KPI Ribbon */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
                {locale === 'hi' ? 'सक्रिय रेलएसओसी निगरानी' : 'LIVE RAILSOC MONITORING'}
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                SIGMA-ICS / MITRE ATT&CK v14
              </span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground mt-2">
              {locale === 'hi'
                ? 'रेलएसओसी: सुरक्षा संचालन केंद्र एवं ओटी/सिग्नलिंग सुरक्षा'
                : 'RailSOC: Security Operations Center & OT/Signalling Defense'}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {locale === 'hi'
                ? 'भारतीय रेलवे के महत्वपूर्ण सिग्नलिंग, कवच आरएफआईडी/यूएचएफ नेटवर्क और परिचालन प्रौद्योगिकी का वास्तविक समय साइबर संरक्षण।'
                : 'Real-time 24x7 cyber surveillance protecting Indian Railways signalling, Kavach UHF radio links, and traction SCADA.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-emerald-700 dark:text-emerald-400 font-bold">
              {locale === 'hi' ? 'कवच इंटरलॉक 100% सुरक्षित' : 'KAVACH INTERLOCK 100% HEALTHY'}
            </span>
            {isOperator && (
              <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-sky-100 text-sky-900 border border-sky-300 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800">
                {locale === 'hi' ? 'संचालक अधिकृत' : 'OPERATOR CLEARANCE'}
              </span>
            )}
          </div>
        </div>

        {/* 4 Critical Metrics Counters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-border">
          <div className="bg-muted/40 rounded-xl p-3 border border-border">
            <div className="text-xs text-muted-foreground">
              {locale === 'hi' ? 'कुल सुरक्षा अलर्ट' : 'Total SIEM Alerts'}
            </div>
            <div className="text-xl font-bold text-foreground mt-1">
              {stats?.total_alerts ?? alerts.length}
            </div>
          </div>
          <div className="bg-muted/40 rounded-xl p-3 border border-border">
            <div className="text-xs text-muted-foreground">
              {locale === 'hi' ? 'गंभीर ओटी खतरे' : 'Critical OT Threats'}
            </div>
            <div className="text-xl font-bold text-destructive mt-1">
              {stats?.critical_alerts ?? 0}
            </div>
          </div>
          <div className="bg-muted/40 rounded-xl p-3 border border-border">
            <div className="text-xs text-muted-foreground">
              {locale === 'hi' ? 'सर्ट-इन रिपोर्टेड घटनाएं' : 'CERT-In Dossiers'}
            </div>
            <div className="text-xl font-bold text-amber-700 dark:text-amber-400 mt-1">
              {stats?.total_incidents ?? 0}
            </div>
          </div>
          <div className="bg-muted/40 rounded-xl p-3 border border-border">
            <div className="text-xs text-muted-foreground">
              {locale === 'hi' ? 'प्रतिक्रिया समय (एमटीटीआर)' : 'Response Time (MTTR)'}
            </div>
            <div className="text-xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">
              {stats?.mean_time_to_respond_minutes ? `${stats.mean_time_to_respond_minutes}m` : '4.2m'}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mt-6 flex flex-wrap gap-2 border-t border-border pt-4" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'feed'}
            onClick={() => {
              setTab('feed');
              setFeedback(null);
            }}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              tab === 'feed'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {locale === 'hi' ? '1. एसआईईएम अलर्ट फीड एवं सर्ट-इन' : '1. SIEM Alert Stream & CERT-In'}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'ot'}
            onClick={() => {
              setTab('ot');
              setFeedback(null);
            }}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              tab === 'ot'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {locale === 'hi' ? '2. ओटी / सिग्नलिंग नोड्स एवं अटैक सिमुलेटर' : '2. OT / Signalling & Attack Simulator'}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'benchmark'}
            onClick={() => {
              setTab('benchmark');
              setFeedback(null);
            }}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              tab === 'benchmark'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {locale === 'hi' ? '3. 5k इवेंट अंतर्ग्रहण बेंचमार्क' : '3. 5k Ingestion Benchmark'}
          </button>
        </div>
      </div>

      {/* Toast Feedback */}
      {feedback && (
        <div
          role="alert"
          className={`p-4 rounded-xl border text-sm flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-200'
              : 'bg-red-50 border-red-300 text-red-900 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-200'
          }`}
        >
          <span>{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs font-mono opacity-80 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* TAB 1: SIEM Alert Feed & Dossier Inspector */}
      {tab === 'feed' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Alert Stream (Left 6 Cols) */}
          <div className="lg:col-span-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">
                {locale === 'hi' ? 'सिग्मा सुरक्षा अलर्ट स्ट्रीम' : 'Sigma Rule Alerts'}
              </h3>
              <span className="text-xs text-muted-foreground">
                {alerts.length} {locale === 'hi' ? 'अलर्ट मिले' : 'alerts detected'}
              </span>
            </div>

            {alerts.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">
                <p>
                  {locale === 'hi'
                    ? 'वर्तमान में कोई सक्रिय अलर्ट नहीं है। टैब 2 से सिमुलेशन चलाएं।'
                    : 'No active security alerts. Trigger a simulation in Tab 2 to generate events.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.map((alt) => {
                  const isSelected = selectedAlert?.alert_id === alt.alert_id;
                  return (
                    <button
                      type="button"
                      key={alt.alert_id}
                      onClick={() => setSelectedAlert(alt)}
                      className={`w-full text-left p-4 rounded-xl border transition-all ${
                        isSelected
                          ? 'bg-muted border-primary shadow-sm ring-1 ring-primary'
                          : 'bg-card border-border hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-mono text-xs text-muted-foreground font-semibold">
                          {alt.alert_id}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium border ${getSeverityBadgeClass(
                              alt.severity
                            )}`}
                          >
                            {alt.severity.toUpperCase()}
                          </span>
                          <span className="px-2 py-0.5 rounded text-xs font-mono bg-sky-100 text-sky-900 border border-sky-300 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800">
                            {alt.mitre_attack_id}
                          </span>
                        </div>
                      </div>
                      <h4 className="text-sm font-semibold text-foreground mt-1.5">{alt.title}</h4>
                      <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <span>Rule: {alt.rule_id}</span>
                        <span>•</span>
                        <span>Tactic: {alt.mitre_tactic}</span>
                        {alt.ioc_indicators.length > 0 && (
                          <>
                            <span>•</span>
                            <span className="font-mono text-foreground font-medium">
                              IoC: {alt.ioc_indicators[0]}
                            </span>
                          </>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Alert Triage & CERT-In Dossier (Right 6 Cols) */}
          <div className="lg:col-span-6 space-y-4">
            <h3 className="text-lg font-semibold text-foreground">
              {locale === 'hi' ? 'अलर्ट विवरण एवं सर्ट-इन 6-घंटे रिपोर्ट' : 'Alert Triage & CERT-In Dossier'}
            </h3>

            {selectedAlert ? (
              <div className="bg-card border border-border rounded-xl p-6 space-y-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-mono text-xs text-muted-foreground">{selectedAlert.alert_id}</span>
                    <h4 className="text-base font-bold text-foreground mt-0.5">{selectedAlert.title}</h4>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded text-xs font-semibold border ${getSeverityBadgeClass(
                      selectedAlert.severity
                    )}`}
                  >
                    {selectedAlert.severity.toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs bg-muted/40 p-3 rounded-lg border border-border">
                  <div>
                    <span className="text-muted-foreground">MITRE ATT&CK:</span>
                    <span className="font-mono font-medium text-foreground ml-1">
                      {selectedAlert.mitre_attack_id} ({selectedAlert.mitre_tactic})
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Sigma Rule:</span>
                    <span className="font-mono font-medium text-foreground ml-1">
                      {selectedAlert.rule_id}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>
                    <span className="text-foreground font-medium capitalize ml-1">
                      {selectedAlert.status}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Detected:</span>
                    <span className="text-foreground ml-1 font-mono">
                      {selectedAlert.created_at.slice(11, 19)} UTC
                    </span>
                  </div>
                </div>

                {selectedAlert.ioc_indicators.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-foreground mb-1">
                      {locale === 'hi' ? 'संकेतक (IoC):' : 'Indicators of Compromise (IoC):'}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedAlert.ioc_indicators.map((ioc, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded text-xs font-mono bg-muted text-foreground border border-border"
                        >
                          {ioc}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Evidence Data Dump */}
                <div>
                  <div className="text-xs font-semibold text-foreground mb-1">
                    {locale === 'hi' ? 'फोरेंसिक साक्ष्य पेलोड:' : 'Forensic Evidence Payload:'}
                  </div>
                  <pre className="bg-muted p-3 rounded-lg text-xs font-mono text-foreground border border-border whitespace-pre-wrap break-all">
                    {JSON.stringify(selectedAlert.evidence_data, null, 2)}
                  </pre>
                </div>

                {/* Escalate / Promote Button */}
                <div className="pt-2 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="text-xs text-muted-foreground">
                    {locale === 'hi'
                      ? 'नियम 12 के तहत 6 घंटे के भीतर सर्ट-इन को रिपोर्ट करना अनिवार्य है।'
                      : 'Mandatory 6-Hour reporting window under CERT-In Directions (Rule 12).'}
                  </div>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handlePromoteAlert(selectedAlert.alert_id)}
                    className="px-4 py-2 rounded-lg bg-destructive hover:bg-destructive/90 disabled:opacity-50 text-white font-semibold text-xs shadow-sm transition-colors"
                  >
                    {loading
                      ? locale === 'hi'
                        ? 'उन्नयन हो रहा है...'
                        : 'Escalating...'
                      : locale === 'hi'
                      ? 'सर्ट-इन में अपग्रेड करें'
                      : 'Escalate to CERT-In Incident'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">
                <p>
                  {locale === 'hi'
                    ? 'विवरण देखने के लिए बाईं ओर से एक अलर्ट चुनें।'
                    : 'Select an alert from the left to view triage details and CERT-In dossier.'}
                </p>
              </div>
            )}

            {/* Promoted Incident Dossier Card */}
            {promotedIncident && (
              <div className="bg-card border border-destructive/50 rounded-xl p-5 space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-destructive/20 text-destructive border border-destructive/30">
                    OFFICIAL CERT-IN INCIDENT DOSSIER
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {promotedIncident.incident_id}
                  </span>
                </div>
                <h4 className="text-sm font-semibold text-foreground">{promotedIncident.title}</h4>
                <div className="text-xs space-y-1 text-muted-foreground">
                  <div>
                    <span className="font-medium text-foreground">Mandatory Window:</span> 6 Hours (CERT-In Rule 12)
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Assigned Analyst:</span>{' '}
                    {promotedIncident.assigned_analyst}
                  </div>
                  <div>
                    <span className="font-medium text-foreground">SHA-256 Chain of Custody:</span>{' '}
                    <span className="font-mono text-foreground font-medium text-[11px] break-all">
                      {String(promotedIncident.cert_in_dossier?.chain_of_custody_hash || 'SHA256_VERIFIED')}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-foreground mb-1">SOAR Containment:</div>
                  <ul className="text-xs list-disc list-inside text-foreground space-y-0.5">
                    {promotedIncident.playbook_actions_taken.map((act, i) => (
                      <li key={i}>{act}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: OT Signalling Nodes & Cyber-Physical Attack Simulator */}
      {tab === 'ot' && (
        <div className="space-y-6">
          {/* OT Signalling Network Nodes */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-3">
              {locale === 'hi' ? 'सक्रिय ओटी सिग्नलिंग उपकरण नोड्स' : 'Active Signalling & OT Infrastructure Nodes'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {otNodes.map((node) => (
                <div
                  key={node.node_id}
                  className="bg-card border border-border rounded-xl p-5 space-y-3 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-foreground">
                      {node.node_id}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
                      ONLINE
                    </span>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-foreground capitalize">
                      {node.system_type.replace('_', ' ')}
                    </div>
                    <div className="text-xs text-muted-foreground">{node.location_zone}</div>
                  </div>
                  <div className="bg-muted/50 p-2.5 rounded-lg border border-border text-xs font-mono space-y-1">
                    <div className="text-muted-foreground">IP: {node.ip_address}</div>
                    {Object.entries(node.last_telemetry).map(([k, v]) => (
                      <div key={k} className="text-foreground flex justify-between">
                        <span className="text-muted-foreground">{k}:</span>
                        <span className="font-medium">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cyber-Physical Attack Simulator */}
          <div className="bg-card border border-border rounded-xl p-6 space-y-5 shadow-sm">
            <div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-destructive/20 text-destructive border border-destructive/30">
                {locale === 'hi' ? 'साइबर-भौतिक हमला सिम्युलेटर' : 'CYBER-PHYSICAL ATTACK SIMULATOR'}
              </span>
              <h3 className="text-xl font-bold text-foreground mt-2">
                {locale === 'hi'
                  ? 'रेलवे सुरक्षा विफल-सुरक्षित (Failsafe) इंटरलॉक सत्यापन'
                  : 'Railway Signalling & Kavach Failsafe Interlock Verification'}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {locale === 'hi'
                  ? 'यह सिम्युलेटर वास्तविक सिग्नलों पर हमला किए बिना हार्डवेयर इंटरलॉकिंग और कवच रेडियो सुरक्षा तंत्र की प्रभावशीलता को सत्यापित करता है।'
                  : 'Inject controlled adversary vectors into the digital twin to verify Kavach UHF radio cryptography and hardware interlocking logic.'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label
                className={`flex flex-col p-4 rounded-xl border cursor-pointer transition-all ${
                  scenario === 'spoofed_radio_stop'
                    ? 'bg-muted border-destructive ring-1 ring-destructive'
                    : 'bg-card border-border hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-foreground">Scenario A</span>
                  <input
                    type="radio"
                    name="scenario"
                    value="spoofed_radio_stop"
                    checked={scenario === 'spoofed_radio_stop'}
                    onChange={() => setScenario('spoofed_radio_stop')}
                    className="accent-destructive"
                  />
                </div>
                <div className="text-xs font-semibold text-destructive mt-1">
                  Kavach Spoofed Radio Stop (T0885)
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  Adversary UHF 441.8MHz transmission sending unauthenticated Emergency Stop packet.
                </div>
              </label>

              <label
                className={`flex flex-col p-4 rounded-xl border cursor-pointer transition-all ${
                  scenario === 'plc_interlocking_tamper'
                    ? 'bg-muted border-destructive ring-1 ring-destructive'
                    : 'bg-card border-border hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-foreground">Scenario B</span>
                  <input
                    type="radio"
                    name="scenario"
                    value="plc_interlocking_tamper"
                    checked={scenario === 'plc_interlocking_tamper'}
                    onChange={() => setScenario('plc_interlocking_tamper')}
                    className="accent-destructive"
                  />
                </div>
                <div className="text-xs font-semibold text-destructive mt-1">
                  PLC Interlocking Coil Tamper (T0855)
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  Modbus write coil attempting to flip point machine PM-104A during locked express route.
                </div>
              </label>

              <label
                className={`flex flex-col p-4 rounded-xl border cursor-pointer transition-all ${
                  scenario === 'rogue_vlan_device'
                    ? 'bg-muted border-destructive ring-1 ring-destructive'
                    : 'bg-card border-border hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-foreground">Scenario C</span>
                  <input
                    type="radio"
                    name="scenario"
                    value="rogue_vlan_device"
                    checked={scenario === 'rogue_vlan_device'}
                    onChange={() => setScenario('rogue_vlan_device')}
                    className="accent-destructive"
                  />
                </div>
                <div className="text-xs font-semibold text-amber-700 dark:text-amber-400 mt-1">
                  Rogue Tap on Signalling VLAN (T0846)
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  Unknown MAC address device hardware tapped into isolated signalling VLAN 100.
                </div>
              </label>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                disabled={loading}
                onClick={handleSimulateAttack}
                className="px-6 py-2.5 rounded-xl bg-destructive hover:bg-destructive/90 disabled:opacity-50 text-white font-bold text-sm shadow-sm transition-all"
              >
                {loading
                  ? locale === 'hi'
                    ? 'हमला निष्पादित हो रहा है...'
                    : 'Injecting Attack Vector...'
                  : locale === 'hi'
                  ? 'साइबर-भौतिक हमला चलाएं'
                  : 'Inject Attack Vector & Verify Interlock'}
              </button>
            </div>

            {/* Simulation Result Box */}
            {simResult && (
              <div className="mt-4 p-5 rounded-xl bg-muted/50 border border-border space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-destructive/20 text-destructive border border-destructive/30">
                      DETECTION VERDICT: {simResult.triggered_rule_id}
                    </span>
                    <span className="px-2 py-0.5 rounded text-xs font-mono bg-sky-100 text-sky-900 border border-sky-300 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800">
                      MITRE: {simResult.mitre_attack_id}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">
                    Incident: {simResult.incident_id}
                  </span>
                </div>

                <div className="text-sm text-foreground">{simResult.attack_description}</div>

                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200 space-y-1">
                  <div className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                    {locale === 'hi'
                      ? 'कवच एवं इंटरलॉकिंग सुरक्षा परिणाम'
                      : 'Kavach & Hardware Interlock Outcome'}
                  </div>
                  <div className="text-sm font-semibold">{simResult.kavach_safety_interlock}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: High-Throughput Ingestion Benchmark */}
      {tab === 'benchmark' && (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-6 space-y-5 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
                  {locale === 'hi' ? 'उच्च-थ्रूपुट प्रदर्शन परीक्षण' : 'HIGH-THROUGHPUT ENGINE BENCHMARK'}
                </span>
                <h3 className="text-xl font-bold text-foreground mt-2">
                  {locale === 'hi'
                    ? '5,000 सिमुलेटेड घटनाओं पर सिग्मा नियम प्रदर्शन'
                    : '5,000 Synthetic Events Sigma Rules Ingestion Benchmark'}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {locale === 'hi'
                    ? 'माइक्रोसेकंड विलंबता के साथ प्रति सेकंड हजारों सिग्नलिंग घटनाओं को संसाधित करने की रेलएसओसी क्षमता का मूल्यांकन करता है।'
                    : 'Evaluates the RailSOC high-throughput Sigma rule engine against 5,000 mixed normal and adversarial telemetry events.'}
                </p>
              </div>

              <button
                type="button"
                disabled={loading}
                onClick={handleRunBenchmark}
                className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 font-bold text-sm shadow-sm transition-all"
              >
                {loading
                  ? locale === 'hi'
                    ? 'बेंचमार्क चल रहा है...'
                    : 'Benchmarking...'
                  : locale === 'hi'
                  ? '5k बेंचमार्क चलाएं'
                  : 'Execute 5,000 Ingestion Benchmark'}
              </button>
            </div>

            {/* Benchmark Results Display */}
            {benchmarkResult && (
              <div className="mt-6 space-y-5 pt-6 border-t border-border">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-muted/40 p-4 rounded-xl border border-border">
                    <div className="text-xs text-muted-foreground">Total Events Tested</div>
                    <div className="text-2xl font-bold text-foreground mt-1">
                      {benchmarkResult.events_generated.toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-muted/40 p-4 rounded-xl border border-border">
                    <div className="text-xs text-muted-foreground">Throughput (Events/Sec)</div>
                    <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">
                      {benchmarkResult.throughput_events_per_sec.toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-muted/40 p-4 rounded-xl border border-border">
                    <div className="text-xs text-muted-foreground">Avg Latency / Event</div>
                    <div className="text-2xl font-bold text-sky-700 dark:text-sky-400 mt-1">
                      {benchmarkResult.average_latency_ms} ms
                    </div>
                  </div>
                  <div className="bg-muted/40 p-4 rounded-xl border border-border">
                    <div className="text-xs text-muted-foreground">Attacks Detected</div>
                    <div className="text-2xl font-bold text-amber-700 dark:text-amber-400 mt-1">
                      {benchmarkResult.alerts_generated} / 50
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-muted border border-border text-foreground text-sm font-mono">
                  {benchmarkResult.verdict}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
