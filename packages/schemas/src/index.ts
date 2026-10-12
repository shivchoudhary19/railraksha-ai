import {z} from 'zod';
export const roles = ['citizen','student','verified_reporter','analyst','soc_lead','rpf_cyber','asset_owner','partner_dev','admin','super_admin'] as const;
export const roleSchema = z.enum(roles);
export const operatorRoles = ['analyst','soc_lead','rpf_cyber','admin','super_admin'] as const;
export const profileSchema = z.object({display_name:z.string().trim().min(1).max(80).regex(/^[^\p{Cc}<>]+$/u),language:z.enum(['en','hi'])}).strict();
export const sessionSchema = z.object({sub:z.string().min(1),name:z.string(),email:z.string().email(),roles:z.array(roleSchema),accessToken:z.string(),idToken:z.string(),csrf:z.string(),expiresAt:z.number()});
export type Session = z.infer<typeof sessionSchema>;
export function canOperate(userRoles:readonly string[]) {return operatorRoles.some(role=>userRoles.includes(role));}
export function safeReturnPath(value:string|null):string {return value && /^\/(en|hi)\/(dashboard|profile|operator|verify|reports|registry|moderation|phishradar|takedowns|scamlens|appguard|shield|webaudit|booking|fairqueue)$/.test(value) ? value : '/en/dashboard';}
export const assetKinds=['url','domain','phone','email','upi','app','social'] as const;
export const verifyInput=z.object({kind:z.enum(assetKinds),value:z.string().trim().min(1).max(2048)}).strict();
export const assetInput=verifyInput.extend({label:z.string().trim().min(1).max(100),source_url:z.url().max(2048),certificate_sha256:z.string().regex(/^[a-fA-F0-9]{64}$/).nullable().optional(),demo:z.boolean().default(false)}).strict();
export const reportInput=z.object({kind:z.enum([...assetKinds,'message']),value:z.string().trim().min(1).max(2048),description:z.string().trim().min(10).max(5000),language:z.enum(['en','hi']),location:z.string().max(100).nullable().optional(),consent_to_store:z.literal(true)}).strict();
export const moderationInput=z.object({action:z.enum(['approve','reject','merge']),note:z.string().trim().min(5).max(500),merge_into:z.uuid().nullable().optional()}).strict().refine(data=>(data.action==='merge')===Boolean(data.merge_into));
export const assetOutput=z.object({id:z.uuid(),kind:z.string(),value:z.string(),label:z.string(),source_url:z.url(),certificate_sha256:z.string().nullable(),status:z.string(),demo:z.boolean(),verified_by:z.uuid(),verified_at:z.string()});
export const verificationOutput=z.object({verdict:z.enum(['official','unknown','known_scam']),normalized_value:z.string(),asset:assetOutput.nullable().optional(),scope:z.enum(['identifier','domain']),explanation_code:z.string()});
export const reportOutput=z.object({id:z.uuid(),kind:z.string(),normalized_value:z.string(),description:z.string(),language:z.string(),location:z.string().nullable(),status:z.string(),merged_into:z.uuid().nullable(),created_at:z.string()});
export type RegistryAsset=z.infer<typeof assetOutput>;
export type CitizenReport=z.infer<typeof reportOutput>;
export type VerificationResult=z.infer<typeof verificationOutput>;
export const evidenceOutput=z.object({id:z.uuid(),sha256:z.string(),size:z.number()});

// PhishRadar Schemas
export const scanFactorSchema = z.object({
  code: z.string(),
  severity: z.enum(['critical', 'high', 'medium', 'low', 'info']),
  title_en: z.string(),
  title_hi: z.string(),
  detail_en: z.string(),
  detail_hi: z.string(),
});
export const phishradarScanInput = z.object({
  url: z.string().trim().min(4).max(2048),
}).strict();
export const phishradarScanOutput = z.object({
  id: z.uuid(),
  target_url: z.string(),
  normalized_url: z.string(),
  domain: z.string(),
  risk_score: z.number().int().min(0).max(100),
  verdict: z.enum(['safe', 'suspicious', 'dangerous']),
  factors: z.array(scanFactorSchema),
  explanation_en: z.string(),
  explanation_hi: z.string(),
  actions_en: z.array(z.string()),
  actions_hi: z.array(z.string()),
  created_at: z.string(),
});
export const domainMonitorOutput = z.object({
  id: z.uuid(),
  monitored_domain: z.string(),
  detected_lookalike: z.string(),
  similarity_score: z.number(),
  status: z.string(),
  source: z.string(),
  detected_at: z.string(),
});
export const takedownCaseInput = z.object({
  target_domain: z.string().trim().min(3).max(255),
  scan_id: z.uuid().nullable().optional(),
  registrar: z.string().trim().max(255).nullable().optional(),
  evidence_summary: z.string().trim().min(10).max(5000),
}).strict();
export const takedownStatusInput = z.object({
  status: z.enum(['draft', 'reported', 'in_progress', 'resolved']),
  note: z.string().trim().max(500).nullable().optional(),
}).strict();
export const takedownCaseOutput = z.object({
  id: z.uuid(),
  target_domain: z.string(),
  scan_id: z.uuid().nullable(),
  status: z.string(),
  registrar: z.string().nullable(),
  evidence_summary: z.string(),
  created_by: z.uuid(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type PhishRadarScan = z.infer<typeof phishradarScanOutput>;
export type DomainMonitorAlert = z.infer<typeof domainMonitorOutput>;
export type TakedownCase = z.infer<typeof takedownCaseOutput>;

// ScamLens Schemas
export const redFlagSchema = z.object({
  snippet: z.string(),
  reason_en: z.string(),
  reason_hi: z.string(),
  severity: z.enum(['critical', 'high', 'medium', 'low']),
});

export const extractedEntitiesSchema = z.object({
  urls: z.array(z.string()),
  phones: z.array(z.string()),
  upis: z.array(z.string()),
});

export const scamLensInput = z.object({
  text: z.string().trim().min(5).max(10000),
  save_report: z.boolean().default(false),
}).strict();

export const scamLensOutput = z.object({
  id: z.uuid(),
  category: z.string(),
  category_title_en: z.string(),
  category_title_hi: z.string(),
  risk_score: z.number().int().min(0).max(100),
  verdict: z.enum(['safe', 'suspicious', 'dangerous']),
  entities: extractedEntitiesSchema,
  red_flags: z.array(redFlagSchema),
  ai_generated_hint: z.boolean(),
  explanation_en: z.string(),
  explanation_hi: z.string(),
  safe_steps_en: z.array(z.string()),
  safe_steps_hi: z.array(z.string()),
  redacted_preview: z.string(),
  created_at: z.string(),
});

export const emailAnalysisInput = z.object({
  from_header: z.string().trim().min(3).max(255),
  reply_to: z.string().trim().max(255).nullable().optional(),
  subject: z.string().trim().min(1).max(500),
  body: z.string().trim().min(5).max(20000),
  spf_result: z.enum(['pass', 'fail', 'softfail', 'none']).nullable().optional(),
  dkim_result: z.enum(['pass', 'fail', 'none']).nullable().optional(),
  dmarc_result: z.enum(['pass', 'fail', 'none']).nullable().optional(),
}).strict();

export const emailAnalysisOutput = z.object({
  verdict: z.enum(['safe', 'suspicious', 'dangerous']),
  risk_score: z.number().int().min(0).max(100),
  display_name_spoofed: z.boolean(),
  domain_mismatch: z.boolean(),
  auth_failures: z.array(z.string()),
  red_flags: z.array(redFlagSchema),
  explanation_en: z.string(),
  explanation_hi: z.string(),
});

export const emergencyStepSchema = z.object({
  order: z.number().int(),
  title_en: z.string(),
  title_hi: z.string(),
  action_en: z.string(),
  action_hi: z.string(),
  contact: z.string().nullable().optional(),
  urgent: z.boolean(),
});

export type ScamLensAnalysis = z.infer<typeof scamLensOutput>;
export type EmailAnalysis = z.infer<typeof emailAnalysisOutput>;
export type EmergencyStep = z.infer<typeof emergencyStepSchema>;

// AppGuard Schemas
export const permissionIndicatorSchema = z.object({
  permission: z.string(),
  severity: z.enum(['critical', 'high', 'medium', 'low']),
  title_en: z.string(),
  title_hi: z.string(),
  reason_en: z.string(),
  reason_hi: z.string(),
});

export const suspiciousIndicatorSchema = z.object({
  category: z.string(),
  title_en: z.string(),
  title_hi: z.string(),
  detail_en: z.string(),
  detail_hi: z.string(),
  severity: z.enum(['critical', 'high', 'medium', 'low']),
});

export const appScanOutput = z.object({
  id: z.uuid(),
  app_name: z.string(),
  package_name: z.string(),
  version_name: z.string().nullable().optional(),
  file_sha256: z.string().nullable().optional(),
  file_size_bytes: z.number().nullable().optional(),
  cert_fingerprint_sha256: z.string().nullable().optional(),
  risk_score: z.number().int().min(0).max(100),
  verdict: z.enum(['safe', 'suspicious', 'dangerous']),
  is_official_match: z.boolean(),
  dangerous_permissions: z.array(permissionIndicatorSchema),
  suspicious_indicators: z.array(suspiciousIndicatorSchema),
  explanation_en: z.string(),
  explanation_hi: z.string(),
  safe_steps_en: z.array(z.string()),
  safe_steps_hi: z.array(z.string()),
  created_at: z.string(),
});

export const packageCheckInput = z.object({
  identifier: z.string().trim().min(3).max(500),
}).strict();

export const deviceCheckupInput = z.object({
  platform: z.enum(['android', 'ios', 'windows', 'macos']),
  screen_lock: z.boolean(),
  sideloading_disabled: z.boolean(),
  play_protect_active: z.boolean(),
  os_updated: z.boolean(),
  dangerous_permissions_checked: z.boolean(),
  remote_access_absent: z.boolean(),
  backup_enabled: z.boolean(),
}).strict();

export const deviceRemediationStepSchema = z.object({
  order: z.number().int(),
  severity: z.enum(['critical', 'high', 'medium', 'info']),
  title_en: z.string(),
  title_hi: z.string(),
  action_en: z.string(),
  action_hi: z.string(),
});

export const deviceCheckupOutput = z.object({
  safety_score: z.number().int().min(0).max(100),
  status: z.enum(['optimal', 'moderate_risk', 'critical_risk']),
  summary_en: z.string(),
  summary_hi: z.string(),
  remediation_steps: z.array(deviceRemediationStepSchema),
});

export const officialAppOutput = z.object({
  name: z.string(),
  package_name: z.string(),
  publisher: z.string(),
  play_url: z.string(),
  verified: z.boolean(),
});

export type AppScanResult = z.infer<typeof appScanOutput>;
export type DeviceCheckupResult = z.infer<typeof deviceCheckupOutput>;
export type OfficialAppInfo = z.infer<typeof officialAppOutput>;

// RailRaksha Shield Schemas
export const signedThreatListOutput = z.object({
  version: z.number().int(),
  algorithm: z.literal('Ed25519'),
  public_key: z.string(),
  timestamp: z.string(),
  blocked_prefixes: z.array(z.string()),
  official_prefixes: z.array(z.string()),
  sha256_checksum: z.string(),
  signature: z.string(),
});

export const prefixLookupInput = z.object({
  prefixes: z.array(z.string().length(8)).min(1).max(100),
}).strict();

export const matchedThreatSchema = z.object({
  prefix: z.string(),
  full_sha256: z.string(),
  verdict: z.enum(['official', 'known_scam']),
  domain: z.string(),
});

export const prefixLookupOutput = z.object({
  matches: z.array(matchedThreatSchema),
});

export const shieldStatsOutput = z.object({
  version: z.number().int(),
  blocked_count: z.number().int(),
  official_count: z.number().int(),
  public_key: z.string(),
  algorithm: z.literal('Ed25519'),
  last_updated: z.string(),
});

export type SignedThreatList = z.infer<typeof signedThreatListOutput>;
export type PrefixLookupResult = z.infer<typeof prefixLookupOutput>;
export type ShieldStats = z.infer<typeof shieldStatsOutput>;

// Phase 7: WebAudit Schemas
export const registerAssetInput = z.object({
  domain: z.string().trim().min(3).max(255),
  verification_method: z.enum(['dns_txt', 'well_known']).default('dns_txt'),
}).strict();

export const verifyAssetOutput = z.object({
  id: z.uuid(),
  domain: z.string(),
  verified: z.boolean(),
  verification_token: z.string(),
  verification_method: z.string(),
  instructions_en: z.string(),
  instructions_hi: z.string(),
});

export const auditScanInput = z.object({
  domain: z.string().trim().min(3).max(255),
}).strict();

export const headerFindingSchema = z.object({
  header: z.string(),
  present: z.boolean(),
  value: z.string().nullable().optional(),
  status: z.enum(['pass', 'warning', 'fail']),
  recommendation_en: z.string(),
  recommendation_hi: z.string(),
});

export const remediationSnippetSchema = z.object({
  target: z.string(),
  code: z.string(),
});

export const auditReportOutput = z.object({
  id: z.uuid(),
  domain: z.string(),
  scan_type: z.enum(['authorized_audit', 'passive_public']),
  overall_score: z.number().int().min(0).max(100),
  grade: z.string(),
  tls_score: z.number().int().min(0).max(100),
  headers_score: z.number().int().min(0).max(100),
  dns_score: z.number().int().min(0).max(100),
  files_score: z.number().int().min(0).max(100),
  header_findings: z.array(headerFindingSchema),
  remediation_snippets: z.array(remediationSnippetSchema),
  tls_summary: z.record(z.string(), z.any()),
  dns_summary: z.record(z.string(), z.any()),
  file_exposures: z.array(z.string()),
  created_at: z.string(),
});

// Phase 7: Booking Blueprint Schemas
export const trainSearchInput = z.object({
  from_station: z.string().trim().min(2).max(10),
  to_station: z.string().trim().min(2).max(10),
  travel_date: z.string().trim().min(8).max(12),
}).strict();

export const classAvailabilitySchema = z.object({
  available_seats: z.number().int(),
  fare: z.number().int(),
});

export const trainSearchResultSchema = z.object({
  train_number: z.string(),
  train_name: z.string(),
  from_station: z.string(),
  to_station: z.string(),
  departure_time: z.string(),
  arrival_time: z.string(),
  duration: z.string(),
  classes: z.record(z.string(), classAvailabilitySchema),
});

export const bookTicketInput = z.object({
  train_number: z.string().trim().min(4).max(10),
  from_station: z.string().trim().min(2).max(10),
  to_station: z.string().trim().min(2).max(10),
  travel_date: z.string().trim().min(8).max(12),
  journey_class: z.string().trim().min(2).max(5),
  passenger_name: z.string().trim().min(2).max(80),
  passenger_age: z.number().int().min(1).max(120),
  passenger_gender: z.enum(['M', 'F', 'O']),
  idempotency_key: z.string().nullable().optional(),
}).strict();

export const ticketOutput = z.object({
  id: z.uuid(),
  pnr: z.string(),
  train_number: z.string(),
  train_name: z.string(),
  from_station: z.string(),
  to_station: z.string(),
  travel_date: z.string(),
  journey_class: z.string(),
  quota: z.string(),
  passenger_name: z.string(),
  passenger_age: z.number().int(),
  passenger_gender: z.string(),
  fare_inr: z.number().int(),
  status: z.string(),
  refund_amount: z.number().int(),
  signature: z.string(),
  qr_payload: z.string(),
  created_at: z.string(),
});

export const verifyTicketInput = z.object({
  qr_payload: z.string().trim().min(20).max(1000),
}).strict();

export const verifyTicketOutput = z.object({
  valid: z.boolean(),
  verdict: z.enum(['authentic', 'counterfeit_or_tampered']),
  pnr: z.string().nullable().optional(),
  train_number: z.string().nullable().optional(),
  passenger_name: z.string().nullable().optional(),
  travel_date: z.string().nullable().optional(),
  message_en: z.string(),
  message_hi: z.string(),
});

export const cancelTicketOutput = z.object({
  pnr: z.string(),
  status: z.literal('cancelled'),
  original_fare: z.number().int(),
  cancellation_fee: z.number().int(),
  refund_amount: z.number().int(),
  refund_status: z.literal('processed_to_sandbox'),
  message_en: z.string(),
  message_hi: z.string(),
});

export const grievanceInput = z.object({
  pnr: z.string().trim().length(10),
  category: z.string().trim().min(3).max(50),
  description: z.string().trim().min(10).max(2000),
}).strict();

export const grievanceOutput = z.object({
  tracking_id: z.string(),
  pnr: z.string(),
  category: z.string(),
  status: z.string(),
  created_at: z.string(),
});

export type AuditReport = z.infer<typeof auditReportOutput>;
export type VerifyAsset = z.infer<typeof verifyAssetOutput>;
export type TrainSearchResult = z.infer<typeof trainSearchResultSchema>;
export type TicketDetails = z.infer<typeof ticketOutput>;
export type BookingTicketInfo = TicketDetails;
export type TicketVerificationResult = z.infer<typeof verifyTicketOutput>;
export type VerifyTicketResult = TicketVerificationResult;
export type CancelTicketResult = z.infer<typeof cancelTicketOutput>;
export type GrievanceDetails = z.infer<typeof grievanceOutput>;
export type GrievanceResult = GrievanceDetails;

// FairQueue Schemas
export const clientSignalsInputSchema = z.object({
  session_id: z.string().min(8).max(64),
  window_code: z.string().max(64).default('TK-12951-NDLS-MMCT'),
  form_fill_ms: z.number().int().min(0).max(300000),
  timing_entropy: z.number().min(0.0).max(1.0),
  is_headless: z.boolean().default(false),
  asn_type: z.enum(['residential', 'datacenter', 'proxy']).default('residential'),
  device_hash: z.string().min(8).max(64),
  request_velocity: z.number().int().min(1).max(1000).default(1),
  tout_script_detected: z.string().max(64).nullable().optional(),
}).strict();

export const signalEvaluationOutputSchema = z.object({
  session_id: z.string(),
  bot_risk_score: z.number().int(),
  risk_level: z.enum(['low', 'medium', 'high', 'critical']),
  risk_reasons: z.array(z.string()),
  challenge_type: z.enum(['none', 'proof_of_work', 'passkey_reauth', 'blocked']),
  challenge_token: z.string().nullable().optional(),
  pow_prefix: z.string().nullable().optional(),
  is_admitted: z.boolean(),
});

export const solveChallengeInputSchema = z.object({
  session_id: z.string().min(8).max(64),
  challenge_token: z.string().min(8).max(64),
  nonce: z.number().int().nullable().optional(),
  passkey_assertion: z.string().nullable().optional(),
}).strict();

export const solveChallengeOutputSchema = z.object({
  session_id: z.string(),
  challenge_solved: z.boolean(),
  status: z.string(),
  message: z.string(),
});

export const joinQueueInputSchema = z.object({
  window_code: z.string().min(4).max(64),
  session_id: z.string().min(8).max(64),
  signals: clientSignalsInputSchema,
}).strict();

export const queueStatusOutputSchema = z.object({
  window_code: z.string(),
  session_id: z.string(),
  queue_status: z.string(),
  assigned_rank: z.number().int(),
  total_quota_seats: z.number().int(),
  estimated_wait_seconds: z.number().int(),
  admitted_seat: z.number().int().nullable().optional(),
  bot_risk_score: z.number().int(),
  challenge_type: z.string(),
  challenge_solved: z.boolean(),
});

export const simulateInputSchema = z.object({
  num_bots: z.number().int().min(10).max(500).default(200),
  num_humans: z.number().int().min(5).max(200).default(50),
  quota_seats: z.number().int().min(5).max(100).default(40),
  lottery_window_seconds: z.number().int().min(5).max(60).default(15),
}).strict();

export const simulationResultOutputSchema = z.object({
  parameters: z.record(z.string(), z.any()),
  traditional_fifo: z.record(z.string(), z.any()),
  fairqueue_lottery: z.record(z.string(), z.any()),
  bot_detection_rate: z.number(),
  human_false_positive_rate: z.number(),
  fairness_index_delta: z.string(),
  verdict: z.string(),
});

export const operatorAnalyticsOutputSchema = z.object({
  total_windows: z.number().int(),
  total_entries: z.number().int(),
  total_bots_blocked: z.number().int(),
  total_humans_admitted: z.number().int(),
  bot_share_percentage: z.number(),
  human_share_percentage: z.number(),
  challenge_distribution: z.record(z.string(), z.number()),
  blocked_tout_software: z.record(z.string(), z.number()),
  device_cluster_risk: z.array(z.record(z.string(), z.any())),
});

export const appealInputSchema = z.object({
  session_id: z.string().min(8).max(64),
  email_or_phone: z.string().min(4).max(100),
  explanation: z.string().min(10).max(500),
}).strict();

export type ClientSignals = z.infer<typeof clientSignalsInputSchema>;
export type SignalEvaluation = z.infer<typeof signalEvaluationOutputSchema>;
export type QueueStatus = z.infer<typeof queueStatusOutputSchema>;
export type SimulationResultData = z.infer<typeof simulationResultOutputSchema>;
export type OperatorAnalyticsData = z.infer<typeof operatorAnalyticsOutputSchema>;

// Phase 9: AI Threat Defense Schemas
export const firewallInspectInputSchema = z.object({
  prompt: z.string().min(1).max(10000),
  session_id: z.string().min(8).max(64),
}).strict();

export const firewallInspectResultSchema = z.object({
  session_id: z.string(),
  is_safe: z.boolean(),
  threat_verdict: z.enum(['safe_passed', 'blocked_injection', 'blocked_pii', 'blocked_policy']),
  risk_score: z.number().int().min(0).max(100),
  sanitized_prompt: z.string(),
  redacted_pii: z.array(z.string()),
  detected_techniques: z.array(z.string()),
  reasons: z.array(z.string()),
  latency_ms: z.number().int(),
});

export const chatbotMessageInputSchema = z.object({
  message: z.string().min(2).max(2000),
  locale: z.enum(['en', 'hi']).default('en'),
  session_id: z.string().min(8).max(64),
}).strict();

export const chatbotMessageResultSchema = z.object({
  reply: z.string(),
  is_safe: z.boolean(),
  source_citation: z.string().nullable().optional(),
  redacted_pii_types: z.array(z.string()),
  threat_detected: z.string().nullable().optional(),
  handoff_railmadad: z.boolean(),
});

export const deepfakeTriageInputSchema = z.object({
  media_type: z.enum(['audio', 'video', 'image']),
  filename: z.string().min(3).max(255),
  file_bytes_b64: z.string().nullable().optional(),
  claimed_source: z.string().max(100).default('Social Media'),
}).strict();

export const deepfakeTriageResultSchema = z.object({
  media_type: z.string(),
  filename: z.string(),
  synthetic_likelihood: z.number(),
  risk_verdict: z.enum(['low_synthetic', 'medium_altered', 'high_deepfake']),
  c2pa_status: z.enum(['valid_credentials', 'absent', 'tampered_signature']),
  spectral_anomalies_detected: z.boolean(),
  metadata_findings: z.array(z.string()),
  safety_advice_en: z.string(),
  safety_advice_hi: z.string(),
});

export const redTeamRunResultSchema = z.object({
  total_test_cases: z.number().int(),
  attack_cases_tested: z.number().int(),
  benign_cases_tested: z.number().int(),
  attacks_blocked: z.number().int(),
  attack_block_rate: z.number(),
  false_blocks_benign: z.number().int(),
  false_block_rate: z.number(),
  average_firewall_latency_ms: z.number(),
  verdict: z.string(),
});

export type FirewallInspectInput = z.infer<typeof firewallInspectInputSchema>;
export type FirewallInspectResult = z.infer<typeof firewallInspectResultSchema>;
export type ChatbotMessageInput = z.infer<typeof chatbotMessageInputSchema>;
export type ChatbotMessageResult = z.infer<typeof chatbotMessageResultSchema>;
export type DeepfakeTriageInput = z.infer<typeof deepfakeTriageInputSchema>;
export type DeepfakeTriageResult = z.infer<typeof deepfakeTriageResultSchema>;
export type RedTeamRunResult = z.infer<typeof redTeamRunResultSchema>;

// --- Phase 10: RailSOC & OT/Signalling Monitoring ---

export const socEventItemSchema = z.object({
  source: z.string().min(2).max(64),
  event_type: z.string().min(2).max(64),
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('low'),
  payload: z.record(z.string(), z.any()).default({}),
}).strict();

export const socEventIngestInputSchema = z.object({
  events: z.array(socEventItemSchema).min(1).max(5000),
}).strict();

export const socEventIngestResultSchema = z.object({
  total_ingested: z.number().int(),
  alerts_triggered: z.number().int(),
  processing_latency_ms: z.number(),
  triggered_alerts: z.array(z.record(z.string(), z.any())),
});

export const socAlertSchema = z.object({
  id: z.string(),
  alert_id: z.string(),
  rule_id: z.string(),
  title: z.string(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  mitre_attack_id: z.string(),
  mitre_tactic: z.string(),
  status: z.string(),
  ioc_indicators: z.array(z.string()),
  evidence_data: z.record(z.string(), z.any()),
  created_at: z.string(),
});

export const socPromoteAlertInputSchema = z.object({
  assigned_analyst: z.string().default('Analyst-RPF-Cyber'),
  auto_execute_playbook: z.boolean().default(true),
}).strict();

export const socIncidentDossierSchema = z.object({
  incident_id: z.string(),
  title: z.string(),
  severity: z.string(),
  status: z.string(),
  cert_in_reported: z.boolean(),
  cert_in_dossier: z.record(z.string(), z.any()),
  playbook_actions_taken: z.array(z.string()),
  assigned_analyst: z.string(),
});

export const socOTNodeSchema = z.object({
  node_id: z.string(),
  system_type: z.string(),
  location_zone: z.string(),
  ip_address: z.string(),
  status: z.string(),
  last_telemetry: z.record(z.string(), z.any()),
  updated_at: z.string(),
});

export const socSimulateAttackInputSchema = z.object({
  scenario: z.enum(['spoofed_radio_stop', 'plc_interlocking_tamper', 'rogue_vlan_device']),
  target_node_id: z.string().default('KAVACH-SEC-RADIO-04'),
}).strict();

export const socSimulateAttackResultSchema = z.object({
  scenario: z.string(),
  attack_description: z.string(),
  detected: z.boolean(),
  triggered_rule_id: z.string(),
  severity: z.string(),
  mitre_attack_id: z.string(),
  kavach_safety_interlock: z.string(),
  cert_in_draft_generated: z.boolean(),
  incident_id: z.string(),
});

export const socBenchmarkResultSchema = z.object({
  events_generated: z.number().int(),
  events_ingested: z.number().int(),
  alerts_generated: z.number().int(),
  duration_seconds: z.number(),
  throughput_events_per_sec: z.number(),
  average_latency_ms: z.number(),
  verdict: z.string(),
});

export const socDashboardStatsSchema = z.object({
  total_alerts: z.number().int(),
  critical_alerts: z.number().int(),
  total_incidents: z.number().int(),
  mean_time_to_respond_minutes: z.number(),
  kavach_interlock_health_percent: z.number(),
  active_monitoring_zones: z.number().int(),
  top_mitre_techniques: z.array(
    z.object({
      technique: z.string(),
      count: z.number().int(),
    })
  ),
});

export type SocEventItem = z.infer<typeof socEventItemSchema>;
export type SocEventIngestInput = z.infer<typeof socEventIngestInputSchema>;
export type SocEventIngestResult = z.infer<typeof socEventIngestResultSchema>;
export type SocAlert = z.infer<typeof socAlertSchema>;
export type SocPromoteAlertInput = z.infer<typeof socPromoteAlertInputSchema>;
export type SocIncidentDossier = z.infer<typeof socIncidentDossierSchema>;
export type SocOTNode = z.infer<typeof socOTNodeSchema>;
export type SocSimulateAttackInput = z.infer<typeof socSimulateAttackInputSchema>;
export type SocSimulateAttackResult = z.infer<typeof socSimulateAttackResultSchema>;
export type SocBenchmarkResult = z.infer<typeof socBenchmarkResultSchema>;
export type SocDashboardStats = z.infer<typeof socDashboardStatsSchema>;

// --- Phase 11: Student Safe Zone (Job Scams, Breach Defense, Academy) ---

export const jobScamCheckInputSchema = z.object({
  content: z.string().min(10).max(10000),
  source_type: z.enum(['appointment_letter', 'email', 'sms_whatsapp', 'job_website']).default('appointment_letter'),
}).strict();

export const jobScamCheckResultSchema = z.object({
  risk_verdict: z.enum(['likely_scam', 'suspicious', 'official_verified']),
  risk_score: z.number().int(),
  red_flags: z.array(z.string()),
  matched_official_portal: z.string().nullable().optional(),
  recommendations_en: z.array(z.string()),
  recommendations_hi: z.array(z.string()),
  audit_id: z.string(),
});

export const passwordBreachCheckInputSchema = z.object({
  hash_prefix: z.string().length(5).regex(/^[0-9A-Fa-f]{5}$/),
}).strict();

export const passwordBreachMatchSchema = z.object({
  suffix: z.string(),
  breach_count: z.number().int(),
});

export const passwordBreachCheckResultSchema = z.object({
  hash_prefix: z.string(),
  matches_found: z.number().int(),
  matches: z.array(passwordBreachMatchSchema),
  is_compromised: z.boolean(),
  safety_advice_en: z.string(),
  safety_advice_hi: z.string(),
});

export const quizSubmissionInputSchema = z.object({
  student_name: z.string().min(2).max(128),
  student_email: z.string().min(5).max(256),
  course_module: z.string().min(3).max(64),
  selected_options: z.record(z.string(), z.number().int()),
}).strict();

export const quizSubmissionResultSchema = z.object({
  course_module: z.string(),
  score: z.number().int(),
  passed: z.boolean(),
  correct_count: z.number().int(),
  total_questions: z.number().int(),
  certificate_id: z.string().nullable().optional(),
  digital_signature: z.string().nullable().optional(),
  issued_at: z.string().nullable().optional(),
  message: z.string(),
});

export const certificateVerificationResultSchema = z.object({
  certificate_id: z.string(),
  is_authentic: z.boolean(),
  status: z.enum(['authentic', 'revoked', 'not_found']),
  student_name: z.string().nullable().optional(),
  course_module: z.string().nullable().optional(),
  score: z.number().int().nullable().optional(),
  issued_at: z.string().nullable().optional(),
  verification_badge: z.string(),
});

export type JobScamCheckInput = z.infer<typeof jobScamCheckInputSchema>;
export type JobScamCheckResult = z.infer<typeof jobScamCheckResultSchema>;
export type PasswordBreachCheckInput = z.infer<typeof passwordBreachCheckInputSchema>;
export type PasswordBreachCheckResult = z.infer<typeof passwordBreachCheckResultSchema>;
export type QuizSubmissionInput = z.infer<typeof quizSubmissionInputSchema>;
export type QuizSubmissionResult = z.infer<typeof quizSubmissionResultSchema>;
export type CertificateVerificationResult = z.infer<typeof certificateVerificationResultSchema>;

// Phase 12: Privacy Vault & DPDP Compliance Toolkit Schemas
export const encryptPIIInputSchema = z.object({
  plaintext_data: z.string().min(1).max(10000),
  classification: z.string().max(64).default('CONFIDENTIAL_PII'),
}).strict();

export const encryptPIIResultSchema = z.object({
  vault_token: z.string(),
  key_version: z.number().int(),
  classification: z.string(),
  blind_index_hash: z.string(),
  message: z.string(),
});

export const decryptPIIInputSchema = z.object({
  vault_token: z.string().min(10).max(64),
}).strict();

export const decryptPIIResultSchema = z.object({
  vault_token: z.string(),
  plaintext_data: z.string(),
  classification: z.string(),
  key_version: z.number().int(),
});

export const keyRotationInputSchema = z.object({
  target_version: z.number().int().min(1).max(2),
}).strict();

export const keyRotationResultSchema = z.object({
  records_reencrypted: z.number().int(),
  target_key_version: z.number().int(),
  message: z.string(),
});

export const consentUpdateInputSchema = z.object({
  principal_id: z.string().min(3).max(128),
  consents: z.array(
    z.object({
      purpose_code: z.string(),
      is_given: z.boolean(),
    })
  ),
}).strict();

export const consentStatusResultSchema = z.object({
  principal_id: z.string(),
  consents: z.record(z.string(), z.boolean()),
  receipts: z.array(z.record(z.string(), z.unknown())),
  legal_basis: z.string(),
});

export const dsrRequestInputSchema = z.object({
  principal_id: z.string().min(3).max(128),
  request_type: z.enum(['access_export', 'correction', 'erasure', 'grievance']),
  details: z.record(z.string(), z.unknown()).default({}),
}).strict();

export const dsrRequestResultSchema = z.object({
  request_id: z.string(),
  principal_id: z.string(),
  request_type: z.string(),
  status: z.string(),
  sla_due_at: z.string(),
  summary: z.string(),
});

export const dataExportResultSchema = z.object({
  principal_id: z.string(),
  exported_at: z.string(),
  compliance_framework: z.string(),
  profile: z.record(z.string(), z.unknown()),
  active_consents: z.record(z.string(), z.boolean()),
  filed_reports_count: z.number().int(),
  student_certificates: z.array(z.record(z.string(), z.unknown())),
  immutable_audit_entries_count: z.number().int(),
  data_retention_days: z.number().int(),
});

export const erasureInputSchema = z.object({
  principal_id: z.string().min(3).max(128),
  confirmation: z.boolean(),
}).strict();

export const erasureResultSchema = z.object({
  principal_id: z.string(),
  status: z.string(),
  purged_records: z.record(z.string(), z.number().int()),
  audit_chain_hash: z.string(),
  message: z.string(),
});

export const auditChainVerifyResultSchema = z.object({
  is_valid: z.boolean(),
  total_blocks: z.number().int(),
  genesis_hash: z.string(),
  latest_block_hash: z.string(),
  integrity_status: z.string(),
});

export const privacyScanResultSchema = z.object({
  tables_scanned: z.number().int(),
  columns_scanned: z.number().int(),
  plaintext_pii_violations: z.number().int(),
  status: z.enum(['CLEAN_COMPLIANT', 'VIOLATIONS_FOUND']),
  findings: z.array(
    z.object({
      table: z.string(),
      column: z.string(),
      protection: z.string(),
      status: z.string(),
    })
  ),
  timestamp: z.string(),
});

export const dpbiBreachDossierInputSchema = z.object({
  incident_title: z.string().min(5).max(200),
  affected_principals_count: z.number().int().min(1),
  pii_categories_exposed: z.array(z.string()).min(1),
  containment_measures_taken: z.string().min(10),
}).strict();

export const dpbiBreachDossierResultSchema = z.object({
  dossier_id: z.string(),
  dpbi_notice_format: z.string(),
  cert_in_cross_reference: z.string(),
  reporting_window_hours: z.number().int(),
  is_within_statutory_window: z.boolean(),
  sections_invoked: z.array(z.string()),
  dossier_content: z.record(z.string(), z.unknown()),
});

export const retentionPolicySchema = z.object({
  policy_id: z.string(),
  data_category: z.string(),
  retention_days: z.number().int(),
  legal_hold: z.boolean(),
  auto_purge_enabled: z.boolean(),
});

export type EncryptPIIInput = z.infer<typeof encryptPIIInputSchema>;
export type EncryptPIIResult = z.infer<typeof encryptPIIResultSchema>;
export type DecryptPIIInput = z.infer<typeof decryptPIIInputSchema>;
export type DecryptPIIResult = z.infer<typeof decryptPIIResultSchema>;
export type KeyRotationInput = z.infer<typeof keyRotationInputSchema>;
export type KeyRotationResult = z.infer<typeof keyRotationResultSchema>;
export type ConsentUpdateInput = z.infer<typeof consentUpdateInputSchema>;
export type ConsentStatusResult = z.infer<typeof consentStatusResultSchema>;
export type DSRRequestInput = z.infer<typeof dsrRequestInputSchema>;
export type DSRRequestResult = z.infer<typeof dsrRequestResultSchema>;
export type DataExportResult = z.infer<typeof dataExportResultSchema>;
export type ErasureInput = z.infer<typeof erasureInputSchema>;
export type ErasureResult = z.infer<typeof erasureResultSchema>;
export type AuditChainVerifyResult = z.infer<typeof auditChainVerifyResultSchema>;
export type PrivacyScanResult = z.infer<typeof privacyScanResultSchema>;
export type DPBIBreachDossierInput = z.infer<typeof dpbiBreachDossierInputSchema>;
export type DPBIBreachDossierResult = z.infer<typeof dpbiBreachDossierResultSchema>;
export type RetentionPolicy = z.infer<typeof retentionPolicySchema>;

// --- Phase 13: Scale, Resilience, Mobile App & Hardening ---

export const sloMetricsOutputSchema = z.object({
  target_slo_percent: z.number(),
  measured_uptime_percent: z.number(),
  status: z.enum(['HEALTHY', 'DEGRADED', 'BREACHED']),
  total_requests_30d: z.number().int(),
  error_budget_total_minutes: z.number(),
  error_budget_consumed_minutes: z.number(),
  error_budget_remaining_percent: z.number(),
  latency_percentiles: z.object({
    p50_ms: z.number(),
    p95_ms: z.number(),
    p99_ms: z.number(),
  }),
  alerts: z.array(z.string()),
});

export const benchmarkInputSchema = z.object({
  concurrency: z.number().int().min(10).max(5000),
  duration_seconds: z.number().int().min(1).max(30),
  cache_enabled: z.boolean(),
}).strict();

export const benchmarkOutputSchema = z.object({
  simulated_rps: z.number().int(),
  total_requests_processed: z.number().int(),
  cache_hit_ratio: z.number(),
  p50_latency_ms: z.number(),
  p95_latency_ms: z.number(),
  p99_latency_ms: z.number(),
  failed_requests: z.number().int(),
  verdict: z.enum(['CAPACITY_VERIFIED_EXCEEDS_50K_RPS', 'CAPACITY_MEETS_TARGET', 'SUB_OPTIMAL']),
});

export const drStatusOutputSchema = z.object({
  primary_region: z.string(),
  secondary_region: z.string(),
  multi_az_status: z.string(),
  latest_pitr_wal_timestamp: z.string(),
  rpo_measured_minutes: z.number(),
  rto_measured_minutes: z.number(),
  rpo_sla_minutes: z.number(),
  rto_sla_minutes: z.number(),
  blue_green: z.object({
    active_slot: z.enum(['BLUE', 'GREEN']),
    inactive_slot: z.enum(['BLUE', 'GREEN']),
    traffic_split_percent: z.record(z.string(), z.number()),
    switchover_ready: z.boolean(),
  }),
  last_drill_timestamp: z.string(),
});

export const drDrillOutputSchema = z.object({
  drill_id: z.string(),
  status: z.enum(['COMPLETED_SUCCESSFULLY', 'FAILED']),
  rpo_minutes: z.number(),
  rto_minutes: z.number(),
  executed_at: z.string(),
  checks: z.array(
    z.object({
      name: z.string(),
      status: z.enum(['PASSED', 'FAILED']),
      duration_sec: z.number(),
    })
  ),
});

export const securityAuditOutputSchema = z.object({
  overall_security_grade: z.enum(['A+', 'A', 'B', 'C']),
  critical_vulnerabilities: z.number().int(),
  high_vulnerabilities: z.number().int(),
  medium_vulnerabilities: z.number().int(),
  low_vulnerabilities: z.number().int(),
  stride_matrix: z.array(
    z.object({
      stride_category: z.enum([
        'Spoofing',
        'Tampering',
        'Repudiation',
        'Information Disclosure',
        'Denial of Service',
        'Elevation of Privilege',
      ]),
      threat_description: z.string(),
      mitigation_strategy: z.string(),
      verification_status: z.enum(['VERIFIED', 'MONITORED']),
    })
  ),
  vulnerabilities_fixed: z.array(z.string()),
  last_zap_scan_timestamp: z.string(),
});

export const costOutputSchema = z.object({
  monthly_estimated_inr: z.number().int(),
  autoscaling_savings_percent: z.number(),
  currency: z.string(),
  region: z.string(),
  infrastructure_breakdown: z.array(
    z.object({
      service: z.string(),
      cost_inr: z.number().int(),
    })
  ),
});

export type SLOMetricsResult = z.infer<typeof sloMetricsOutputSchema>;
export type BenchmarkInput = z.infer<typeof benchmarkInputSchema>;
export type BenchmarkResult = z.infer<typeof benchmarkOutputSchema>;
export type DRStatusResult = z.infer<typeof drStatusOutputSchema>;
export type DRDrillResult = z.infer<typeof drDrillOutputSchema>;
export type SecurityAuditResult = z.infer<typeof securityAuditOutputSchema>;
export type CostResult = z.infer<typeof costOutputSchema>;

// --- Phase 14: Public API, Partner Ecosystem, Docs & Developer Portal ---

export const sandboxKeyInputSchema = z.object({
  organization_name: z.string().min(2).max(100),
  developer_email: z.string().min(5).max(100),
  use_case: z.enum(['BANKING_UPI', 'TELECOM_SMS', 'COLLEGE_PORTAL', 'GENERAL_APP']),
}).strict();

export const sandboxKeyOutputSchema = z.object({
  api_key: z.string(),
  tenant_id: z.string(),
  tier: z.literal('SANDBOX'),
  quota_limit_per_day: z.number().int(),
  expires_at: z.string(),
  quickstart_curl: z.string(),
  quickstart_python: z.string(),
  quickstart_typescript: z.string(),
});

export const partnerVerifyOutputSchema = z.object({
  identifier: z.string(),
  classification: z.enum(['OFFICIAL', 'SUSPICIOUS', 'BLOCKED', 'UNKNOWN']),
  risk_score: z.number().int(),
  brand: z.string(),
  recommended_action: z.enum(['ALLOW', 'WARN_USER', 'BLOCK_TRANSACTION']),
  latency_ms: z.number(),
  cached: z.boolean(),
  timestamp: z.string(),
});

export const partnerUrlScanInputSchema = z.object({
  url: z.string().min(4).max(500),
}).strict();

export const partnerUrlScanOutputSchema = z.object({
  url: z.string(),
  domain: z.string(),
  is_phishing: z.boolean(),
  risk_score: z.number().int(),
  impersonated_brand: z.string(),
  homoglyph_detected: z.boolean(),
  recommended_action: z.enum(['ALLOW', 'BLOCK']),
});

export const partnerMessageAnalyzeInputSchema = z.object({
  sender_id: z.string().max(50).default(''),
  message_text: z.string().min(5).max(2000),
}).strict();

export const partnerMessageAnalyzeOutputSchema = z.object({
  is_fraud: z.boolean(),
  fraud_category: z.enum(['TELEGRAM_APK_SCAM', 'REFUND_PHISHING', 'FAKE_JOB_RECRUITMENT', 'BENIGN']),
  risk_score: z.number().int(),
  extracted_indicators: z.array(z.string()),
  advice_en: z.string(),
  advice_hi: z.string(),
});

export const tenantProfileOutputSchema = z.object({
  tenant_id: z.string(),
  name: z.string(),
  tier: z.string(),
  white_label_domain: z.string(),
  quota_limit_per_day: z.number().int(),
  quota_used_today: z.number().int(),
  created_at: z.string(),
});

export const webhookTestInputSchema = z.object({
  webhook_url: z.string().min(10).max(500),
  event_type: z.enum(['THREAT_DETECTED', 'DOMAIN_BLOCKED', 'BREACH_ALERT']),
}).strict();

export const webhookTestOutputSchema = z.object({
  status: z.enum(['DELIVERED', 'FAILED']),
  http_status: z.number().int(),
  event_id: z.string(),
  dispatched_payload: z.record(z.string(), z.unknown()),
});

export const kpiDashboardOutputSchema = z.object({
  total_verifications_count: z.number().int(),
  estimated_fraud_loss_prevented_inr: z.number().int(),
  fake_domains_dismantled: z.number().int(),
  active_institutions_onboarded: z.number().int(),
  citizen_trust_index_percent: z.number(),
  platform_uptime_percent: z.number(),
  last_updated: z.string(),
});

export type SandboxKeyInput = z.infer<typeof sandboxKeyInputSchema>;
export type SandboxKeyResult = z.infer<typeof sandboxKeyOutputSchema>;
export type PartnerVerifyResult = z.infer<typeof partnerVerifyOutputSchema>;
export type PartnerUrlScanInput = z.infer<typeof partnerUrlScanInputSchema>;
export type PartnerUrlScanResult = z.infer<typeof partnerUrlScanOutputSchema>;
export type PartnerMessageAnalyzeInput = z.infer<typeof partnerMessageAnalyzeInputSchema>;
export type PartnerMessageAnalyzeResult = z.infer<typeof partnerMessageAnalyzeOutputSchema>;
export type TenantProfileResult = z.infer<typeof tenantProfileOutputSchema>;
export type WebhookTestInput = z.infer<typeof webhookTestInputSchema>;
export type WebhookTestResult = z.infer<typeof webhookTestOutputSchema>;
export type KPIDashboardResult = z.infer<typeof kpiDashboardOutputSchema>;

// Phase 15: Advanced R&D Schemas
export const federatedStatusOutputSchema = z.object({
  model_version: z.string(),
  participating_edge_devices: z.number().int(),
  active_round: z.number().int(),
  global_loss: z.number(),
  accuracy_percent: z.number(),
  differential_privacy_epsilon: z.number(),
  differential_privacy_delta: z.number(),
  noise_mechanism: z.string(),
  privacy_budget_consumed_percent: z.number(),
  device_os_distribution: z.record(z.string(), z.number()),
  status: z.enum(['TRAINING_CONVERGED', 'ACTIVE_AGGREGATION', 'CALIBRATING']),
});

export const federatedRoundInputSchema = z.object({
  device_id: z.string().min(4).max(64).default('pixel-edge-9401'),
  local_samples_count: z.number().int().min(10).max(10000).default(120),
  local_loss: z.number().min(0.001).max(2.0).default(0.045),
  gradient_norm: z.number().min(0.001).max(10.0).default(0.12),
  clip_threshold: z.number().min(0.1).max(5.0).default(1.0),
  differential_privacy_noise: z.boolean().default(true),
}).strict();

export const federatedRoundOutputSchema = z.object({
  round_number: z.number().int(),
  device_id: z.string(),
  accepted: z.boolean(),
  dp_noise_added: z.number(),
  updated_global_loss: z.number(),
  updated_accuracy_percent: z.number(),
  consumed_epsilon_increment: z.number(),
  status: z.enum(['WEIGHT_AGGREGATED_SECURE_FEDAVG', 'CLIPPED_AND_NOISED']),
  client_feedback: z.string(),
});

export const ivrCallInputSchema = z.object({
  caller_number: z.string().min(8).max(20).default('+919876543210'),
  language: z.enum(['hi-IN', 'en-IN', 'ta-IN', 'te-IN', 'bn-IN', 'mr-IN']).default('hi-IN'),
  query_input: z.string().min(3).max(100).default('9876543210'),
  input_type: z.enum(['DTMF_DIGITS', 'SPEECH_TEXT']).default('DTMF_DIGITS'),
}).strict();

export const ivrCallOutputSchema = z.object({
  call_session_id: z.string(),
  caller_number: z.string(),
  language: z.string(),
  query_input: z.string(),
  classification: z.enum(['OFFICIAL', 'SCAM_ALERT', 'UNKNOWN']),
  risk_score: z.number().int(),
  audio_script: z.string(),
  ssml_markup: z.string(),
  dtmf_repeat_digit: z.string(),
  dtmf_operator_digit: z.string(),
  safety_guidance: z.string(),
  timestamp: z.string(),
});

export const ivrHistoryItemSchema = z.object({
  session_id: z.string(),
  caller_number: z.string(),
  language: z.string(),
  query_input: z.string(),
  classification: z.string(),
  risk_score: z.number().int(),
  timestamp: z.string(),
});

export const telecomHeaderInputSchema = z.object({
  sms_header: z.string().min(3).max(20).default('VM-IRCTC'),
  message_sample: z.string().max(500).default(''),
}).strict();

export const telecomHeaderOutputSchema = z.object({
  sms_header: z.string(),
  dlt_registered: z.boolean(),
  principal_entity: z.string(),
  telecom_circle_prefix: z.string(),
  spoof_detected: z.boolean(),
  verdict: z.enum(['OFFICIAL_DLT_VERIFIED', 'SPOOFED_UNAUTHORIZED_HEADER', 'UNKNOWN_UNREGISTERED']),
  risk_score: z.number().int(),
  telecom_action: z.enum(['DELIVER', 'QUARANTINE_WARNING', 'BLOCK_IMMEDIATELY']),
  explanation: z.string(),
});

export const upiVerifyInputSchema = z.object({
  vpa_handle: z.string().min(5).max(100).default('irctc@icici'),
  amount_inr: z.number().min(0.0).max(1000000.0).default(0.0),
}).strict();

export const upiVerifyOutputSchema = z.object({
  vpa_handle: z.string(),
  merchant_name: z.string(),
  is_official_railway_merchant: z.boolean(),
  risk_level: z.enum(['LOW_VERIFIED', 'HIGH_FRAUD_COLLECT', 'CRITICAL_PHISHING']),
  risk_score: z.number().int(),
  npci_category: z.string(),
  recommended_action: z.enum(['ALLOW_PAYMENT', 'BLOCK_AND_WARN_USER']),
  warning_message: z.string(),
});

export const graphNodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  node_type: z.enum(['PHONE', 'UPI', 'DOMAIN', 'BANK_ACCOUNT', 'SMS_HEADER']),
  risk_score: z.number().int(),
});

export const graphEdgeSchema = z.object({
  source: z.string(),
  target: z.string(),
  co_occurrence_count: z.number().int(),
  confidence_percent: z.number(),
});

export const fraudSyndicateSchema = z.object({
  syndicate_id: z.string(),
  name: z.string(),
  origin_district: z.string(),
  estimated_victim_count: z.number().int(),
  estimated_fraud_inr: z.number().int(),
  modularity_cluster: z.number().int(),
  central_hub: z.string(),
  risk_level: z.enum(['CRITICAL', 'HIGH', 'MODERATE']),
  nodes: z.array(graphNodeSchema),
  edges: z.array(graphEdgeSchema),
});

export const fraudRingsOutputSchema = z.object({
  total_active_syndicates: z.number().int(),
  total_nodes_tracked: z.number().int(),
  total_edges_mapped: z.number().int(),
  syndicates: z.array(fraudSyndicateSchema),
});

export const driftMetricsOutputSchema = z.object({
  population_stability_index: z.number(),
  psi_threshold: z.number(),
  drift_detected: z.boolean(),
  false_positive_rate_percent: z.number(),
  f1_score: z.number(),
  data_slices_evaluated: z.number().int(),
  last_retraining_timestamp: z.string(),
  next_scheduled_eval: z.string(),
  retraining_pipeline_status: z.enum(['OPTIMAL_IN_BOUNDS', 'RETRAINING_TRIGGERED', 'MONITORING']),
});

export const bountyResearcherSchema = z.object({
  handle: z.string(),
  valid_reports: z.number().int(),
  bounty_awarded_inr: z.number().int(),
  specialization: z.string(),
  badge: z.string(),
});

export const bugBountyOutputSchema = z.object({
  program_name: z.string(),
  total_reports_processed: z.number().int(),
  valid_bounties_awarded: z.number().int(),
  total_bounties_inr: z.number().int(),
  avg_response_time_hours: z.number(),
  researchers: z.array(bountyResearcherSchema),
});

export type FederatedStatusResult = z.infer<typeof federatedStatusOutputSchema>;
export type FederatedRoundInput = z.infer<typeof federatedRoundInputSchema>;
export type FederatedRoundResult = z.infer<typeof federatedRoundOutputSchema>;
export type IVRCallInput = z.infer<typeof ivrCallInputSchema>;
export type IVRCallResult = z.infer<typeof ivrCallOutputSchema>;
export type IVRHistoryItemResult = z.infer<typeof ivrHistoryItemSchema>;
export type TelecomHeaderInput = z.infer<typeof telecomHeaderInputSchema>;
export type TelecomHeaderResult = z.infer<typeof telecomHeaderOutputSchema>;
export type UPIVerifyInput = z.infer<typeof upiVerifyInputSchema>;
export type UPIVerifyResult = z.infer<typeof upiVerifyOutputSchema>;
export type FraudNode = z.infer<typeof graphNodeSchema>;
export type FraudEdge = z.infer<typeof graphEdgeSchema>;
export type FraudSyndicateItem = z.infer<typeof fraudSyndicateSchema>;
export type FraudRingsResult = z.infer<typeof fraudRingsOutputSchema>;
export type DriftMetricsResult = z.infer<typeof driftMetricsOutputSchema>;
export type BugBountyResult = z.infer<typeof bugBountyOutputSchema>;








