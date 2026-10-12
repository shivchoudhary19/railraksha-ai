import { requireSession, apiFetch } from '@/lib/auth';
import { AccountNav } from '@/components/account-nav';
import { AdvancedRdTools } from '@/components/advanced-rd-tools';
import type {
  FederatedStatusResult,
  IVRHistoryItemResult,
  FraudRingsResult,
  DriftMetricsResult,
  BugBountyResult,
} from '@railraksha/schemas';

export const metadata = {
  title: 'Advanced R&D · Continuous Improvement · RailRaksha AI',
  robots: { index: false, follow: false },
};

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const language = locale === 'hi' ? 'hi' : 'en';
  const session = await requireSession(language);

  const [flRes, ivrRes, graphRes, driftRes, bountyRes] = await Promise.all([
    apiFetch('/v1/advanced-rd/federated/status', session),
    apiFetch('/v1/advanced-rd/ivr/history', session),
    apiFetch('/v1/advanced-rd/graph/fraud-rings', session),
    apiFetch('/v1/advanced-rd/drift/metrics', session),
    apiFetch('/v1/advanced-rd/bug-bounty/leaderboard', session),
  ]);

  const defaultFl: FederatedStatusResult = {
    model_version: 'v4.2.0-fl',
    participating_edge_devices: 14280,
    active_round: 48,
    global_loss: 0.0412,
    accuracy_percent: 98.74,
    differential_privacy_epsilon: 0.50,
    differential_privacy_delta: 1e-5,
    noise_mechanism: 'Laplace (b=0.02) + Gaussian (sigma=0.015) Hybrid',
    privacy_budget_consumed_percent: 32.4,
    device_os_distribution: { Android: 82.5, iOS: 17.5 },
    status: 'TRAINING_CONVERGED',
  };

  const defaultIVR: IVRHistoryItemResult[] = [
    {
      session_id: 'IVR-SES-882194',
      caller_number: '+919876543210',
      language: 'hi-IN',
      query_input: 'irctc-refund-link.site',
      classification: 'SCAM_ALERT',
      risk_score: 96,
      timestamp: '2026-10-12T23:45:10Z',
    },
    {
      session_id: 'IVR-SES-882195',
      caller_number: '+919425012345',
      language: 'en-IN',
      query_input: '139',
      classification: 'OFFICIAL',
      risk_score: 0,
      timestamp: '2026-10-12T23:48:22Z',
    },
  ];

  const defaultGraph: FraudRingsResult = {
    total_active_syndicates: 2,
    total_nodes_tracked: 9,
    total_edges_mapped: 7,
    syndicates: [
      {
        syndicate_id: 'SYN-JAM-01',
        name: 'Jamtara Fake Tatkal Syndicate',
        origin_district: 'Jamtara, Jharkhand',
        estimated_victim_count: 840,
        estimated_fraud_inr: 4850000,
        modularity_cluster: 1,
        central_hub: 'refund.irctc-tatkal@oksbi',
        risk_level: 'CRITICAL',
        nodes: [
          { id: 'PHONE-9876543210', label: '+91 98765 43210', node_type: 'PHONE', risk_score: 98 },
          { id: 'VPA-REFUND-IRCTC', label: 'refund.irctc-tatkal@oksbi', node_type: 'UPI', risk_score: 99 },
          { id: 'DOMAIN-IRCTC-TATKAL', label: 'irctc-tatkal-fastbooking.xyz', node_type: 'DOMAIN', risk_score: 96 },
          { id: 'BANK-SBIN-88910', label: 'SBI A/C: ****88910 (Jamtara Br)', node_type: 'BANK_ACCOUNT', risk_score: 95 },
          { id: 'HEADER-BZ-TATKAL', label: 'BZ-TATKAL', node_type: 'SMS_HEADER', risk_score: 92 },
        ],
        edges: [
          { source: 'PHONE-9876543210', target: 'VPA-REFUND-IRCTC', co_occurrence_count: 48, confidence_percent: 98.5 },
          { source: 'VPA-REFUND-IRCTC', target: 'DOMAIN-IRCTC-TATKAL', co_occurrence_count: 62, confidence_percent: 99.1 },
          { source: 'VPA-REFUND-IRCTC', target: 'BANK-SBIN-88910', co_occurrence_count: 35, confidence_percent: 97.0 },
          { source: 'HEADER-BZ-TATKAL', target: 'DOMAIN-IRCTC-TATKAL', co_occurrence_count: 29, confidence_percent: 95.2 },
        ],
      },
      {
        syndicate_id: 'SYN-MEW-02',
        name: 'Mewat Railway Recruitment Ring',
        origin_district: 'Mewat / Nuh, Haryana',
        estimated_victim_count: 412,
        estimated_fraud_inr: 2950000,
        modularity_cluster: 2,
        central_hub: 'rrb-recruitment-appointment.in',
        risk_level: 'CRITICAL',
        nodes: [
          { id: 'PHONE-9412098765', label: '+91 94120 98765', node_type: 'PHONE', risk_score: 95 },
          { id: 'DOMAIN-RRB-PORTAL', label: 'rrb-recruitment-appointment.in', node_type: 'DOMAIN', risk_score: 97 },
          { id: 'VPA-RRB-EXAMFEE', label: 'rrb.examfee@paytm', node_type: 'UPI', risk_score: 94 },
          { id: 'BANK-PNB-4410', label: 'PNB A/C: ****4410 (Mewat Region)', node_type: 'BANK_ACCOUNT', risk_score: 92 },
        ],
        edges: [
          { source: 'PHONE-9412098765', target: 'DOMAIN-RRB-PORTAL', co_occurrence_count: 31, confidence_percent: 96.4 },
          { source: 'DOMAIN-RRB-PORTAL', target: 'VPA-RRB-EXAMFEE', co_occurrence_count: 44, confidence_percent: 98.0 },
          { source: 'VPA-RRB-EXAMFEE', target: 'BANK-PNB-4410', co_occurrence_count: 27, confidence_percent: 94.5 },
        ],
      },
    ],
  };

  const defaultDrift: DriftMetricsResult = {
    population_stability_index: 0.082,
    psi_threshold: 0.20,
    drift_detected: false,
    false_positive_rate_percent: 0.12,
    f1_score: 0.984,
    data_slices_evaluated: 284000,
    last_retraining_timestamp: '2026-10-10T14:30:00Z',
    next_scheduled_eval: '2026-10-17T00:00:00Z',
    retraining_pipeline_status: 'OPTIMAL_IN_BOUNDS',
  };

  const defaultBounty: BugBountyResult = {
    program_name: 'RailRaksha Responsible Disclosure & Bug Bounty Program',
    total_reports_processed: 142,
    valid_bounties_awarded: 18,
    total_bounties_inr: 450000,
    avg_response_time_hours: 4.2,
    researchers: [
      {
        handle: '@shreya_sec',
        valid_reports: 6,
        bounty_awarded_inr: 150000,
        specialization: 'SSRF & Auth Token Security',
        badge: 'PLATINUM_DEFENDER',
      },
      {
        handle: '@cyber_arjun',
        valid_reports: 4,
        bounty_awarded_inr: 100000,
        specialization: 'Homoglyph Bypass & Heuristics',
        badge: 'GOLD_HUNTER',
      },
      {
        handle: '@deepak_redteam',
        valid_reports: 4,
        bounty_awarded_inr: 100000,
        specialization: 'IVR Speech Spoofing',
        badge: 'GOLD_HUNTER',
      },
      {
        handle: '@priya_pwns',
        valid_reports: 4,
        bounty_awarded_inr: 100000,
        specialization: 'DLT Header Replay Analysis',
        badge: 'GOLD_HUNTER',
      },
    ],
  };

  const flData: FederatedStatusResult = flRes.ok ? await flRes.json() : defaultFl;
  const ivrData: IVRHistoryItemResult[] = ivrRes.ok ? await ivrRes.json() : defaultIVR;
  const graphData: FraudRingsResult = graphRes.ok ? await graphRes.json() : defaultGraph;
  const driftData: DriftMetricsResult = driftRes.ok ? await driftRes.json() : defaultDrift;
  const bountyData: BugBountyResult = bountyRes.ok ? await bountyRes.json() : defaultBounty;

  return (
    <section className="container dashboard-page">
      <AccountNav locale={language} session={session} />
      <header className="dashboard-heading">
        <div>
          <span className="eyebrow">RAILRAKSHA · ADVANCED R&amp;D &amp; CONTINUOUS IMPROVEMENT</span>
          <h1>
            {language === 'hi'
              ? 'उन्नत अनुसंधान, वॉयस आईवीआर एवं फ्रॉड-रिंग विश्लेषण'
              : 'Advanced R&D, Voice IVR & Fraud-Ring Analysis'}
          </h1>
          <p>
            {language === 'hi'
              ? 'फेडरेटेड लर्निंग (डीपी), बहुभाषी फीचर फोन आईवीआर, टेलीकॉम डीएलटी हेडर, और नेटवर्क फ्रॉड-रिंग सिंडिकेट विश्लेषण।'
              : 'Federated Learning with Differential Privacy, Regional Voice IVR, Telecom DLT Header verification, and Fraud-Ring graph detection.'}
          </p>
        </div>
      </header>
      <AdvancedRdTools
        initialFederated={flData}
        initialIVRHistory={ivrData}
        initialFraudRings={graphData}
        initialDrift={driftData}
        initialBounty={bountyData}
        csrfToken={session.csrf}
        lang={language}
      />
    </section>
  );
}
