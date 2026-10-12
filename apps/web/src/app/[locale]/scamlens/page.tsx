import {
  emergencyStepSchema,
  type EmergencyStep,
} from '@railraksha/schemas';
import {apiFetch, requireSession} from '@/lib/auth';
import {AccountNav} from '@/components/account-nav';
import {ScamLensTools} from '@/components/scamlens-tools';

export const metadata = {
  title: 'ScamLens · Message, SMS & Email Deception Analysis',
  robots: {index: false, follow: false},
};

export default async function Page({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  const language = locale === 'hi' ? 'hi' : 'en';
  const session = await requireSession(language);

  let emergencySteps: EmergencyStep[] = [];
  try {
    const res = await apiFetch('/v1/scamlens/emergency-checklist', session);
    if (res.ok) {
      emergencySteps = emergencyStepSchema.array().parse(await res.json());
    }
  } catch {
    // Graceful fallback
  }

  return (
    <section className="container dashboard-page">
      <AccountNav locale={language} session={session} />
      <header className="dashboard-heading">
        <div>
          <span className="eyebrow">RAILRAKSHA · SCAMLENS</span>
          <h1>
            {language === 'hi'
              ? 'संदेश व ईमेल धोखाधड़ी विश्लेषक'
              : 'Message & Email Deception Analysis'}
          </h1>
          <p>
            {language === 'hi'
              ? 'संदिग्ध SMS, WhatsApp चैट, जाली टिकट रिफंड, RRB नौकरी झांसा और स्पूफ़्ड ईमेल हेडर की त्वरित AI जाँच।'
              : 'Instant multi-vector analysis for deceptive SMS, fake IRCTC refunds, RRB job scams, and spoofed railway email headers.'}
          </p>
        </div>
      </header>
      <ScamLensTools
        locale={language}
        csrf={session.csrf}
        initialEmergencySteps={emergencySteps}
      />
    </section>
  );
}
