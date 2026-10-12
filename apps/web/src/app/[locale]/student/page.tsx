import {requireSession} from '@/lib/auth';
import {AccountNav} from '@/components/account-nav';
import {StudentTools} from '@/components/student-tools';

export const metadata = {
  title: 'Student Safe Zone · Cyber Safety & Recruitment Scam Defense · RailRaksha',
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
          <span className="eyebrow">RAILRAKSHA · STUDENT SAFE ZONE & ACADEMY</span>
          <h1>
            {language === 'hi'
              ? 'छात्र सुरक्षा केंद्र — रेलवे भर्ती परीक्षा सुरक्षा एवं साइबर अकादमी'
              : 'Student Safe Zone — RRB Recruitment Defense & Cyber Academy'}
          </h1>
          <p>
            {language === 'hi'
              ? 'फर्जी आरआरबी/आरआरसी नियुक्ति पत्र, अपफ्रंट फीस घोटाले, पासवर्ड सुरक्षा (k-Anonymity) और प्रमाणित साइबर सुरक्षा प्रशिक्षण।'
              : 'Defend railway aspirants against fake RRB appointment scams, fee frauds, leak credentials via k-Anonymity, and earn cryptographically verified cyber literacy certificates.'}
          </p>
        </div>
      </header>
      <StudentTools
        locale={language}
        csrfToken={session.csrf}
      />
    </section>
  );
}
