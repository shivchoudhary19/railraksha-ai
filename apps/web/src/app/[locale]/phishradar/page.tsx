import {
  canOperate,
  domainMonitorOutput,
  phishradarScanOutput,
  type DomainMonitorAlert,
  type PhishRadarScan,
} from '@railraksha/schemas';
import {apiFetch, requireSession} from '@/lib/auth';
import {AccountNav} from '@/components/account-nav';
import {PhishRadarTools} from '@/components/phishradar-tools';

export const metadata = {title: 'PhishRadar · Website Analysis', robots: {index: false, follow: false}};

export default async function Page({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  const language = locale === 'hi' ? 'hi' : 'en';
  const session = await requireSession(language);

  let scans: PhishRadarScan[] = [];
  let alerts: DomainMonitorAlert[] = [];

  try {
    const scansRes = await apiFetch('/v1/phishradar/scans', session);
    if (scansRes.ok) {
      scans = phishradarScanOutput.array().parse(await scansRes.json());
    }
  } catch {
    // Graceful fallback for initial fetch
  }

  try {
    const alertsRes = await apiFetch('/v1/phishradar/monitor', session);
    if (alertsRes.ok) {
      alerts = domainMonitorOutput.array().parse(await alertsRes.json());
    }
  } catch {
    // Graceful fallback
  }

  return (
    <section className="container dashboard-page">
      <AccountNav locale={language} session={session} />
      <header className="dashboard-heading">
        <div>
          <span className="eyebrow">RAILRAKSHA · PHISHRADAR</span>
          <h1>{language === 'hi' ? 'वेबसाइट सुरक्षा व फ़िशिंग जाँच' : 'Website Safety & PhishRadar'}</h1>
          <p>
            {language === 'hi'
              ? 'जाली टिकट पोर्टल, मिलते-जुलते डोमेन और धोखाधड़ी लिंक की स्वचालित पहचान।'
              : 'Detect fake booking portals, look-alike domains and deceptive railway links.'}
          </p>
        </div>
      </header>
      <PhishRadarTools
        locale={language}
        csrf={session.csrf}
        initialScans={scans}
        initialAlerts={alerts}
        canOperate={canOperate(session.roles)}
      />
    </section>
  );
}
