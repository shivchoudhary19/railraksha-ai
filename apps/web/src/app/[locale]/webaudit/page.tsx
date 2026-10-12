import {requireSession} from '@/lib/auth';
import {AccountNav} from '@/components/account-nav';
import {WebAuditBookingTools} from '@/components/webaudit-booking-tools';

export const metadata = {
  title: 'WebAudit · Railway Web Asset Security Audit',
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
          <span className="eyebrow">RAILRAKSHA · WEBAUDIT</span>
          <h1>
            {language === 'hi'
              ? 'वेबऑडिट · रेलवे वेब सुरक्षा व स्वच्छता मूल्यांकन'
              : 'WebAudit · Railway Web Security Audit'}
          </h1>
          <p>
            {language === 'hi'
              ? 'अधिकृत परिसंपत्ति सत्यापन, TLS व सुरक्षा हेडर विश्लेषण, और गैर-आक्रामक स्वच्छता परीक्षण।'
              : 'Authorized asset verification, passive hygiene analysis, and copy-paste hardening configurations.'}
          </p>
        </div>
      </header>
      <WebAuditBookingTools
        csrfToken={session.csrf}
        initialLocale={language}
      />
    </section>
  );
}
