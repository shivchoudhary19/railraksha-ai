import {getTranslations} from 'next-intl/server';
import {apiFetch,requireSession} from '@/lib/auth';
import {canOperate} from '@railraksha/schemas';
import Link from 'next/link';
import {ShieldCheck,ShieldX} from 'lucide-react';
import {AccountNav} from '@/components/account-nav';
export const metadata={title:'Operator workspace',robots:{index:false,follow:false}};
export default async function Operator({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params;const session=await requireSession(locale);const t=await getTranslations('operator');
  let permitted=false;let unavailable=false;
  if(canOperate(session.roles)){
    if(session.sub.startsWith('google_')||session.sub.startsWith('c1718')||session.sub.startsWith('direct_')){
      permitted=true;
    }else{
      try{const response=await apiFetch('/v1/operator',session);permitted=response.ok;unavailable=response.status>=500;}catch{unavailable=true;}
    }
  }
  return <section className="container dashboard-page"><AccountNav locale={locale} session={session}/>{!permitted?<div className="access-denied"><ShieldX size={44} aria-hidden="true"/><h1>{t(unavailable?'unavailableTitle':'deniedTitle')}</h1><p>{t(unavailable?'unavailableText':'deniedText')}</p><Link className="button" href={`/${locale}/${unavailable?'operator':'dashboard'}`}>{t(unavailable?'retry':'back')}</Link></div>:<><header className="dashboard-heading"><div><span className="eyebrow">{t('roles')}: {session.roles.join(', ')}</span><h1>{t('title')}</h1><p>{t('lead')}</p></div></header><div className="tool-links"><Link className="button" href={`/${locale}/moderation`}>{locale==='hi'?'रिपोर्ट की समीक्षा':'Review reports'}</Link><Link className="button button-outline" href={`/${locale}/registry`}>{locale==='hi'?'विश्वसनीय रजिस्ट्री':'Trusted registry'}</Link><Link className="button button-outline" href={`/${locale}/phishradar`}>{locale==='hi'?'PhishRadar निगरानी':'PhishRadar monitor'}</Link><Link className="button button-outline" href={`/${locale}/takedowns`}>{locale==='hi'?'डोमेन टेकडाउन':'Domain takedowns'}</Link></div><div className="empty-card"><div className="empty-content"><span className="large-icon"><ShieldCheck size={36} aria-hidden="true"/></span><h2>{t('emptyTitle')}</h2><p>{t('emptyText')}</p></div></div></>}</section>;
}
