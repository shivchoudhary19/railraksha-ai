import {assetOutput,canOperate,reportOutput,type CitizenReport,type RegistryAsset} from '@railraksha/schemas';
import {apiFetch,requireSession} from '@/lib/auth';
import {AccountNav} from './account-nav';
import {SafetyTools,type ToolMode} from './safety-tools';
import Link from 'next/link';

export async function ToolPage({mode,locale}:{mode:ToolMode;locale:string}){
  const language=locale==='hi'?'hi':'en';const session=await requireSession(language);
  if(mode==='moderation'&&!canOperate(session.roles))return <section className="container dashboard-page"><h1>{language==='hi'?'अनुमति आवश्यक है':'Permission required'}</h1><Link href={`/${language}/dashboard`}>{language==='hi'?'मेरे खाते पर लौटें':'Return to my account'}</Link></section>;
  let reports:CitizenReport[]=[];let assets:RegistryAsset[]=[];let failed=false;
  if(mode!=='verify'){
    try{const response=await apiFetch(`/v1/${mode}`,session);if(!response.ok)failed=true;else if(mode==='registry')assets=assetOutput.array().parse(await response.json());else reports=reportOutput.array().parse(await response.json());}catch{failed=true;}
  }
  const titles={verify:['Check before you trust.','भरोसा करने से पहले जाँचें।'],reports:['Report. Track. Stay informed.','रिपोर्ट करें। प्रगति जानें।'],registry:['Know the source.','स्रोत की पहचान करें।'],moderation:['Review with care.','सावधानी से समीक्षा करें।']};
  return <section className="container dashboard-page"><AccountNav locale={language} session={session}/><header className="dashboard-heading"><div><span className="eyebrow">RAILRAKSHA · DEMO</span><h1>{titles[mode][language==='hi'?1:0]}</h1><p>{language==='hi'?'अज्ञात पहचान को सुरक्षित न मानें। निजी जानकारी साझा न करें।':'An unknown identifier is not a safety guarantee. Keep private information out of reports.'}</p></div></header><SafetyTools mode={mode} locale={language} csrf={session.csrf} initialReports={reports} initialAssets={assets} canEdit={session.roles.some(role=>['analyst','admin','super_admin'].includes(role))} initialError={failed}/></section>;
}
