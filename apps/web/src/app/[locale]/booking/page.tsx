import {requireSession} from '@/lib/auth';
import {AccountNav} from '@/components/account-nav';
import {WebAuditBookingTools} from '@/components/webaudit-booking-tools';

export const metadata = {
  title: 'Secure Booking Blueprint · Indian Railways Reference Architecture',
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
          <span className="eyebrow">RAILRAKSHA · SECURE BLUEPRINT</span>
          <h1>
            {language === 'hi'
              ? 'सुरक्षित रेलवे बुकिंग ब्लूप्रिंट (डेमो संदर्भ आर्किटेक्चर)'
              : 'Secure Railway Booking Blueprint (Demo)'}
          </h1>
          <p>
            {language === 'hi'
              ? 'सर्वर-प्राधिकृत किराया, Ed25519 डिजिटल रूप से हस्ताक्षरित ई-टिकट, और छेड़छाड़-रोधी QR सत्यापन।'
              : 'Server-authoritative fares, Ed25519 signed e-tickets, offline tamper-proof QR verification, and step-up refund flow.'}
          </p>
        </div>
      </header>
      <WebAuditBookingTools
        csrfToken={session.csrf}
        initialLocale={language}
        initialTab="booking"
      />
    </section>
  );
}
