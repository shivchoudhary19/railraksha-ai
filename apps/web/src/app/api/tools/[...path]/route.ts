import {
  appealInputSchema,
  assetInput,
  auditScanInput,
  bookTicketInput,
  chatbotMessageInputSchema,
  clientSignalsInputSchema,
  deepfakeTriageInputSchema,
  deviceCheckupInput,
  emailAnalysisInput,
  firewallInspectInputSchema,
  grievanceInput,
  jobScamCheckInputSchema,
  joinQueueInputSchema,
  moderationInput,
  packageCheckInput,
  passwordBreachCheckInputSchema,
  phishradarScanInput,
  prefixLookupInput,
  quizSubmissionInputSchema,
  registerAssetInput,
  reportInput,
  scamLensInput,
  simulateInputSchema,
  socEventIngestInputSchema,
  socPromoteAlertInputSchema,
  socSimulateAttackInputSchema,
  solveChallengeInputSchema,
  takedownCaseInput,
  takedownStatusInput,
  trainSearchInput,
  verifyInput,
  verifyTicketInput,
  encryptPIIInputSchema,
  decryptPIIInputSchema,
  keyRotationInputSchema,
  consentUpdateInputSchema,
  dsrRequestInputSchema,
  erasureInputSchema,
  dpbiBreachDossierInputSchema,
  benchmarkInputSchema,
  sandboxKeyInputSchema,
  partnerUrlScanInputSchema,
  partnerMessageAnalyzeInputSchema,
  webhookTestInputSchema,
  federatedRoundInputSchema,
  ivrCallInputSchema,
  telecomHeaderInputSchema,
  upiVerifyInputSchema,
} from '@railraksha/schemas';
import {apiFetch,getSession} from '@/lib/auth';
import {appOrigin,csrfMatches,trustedOrigin} from '@/lib/security';
import {NextRequest, NextResponse} from 'next/server';

const uuid='[0-9a-fA-F-]{36}';
const pnr='[0-9]{10}';
const altId='[A-Za-z0-9_-]+';
const certId='[A-Za-z0-9_-]+';
const readable=new RegExp(`^(registry|reports|moderation|phishradar/scans|phishradar/monitor|takedowns|scamlens/emergency-checklist|appguard/official-apps|shield/public-key|shield/threat-list|shield/stats|webaudit/scans/${uuid}|booking/pnr/${pnr}|fairqueue/waiting-room/status|fairqueue/operator/analytics|fairqueue/operator/rpf-export|aithreat/threat-intel|aithreat/phishing-clusters|soc/alerts|soc/ot/nodes|soc/dashboard/stats|student/academy/lessons|student/certificates/${certId}/verify|privacy/consent|privacy/dsr/export|privacy/audit/verify|privacy/policies|resilience/slo|resilience/dr/status|resilience/security/audit|resilience/cost|partner/verify|partner/feed/stix2|partner/tenants|partner/metrics/kpis|advanced-rd/federated/status|advanced-rd/ivr/history|advanced-rd/graph/fraud-rings|advanced-rd/drift/metrics|advanced-rd/bug-bounty/leaderboard|reports/${uuid}|reports/${uuid}/evidence|evidence/${uuid})$`);
const writable=new RegExp(`^(verify|verify/qr|reports|registry|phishradar/scan|phishradar/monitor/simulate|scamlens/analyze|scamlens/analyze-email|appguard/check-package|appguard/scan-apk|appguard/device-checkup|shield/lookup-prefixes|webaudit/assets|webaudit/assets/${uuid}/verify|webaudit/scan|booking/trains/search|booking/book|booking/verify-ticket|booking/pnr/${pnr}/cancel|booking/grievances|fairqueue/evaluate-signals|fairqueue/solve-challenge|fairqueue/waiting-room/join|fairqueue/simulate|fairqueue/appeal|aithreat/firewall/inspect|aithreat/assistant/chat|aithreat/deepfake/triage|aithreat/red-team/run|soc/events/ingest|soc/ot/simulate-attack|soc/benchmark/ingest|soc/alerts/${altId}/promote|student/job-scam/check|student/breach/check-password|student/academy/submit-quiz|privacy/vault/encrypt|privacy/vault/decrypt|privacy/vault/rotate|privacy/consent|privacy/dsr/request|privacy/dsr/erase|privacy/scanner/scan|privacy/breach/dossier|resilience/benchmark/verify|resilience/dr/drill|partner/keys/create-sandbox|partner/url/scan|partner/message/analyze|partner/webhooks/test|advanced-rd/federated/round|advanced-rd/ivr/call-verify|advanced-rd/telecom/header-verify|advanced-rd/upi/verify-vpa|takedowns|takedowns/${uuid}/status|moderation/${uuid}|registry/${uuid}/revoke|reports/${uuid}/evidence)$`);
type Context={params:Promise<{path:string[]}>};

async function handle(request:NextRequest,context:Context){
  const {path:parts}=await context.params;const path=parts.join('/');const post=request.method==='POST';
  if(!(post?writable:readable).test(path))return NextResponse.json({error:'Unknown tool'},{status:404});
  const session=await getSession();if(!session)return NextResponse.json({error:'Sign in to continue'},{status:401});
  if(post&&(!trustedOrigin(request.headers.get('origin'),appOrigin())||!csrfMatches(session.csrf,request.headers.get('x-csrf-token'))))return NextResponse.json({error:'Invalid request'},{status:403});
  try{
    let body:BodyInit|undefined;let contentType='application/json';
    const upload=path==='verify/qr'||path.endsWith('/evidence')||path==='appguard/scan-apk';
    if(post){
      const limit=upload?(path==='appguard/scan-apk'?150*1024*1024+65536:5*1024*1024+65536):65536;
      if(!request.body)return NextResponse.json({error:'Missing data'},{status:400});
      const reader=request.body.getReader();const chunks:Uint8Array[]=[];let size=0;
      while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();return NextResponse.json({error:'Request too large'},{status:413});}chunks.push(value);}
      const bytes=Buffer.concat(chunks);
      if(upload){
        contentType=request.headers.get('content-type')??'';
        if(!contentType.startsWith('multipart/form-data;'))return NextResponse.json({error:'Expected a file'},{status:400});
        body=bytes;
      }else{
        const schema = path === 'verify' ? verifyInput
          : path === 'registry' ? assetInput
          : path === 'reports' ? reportInput
          : path === 'phishradar/scan' ? phishradarScanInput
          : path === 'scamlens/analyze' ? scamLensInput
          : path === 'scamlens/analyze-email' ? emailAnalysisInput
          : path === 'appguard/check-package' ? packageCheckInput
          : path === 'appguard/device-checkup' ? deviceCheckupInput
          : path === 'shield/lookup-prefixes' ? prefixLookupInput
          : path === 'webaudit/assets' ? registerAssetInput
          : path === 'webaudit/scan' ? auditScanInput
          : path === 'booking/trains/search' ? trainSearchInput
          : path === 'booking/book' ? bookTicketInput
          : path === 'booking/verify-ticket' ? verifyTicketInput
          : path === 'booking/grievances' ? grievanceInput
          : path === 'fairqueue/evaluate-signals' ? clientSignalsInputSchema
          : path === 'fairqueue/solve-challenge' ? solveChallengeInputSchema
          : path === 'fairqueue/waiting-room/join' ? joinQueueInputSchema
          : path === 'fairqueue/simulate' ? simulateInputSchema
          : path === 'fairqueue/appeal' ? appealInputSchema
          : path === 'aithreat/firewall/inspect' ? firewallInspectInputSchema
          : path === 'aithreat/assistant/chat' ? chatbotMessageInputSchema
          : path === 'aithreat/deepfake/triage' ? deepfakeTriageInputSchema
          : path === 'soc/events/ingest' ? socEventIngestInputSchema
          : path === 'soc/ot/simulate-attack' ? socSimulateAttackInputSchema
          : path.endsWith('/promote') ? socPromoteAlertInputSchema
          : path === 'student/job-scam/check' ? jobScamCheckInputSchema
          : path === 'student/breach/check-password' ? passwordBreachCheckInputSchema
          : path === 'student/academy/submit-quiz' ? quizSubmissionInputSchema
          : path === 'privacy/vault/encrypt' ? encryptPIIInputSchema
          : path === 'privacy/vault/decrypt' ? decryptPIIInputSchema
          : path === 'privacy/vault/rotate' ? keyRotationInputSchema
          : path === 'privacy/consent' ? consentUpdateInputSchema
          : path === 'privacy/dsr/request' ? dsrRequestInputSchema
          : path === 'privacy/dsr/erase' ? erasureInputSchema
          : path === 'privacy/breach/dossier' ? dpbiBreachDossierInputSchema
          : path === 'resilience/benchmark/verify' ? benchmarkInputSchema
          : path === 'partner/keys/create-sandbox' ? sandboxKeyInputSchema
          : path === 'partner/url/scan' ? partnerUrlScanInputSchema
          : path === 'partner/message/analyze' ? partnerMessageAnalyzeInputSchema
          : path === 'partner/webhooks/test' ? webhookTestInputSchema
          : path === 'advanced-rd/federated/round' ? federatedRoundInputSchema
          : path === 'advanced-rd/ivr/call-verify' ? ivrCallInputSchema
          : path === 'advanced-rd/telecom/header-verify' ? telecomHeaderInputSchema
          : path === 'advanced-rd/upi/verify-vpa' ? upiVerifyInputSchema
          : path === 'takedowns' ? takedownCaseInput
          : path.endsWith('/status') ? takedownStatusInput
          : path.startsWith('moderation/') ? moderationInput
          : null;
        const parsed=schema?.safeParse(JSON.parse(bytes.toString('utf8')));
        if(schema&&(!parsed||!parsed.success))return NextResponse.json({error:'Check the form fields'},{status:422});
        body=JSON.stringify(parsed?.success?parsed.data:{});
      }
    }
    const query = path === 'registry'
      ? new URLSearchParams({search:(request.nextUrl.searchParams.get('search')??'').slice(0,100)}).toString()
      : path === 'fairqueue/waiting-room/status'
      ? new URLSearchParams({
          window_code: request.nextUrl.searchParams.get('window_code')??'',
          session_id: request.nextUrl.searchParams.get('session_id')??''
        }).toString()
      : path === 'privacy/consent' || path === 'privacy/dsr/export'
      ? new URLSearchParams({
          principal_id: request.nextUrl.searchParams.get('principal_id')??''
        }).toString()
      : path === 'partner/verify'
      ? new URLSearchParams({
          identifier: request.nextUrl.searchParams.get('identifier')??''
        }).toString()
      : '';
    const response=await apiFetch(`/v1/${path}${query?'?'+query:''}`,session,{method:request.method,body,headers:{'Content-Type':contentType},signal:AbortSignal.timeout(upload?45000:5000)});
    if(path.startsWith('evidence/')&&response.ok)return new NextResponse(await response.arrayBuffer(),{headers:{'Content-Type':'image/png','Content-Disposition':'attachment; filename="evidence.png"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
    return NextResponse.json(await response.json(),{status:response.status,headers:{'Cache-Control':'no-store'}});
  }catch{return NextResponse.json({error:'The tool is unavailable. Please try again.'},{status:503});}
}
export const GET=handle;
export const POST=handle;
