import {requireSession} from '@/lib/auth';
import {AccountNav} from '@/components/account-nav';
import {RailSOCTools} from '@/components/railsoc-tools';

export const metadata = {
  title: 'RailSOC · Security Operations Center & OT/Signalling · RailRaksha',
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
          <span className="eyebrow">RAILRAKSHA · SECURITY OPERATIONS CENTER (RAILSOC)</span>
          <h1>
            {language === 'hi'
              ? 'रेलएसओसी — सुरक्षा संचालन केंद्र एवं ओटी/सिग्नलिंग सुरक्षा'
              : 'RailSOC — Security Operations Center & OT/Signalling Monitoring'}
          </h1>
          <p>
            {language === 'hi'
              ? 'भारतीय रेलवे के महत्वपूर्ण सिग्नलिंग, कवच यूएचएफ रेडियो और विद्युत सबस्टेशनों के लिए वास्तविक समय एसआईईएम, सिग्मा नियम और सर्ट-इन स्वचालित रिपोर्टिंग।'
              : 'Real-time SIEM, Sigma detection rules, Kavach UHF radio failsafe enforcement, and automated CERT-In 6-hour reporting for critical railway infrastructure.'}
          </p>
        </div>
      </header>
      <RailSOCTools
        locale={language}
        csrfToken={session.csrf}
        isOperator={session.roles.some((r) =>
          ['analyst', 'soc_lead', 'rpf_cyber', 'admin', 'staff'].includes(r)
        )}
      />
    </section>
  );
}
