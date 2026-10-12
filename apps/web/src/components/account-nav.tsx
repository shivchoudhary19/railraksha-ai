import Link from 'next/link';
import {getTranslations} from 'next-intl/server';
import {Home,Settings,ShieldCheck} from 'lucide-react';
import {canOperate,type Session} from '@railraksha/schemas';
export async function AccountNav({locale,session}:{locale:string;session:Session}){
  const t=await getTranslations();
  return <div className="account-nav"><nav aria-label={locale==='hi'?'खाता नेविगेशन':'Account navigation'}><Link href={`/${locale}/dashboard`}><Home size={17} aria-hidden="true"/>{t('nav.dashboard')}</Link><Link href={`/${locale}/profile`}><Settings size={17} aria-hidden="true"/>{t('dashboard.profile')}</Link>{canOperate(session.roles)&&<Link href={`/${locale}/operator`}><ShieldCheck size={17} aria-hidden="true"/>{t('operator.title')}</Link>}</nav><form method="POST" action="/api/auth/logout"><input type="hidden" name="csrf" value={session.csrf}/><input type="hidden" name="locale" value={locale}/><button className="text-button">{t('common.logout')}</button></form></div>;
}
