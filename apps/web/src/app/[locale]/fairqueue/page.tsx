import {requireSession} from '@/lib/auth';
import {AccountNav} from '@/components/account-nav';
import {FairQueueTools} from '@/components/fairqueue-tools';

export const metadata = {
  title: 'FairQueue · Anti-Bot & Tatkal Fairness Engine · RailRaksha',
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
          <span className="eyebrow">RAILRAKSHA · ANTI-BOT FAIRNESS</span>
          <h1>
            {language === 'hi'
              ? 'फ़ेयरकतार (FairQueue) — एंटी-बॉट और तत्काल निष्पक्षता इंजन'
              : 'FairQueue — Anti-Bot & Tatkal Fairness Engine'}
          </h1>
          <p>
            {language === 'hi'
              ? 'दलालों और ऑटोमेशन बॉट को रोकने के लिए क्रिप्टोग्राफ़िक पहेलियां, व्यवहार विश्लेषण और यादृच्छिक 15-सेकंड लॉटरी।'
              : 'Defeating tout software syndicates with behavioral entropy detection, micro-proof-of-work puzzles, and randomized fair-entry lottery.'}
          </p>
        </div>
      </header>
      <FairQueueTools
        locale={language}
        csrfToken={session.csrf}
        isOperator={session.roles.some((r) => ['analyst', 'soc_lead', 'rpf_cyber', 'admin'].includes(r))}
      />
    </section>
  );
}
