import {getTranslations,setRequestLocale} from 'next-intl/server';
import {notFound} from 'next/navigation';
import Link from 'next/link';
import type {Metadata} from 'next';
import {ShieldCheck} from 'lucide-react';
import {Brand} from '@/components/brand';
import {SiteHeader} from '@/components/site-header';
import {getSession} from '@/lib/auth';
import '../globals.css';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata:Metadata={
  title:{default:'RailRaksha AI — Safer digital journeys',template:'%s | RailRaksha AI'},
  description:'An independent digital safety project for railway passengers and students. Learn safer habits and protect your account.',
  robots:{index:true,follow:true}
};

export default async function Layout({children,params}:{children:React.ReactNode;params:Promise<{locale:string}>}){
  const {locale}=await params;
  if(!['en','hi'].includes(locale))notFound();
  setRequestLocale(locale);

  const t=await getTranslations();
  const session=await getSession();

  return (
    <html lang={locale}>
      <body>
        <a className="skip-link" href="#main">{t('nav.skip')}</a>
        <div className="site-notice">
          <span className="status-dot"/>
          {t('brand.demo')}
          <span className="notice-divider"/> {t('common.phase')}
        </div>

        <SiteHeader
          locale={locale}
          initialSession={session}
          tagline={t('brand.tagline')}
          translations={{
            about: t('nav.about'),
            how: t('nav.how'),
            tips: t('nav.tips'),
            login: t('nav.login'),
            dashboard: t('nav.dashboard'),
            logout: t('common.logout'),
            profile: t('dashboard.profile'),
            operator: t('operator.title'),
            scams: locale === 'hi' ? 'समीक्षित रिपोर्ट' : 'Reviewed reports',
            contact: t('nav.contact'),
            languageLabel: t('nav.language'),
            themeLabel: t('nav.theme'),
            skip: t('nav.skip'),
          }}
        />

        <main id="main">{children}</main>

        <footer className="site-footer">
          <div className="container footer-top">
            <div>
              <Brand locale={locale} tagline={t('brand.tagline')}/>
              <p>{t('common.footer')}</p>
            </div>
            <div className="footer-links">
              <Link href={`/${locale}/about`}>{t('nav.about')}</Link>
              <Link href={`/${locale}/scams`}>{locale==='hi'?'समीक्षित रिपोर्ट':'Reviewed reports'}</Link>
              <Link href={`/${locale}/contact`}>{t('nav.contact')}</Link>
              <Link href={`/${locale}/privacy`}>{t('common.privacy')}</Link>
              <Link href={`/${locale}/terms`}>{t('common.terms')}</Link>
              <Link href={`/${locale}/responsible-disclosure`}>{t('common.disclosure')}</Link>
            </div>
          </div>
          <div className="container footer-bottom">
            <span>© {new Date().getFullYear()} RailRaksha AI</span>
            <span><ShieldCheck size={14} aria-hidden="true"/>{t('brand.independent')}</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
