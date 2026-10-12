import {getTranslations} from 'next-intl/server';
import Link from 'next/link';
import {ArrowLeft,ArrowRight,KeyRound,ShieldCheck} from 'lucide-react';
import {getSession} from '@/lib/auth';
import {redirect} from 'next/navigation';
export const metadata={title:'Sign in',robots:{index:false,follow:false}};
export default async function Login({params,searchParams}:{params:Promise<{locale:string}>;searchParams:Promise<{error?:string}>}){
  const {locale}=await params;const {error}=await searchParams;const t=await getTranslations('login');const common=await getTranslations('common');
  if(await getSession())redirect(`/${locale}/dashboard`);
  return <section className="container account-page"><Link className="back-link" href={`/${locale}`}><ArrowLeft size={16} aria-hidden="true"/>{common('back')}</Link><div className="login-grid"><div className="login-story"><span className="eyebrow">{t('eyebrow')}</span><h1>{t('title')}</h1><p>{t('lead')}</p><div className="security-note"><ShieldCheck size={24} aria-hidden="true"/><p>{t('security')}</p></div></div><div className="login-card"><span className="large-icon"><KeyRound size={32} aria-hidden="true"/></span><h2>{t('continue')}</h2>{error&&<div role="alert" className="alert alert-danger">{t(error==='unavailable'?'unavailable':'error')}</div>}<a className="button" href={`/api/auth/login?locale=${locale}`}>{t('continue')}<ArrowRight size={18} aria-hidden="true"/></a><div className="login-register"><p>{t('account')}</p><a className="text-link" href={`/api/auth/login?locale=${locale}&mode=register`}>{t('register')}<ArrowRight size={16} aria-hidden="true"/></a></div><p className="small-copy">{t('reset')}</p><div className="demo-note">{t('demo')}</div></div></div></section>;
}
