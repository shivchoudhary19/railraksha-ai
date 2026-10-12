import {canOperate, takedownCaseOutput, type TakedownCase} from '@railraksha/schemas';
import {apiFetch, requireSession} from '@/lib/auth';
import {AccountNav} from '@/components/account-nav';
import {TakedownTools} from '@/components/takedown-tools';
import Link from 'next/link';

export const metadata = {title: 'Takedown Workspace', robots: {index: false, follow: false}};

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{locale: string}>;
  searchParams: Promise<{domain?: string; scan_id?: string}>;
}) {
  const {locale} = await params;
  const {domain, scan_id} = await searchParams;
  const language = locale === 'hi' ? 'hi' : 'en';
  const session = await requireSession(language);

  if (!canOperate(session.roles)) {
    return (
      <section className="container dashboard-page">
        <h1>{language === 'hi' ? 'अनुमति आवश्यक है' : 'Permission required'}</h1>
        <p>
          {language === 'hi'
            ? 'यह पृष्ठ केवल अधिकृत सुरक्षा विश्लेषकों व ऑपरेटरों के लिए है।'
            : 'This workspace is restricted to authorized cybersecurity analysts and operators.'}
        </p>
        <Link href={`/${language}/dashboard`} className="button">
          {language === 'hi' ? 'मेरे खाते पर लौटें' : 'Return to my account'}
        </Link>
      </section>
    );
  }

  let cases: TakedownCase[] = [];
  try {
    const res = await apiFetch('/v1/takedowns', session);
    if (res.ok) {
      cases = takedownCaseOutput.array().parse(await res.json());
    }
  } catch {
    // Graceful fallback
  }

  return (
    <section className="container dashboard-page">
      <AccountNav locale={language} session={session} />
      <header className="dashboard-heading">
        <div>
          <span className="eyebrow">RAILRAKSHA · OPERATOR WORKSPACE</span>
          <h1>{language === 'hi' ? 'डोमेन टेकडाउन व कानूनी कार्रवाई' : 'Domain Takedown & Incident Defense'}</h1>
          <p>
            {language === 'hi'
              ? 'CERT-In, डोमेन रजिस्ट्रार और होस्टिंग प्रदाताओं को औपचारिक टेकडाउन नोटिस जारी करें।'
              : 'Prepare and track formal takedown dossiers for registrars, hosting desks and CERT-In.'}
          </p>
        </div>
      </header>
      <TakedownTools
        locale={language}
        csrf={session.csrf}
        initialCases={cases}
        defaultDomain={domain ?? ''}
        defaultScanId={scan_id ?? ''}
      />
    </section>
  );
}
