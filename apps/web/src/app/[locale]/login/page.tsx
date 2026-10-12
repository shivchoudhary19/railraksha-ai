import {getTranslations} from 'next-intl/server';
import {getSession} from '@/lib/auth';
import {redirect} from 'next/navigation';
import {LoginView} from '@/components/login-view';

export const metadata={title:'Sign in',robots:{index:false,follow:false}};

export default async function Login({params,searchParams}:{params:Promise<{locale:string}>;searchParams:Promise<{error?:string}>}){
  const {locale}=await params;
  const {error}=await searchParams;
  if(await getSession())redirect(`/${locale}/dashboard`);

  const t=await getTranslations('login');
  const common=await getTranslations('common');

  return (
    <LoginView
      locale={locale}
      error={error}
      translations={{
        back: common('back'),
        eyebrow: t('eyebrow'),
        title: t('title'),
        lead: t('lead'),
        continue: t('continue'),
        register: t('register'),
        account: t('account'),
        reset: t('reset'),
        security: t('security'),
        error: t('error'),
        unavailable: t('unavailable'),
        demo: t('demo'),
        google_signin: t('google_signin'),
        google_subtext: t('google_subtext'),
        google_connecting: t('google_connecting'),
        sso_divider: t('sso_divider'),
        railway_sso: t('railway_sso'),
        railway_sso_subtext: t('railway_sso_subtext'),
        demo_quick_title: t('demo_quick_title'),
        demo_citizen: t('demo_citizen'),
        demo_rpf: t('demo_rpf'),
        demo_analyst: t('demo_analyst'),
        badge_encryption: t('badge_encryption'),
        badge_certin: t('badge_certin'),
        badge_passkey: t('badge_passkey'),
      }}
    />
  );
}
