import {requireSession} from '@/lib/auth';
import {AccountNav} from '@/components/account-nav';
import {PrivacyTools} from '@/components/privacy-tools';

export const metadata = {
  title: 'Privacy Vault & DPDP Compliance · Data Protection · RailRaksha',
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
          <span className="eyebrow">RAILRAKSHA · PRIVACY VAULT & DPDP 2023 COMPLIANCE</span>
          <h1>
            {language === 'hi'
              ? 'गोपनीयता वॉल्ट — डीपीडीपी अधिनियम 2023 अनुपालन एवं डेटा सुरक्षा'
              : 'Privacy Vault — DPDP Act 2023 Compliance & Data Protection'}
          </h1>
          <p>
            {language === 'hi'
              ? 'फ़ील्ड-स्तरीय एन्वेलप एन्क्रिप्शन (AES-256-GCM), उद्देश्य-बाध्य सहमति प्रबंधन, डेटा पोर्टेबिलिटी, और अपरिवर्तनीय ऑडिट ट्रेल।'
              : 'Field-level envelope encryption (AES-256-GCM), purpose-bound consent manager, data principal rights portal, and immutable hash-chained audit trails.'}
          </p>
        </div>
      </header>
      <PrivacyTools
        locale={language}
        csrfToken={session.csrf}
        userEmail={session.email}
        isOperator={session.roles.some((r) =>
          ['analyst', 'soc_lead', 'rpf_cyber', 'admin', 'staff'].includes(r)
        )}
      />
    </section>
  );
}
