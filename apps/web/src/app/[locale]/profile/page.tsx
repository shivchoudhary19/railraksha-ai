import {getTranslations} from 'next-intl/server';
import {apiFetch,requireSession,issuer} from '@/lib/auth';
import {AccountNav} from '@/components/account-nav';
import {ArrowUpRight,CheckCircle2,ShieldCheck} from 'lucide-react';
import {z} from 'zod';
export const metadata={title:'Profile settings',robots:{index:false,follow:false}};
const profile=z.object({display_name:z.string(),language:z.enum(['en','hi'])});
export default async function Profile({params,searchParams}:{params:Promise<{locale:string}>;searchParams:Promise<{saved?:string;error?:string}>}){
  const {locale}=await params;const status=await searchParams;const session=await requireSession(locale);const t=await getTranslations('profile');const common=await getTranslations('common');
  let values:{display_name:string;language:'en'|'hi'}|null=null;
  if(session.sub.startsWith('google_')){
    values={display_name:session.name,language:(locale==='hi'?'hi':'en')};
  }else{
    try{const response=await apiFetch('/v1/profile',session);if(response.ok)values=profile.parse(await response.json());}catch{/* Show the translated load error below. */}
  }
  return <section className="container dashboard-page"><AccountNav locale={locale} session={session}/><header className="dashboard-heading"><div><span className="eyebrow">{common('name')}</span><h1>{t('title')}</h1><p>{t('lead')}</p></div></header><div className="dashboard-grid"><section className="settings-card">{status.saved&&<p role="status" className="alert alert-success"><CheckCircle2 size={18} aria-hidden="true"/>{t('saved')}</p>}{status.error&&<p role="alert" className="alert alert-danger">{t('error')}</p>}{!values?<p role="alert" className="alert alert-danger">{t('loadError')}</p>:<form action="/api/profile" method="POST" className="profile-form"><input type="hidden" name="csrf" value={session.csrf}/><input type="hidden" name="locale" value={locale}/><label htmlFor="display-name">{common('name')}</label><input id="display-name" name="display_name" autoComplete="nickname" required minLength={1} maxLength={80} defaultValue={values.display_name}/><label htmlFor="account-email">{common('email')}</label><input id="account-email" type="email" readOnly value={session.email}/><p className="field-help">{t('identity')}</p><label htmlFor="language">{common('language')}</label><select id="language" name="language" defaultValue={values.language}><option value="en">English</option><option value="hi">हिंदी</option></select><button className="button" type="submit">{common('save')}</button></form>}</section><aside className="security-card"><ShieldCheck size={32} strokeWidth={1.5} aria-hidden="true"/><h2>{t('securityTitle')}</h2><p>{t('securityLead')}</p><a className="text-link" href={`${issuer()}/account/#/account-security/signing-in`}>{t('securityCta')}<ArrowUpRight size={17} aria-hidden="true"/></a></aside></div></section>;
}
