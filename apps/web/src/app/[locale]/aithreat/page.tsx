import {requireSession} from '@/lib/auth';
import {AccountNav} from '@/components/account-nav';
import {AIThreatTools} from '@/components/aithreat-tools';

export const metadata = {
  title: 'AI Threat Defense · LLM Firewall & Deepfakes · RailRaksha',
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
          <span className="eyebrow">RAILRAKSHA · AI THREAT DEFENSE</span>
          <h1>
            {language === 'hi'
              ? 'एआई खतरा सुरक्षा — एलएलएम फ़ायरवॉल और डीपफेक ट्राइएज'
              : 'AI Threat Defense — LLM Firewall & Deepfake Triage'}
          </h1>
          <p>
            {language === 'hi'
              ? 'शून्य-विश्वास द्वि-दिशात्मक एलएलएम फ़ायरवॉल, बहुभाषी प्रॉम्प्ट इंजेक्शन रोकथाम, सख्त ओटीपी इनकार और सिंथेटिक वॉयस/वीडियो सत्यापन।'
              : 'Zero-trust bi-directional LLM firewall, multi-lingual prompt injection interception, strict OTP refusal, and synthetic voice/video verification.'}
          </p>
        </div>
      </header>
      <AIThreatTools
        locale={language}
        csrfToken={session.csrf}
        isOperator={session.roles.some((r) =>
          ['analyst', 'soc_lead', 'rpf_cyber', 'admin'].includes(r)
        )}
      />
    </section>
  );
}
