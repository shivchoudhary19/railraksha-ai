import {requireSession} from '@/lib/auth';
import {AccountNav} from '@/components/account-nav';
import {ShieldTools} from '@/components/shield-tools';

export const metadata = {
  title: 'RailRaksha Shield · Real-Time Threat Protection & Browser Extension',
  robots: {index: false, follow: false},
};

export default async function Page({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  const language = locale === 'hi' ? 'hi' : 'en';
  const session = await requireSession(language);

  return (
    <section className="container dashboard-page">
      <AccountNav locale={language} session={session} />
      <header className="dashboard-heading">
        <div>
          <span className="eyebrow">RAILRAKSHA · SHIELD</span>
          <h1>
            {language === 'hi'
              ? 'रेल रक्षा शील्ड · वास्तविक समय सुरक्षा व एक्सटेंशन'
              : 'RailRaksha Shield · Real-Time Protection'}
          </h1>
          <p>
            {language === 'hi'
              ? 'क्रिप्टोग्राफ़िक रूप से हस्ताक्षरित थ्रेट फ़ीड, ब्राउज़र एक्सटेंशन और मोबाइल PWA द्वारा जाली तत्काल वेबसाइटों से सुरक्षा।'
              : 'Privacy-preserving real-time threat defense with Ed25519-signed feeds, browser extension, and mobile PWA.'}
          </p>
        </div>
      </header>
      <ShieldTools
        csrfToken={session.csrf}
        initialLocale={language}
      />
    </section>
  );
}
