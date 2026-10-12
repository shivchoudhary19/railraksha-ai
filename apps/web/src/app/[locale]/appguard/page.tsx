import {
  officialAppOutput,
  type OfficialAppInfo,
} from '@railraksha/schemas';
import {apiFetch, requireSession} from '@/lib/auth';
import {AccountNav} from '@/components/account-nav';
import {AppGuardTools} from '@/components/appguard-tools';

export const metadata = {
  title: 'AppGuard · Fake Apps, Modded APKs & Device Security Checkup',
  robots: {index: false, follow: false},
};

export default async function Page({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  const language = locale === 'hi' ? 'hi' : 'en';
  const session = await requireSession(language);

  let officialApps: OfficialAppInfo[] = [];
  try {
    const res = await apiFetch('/v1/appguard/official-apps', session);
    if (res.ok) {
      officialApps = officialAppOutput.array().parse(await res.json());
    }
  } catch {
    // Graceful fallback
  }

  return (
    <section className="container dashboard-page">
      <AccountNav locale={language} session={session} />
      <header className="dashboard-heading">
        <div>
          <span className="eyebrow">RAILRAKSHA · APPGUARD</span>
          <h1>
            {language === 'hi'
              ? 'जाली ऐप व डिवाइस सुरक्षा गार्ड'
              : 'AppGuard · Fake Apps & Device Security'}
          </h1>
          <p>
            {language === 'hi'
              ? 'जाली तत्काल ऐप, संदिग्ध APK अनुमतियाँ और अपने फ़ोन की सुरक्षा सेटिंग्स की त्वरित जाँच।'
              : 'Inspect suspicious railway APKs, detect fake Tatkal apps, and run a safe device checkup.'}
          </p>
        </div>
      </header>
      <AppGuardTools
        locale={language}
        csrf={session.csrf}
        initialOfficialApps={officialApps}
      />
    </section>
  );
}
