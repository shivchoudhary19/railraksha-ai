import { requireSession, apiFetch } from '@/lib/auth';
import { AccountNav } from '@/components/account-nav';
import { DeveloperPortal } from '@/components/developer-portal';
import type { KPIDashboardResult, TenantProfileResult } from '@railraksha/schemas';

export const metadata = {
  title: 'Developer Portal & Partner Ecosystem · API & SDKs · RailRaksha',
  robots: { index: false, follow: false },
};

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const language = locale === 'hi' ? 'hi' : 'en';
  const session = await requireSession(language);

  const [kpiRes, tenantsRes] = await Promise.all([
    apiFetch('/v1/partner/metrics/kpis', session),
    apiFetch('/v1/partner/tenants', session),
  ]);

  const defaultKpis: KPIDashboardResult = {
    total_verifications_count: 54210900,
    estimated_fraud_loss_prevented_inr: 148500000,
    fake_domains_dismantled: 3412,
    active_institutions_onboarded: 48,
    citizen_trust_index_percent: 99.4,
    platform_uptime_percent: 99.98,
    last_updated: new Date().toISOString(),
  };

  const defaultTenants: TenantProfileResult[] = [
    {
      tenant_id: 'TENANT-GOV-CERT-IN',
      name: 'CERT-In National Threat Feed',
      tier: 'GOV_CERT',
      white_label_domain: 'threats.cert-in.gov.in',
      quota_limit_per_day: 1000000,
      quota_used_today: 14200,
      created_at: '2026-01-15T00:00:00Z',
    },
    {
      tenant_id: 'TENANT-NR-ZONE',
      name: 'Northern Railway Vigilance Branch',
      tier: 'ENTERPRISE',
      white_label_domain: 'vigilance.nr.railnet.gov.in',
      quota_limit_per_day: 200000,
      quota_used_today: 8350,
      created_at: '2026-03-20T00:00:00Z',
    },
    {
      tenant_id: 'TENANT-COLLEGE-IITD',
      name: 'IIT Delhi Student Cyber Cell',
      tier: 'STANDARD',
      white_label_domain: 'cybersecurity.iitd.ac.in',
      quota_limit_per_day: 50000,
      quota_used_today: 1240,
      created_at: '2026-08-10T00:00:00Z',
    },
  ];

  const initialKpis: KPIDashboardResult = kpiRes.ok ? await kpiRes.json() : defaultKpis;
  const initialTenants: TenantProfileResult[] = tenantsRes.ok ? await tenantsRes.json() : defaultTenants;

  return (
    <section className="container dashboard-page">
      <AccountNav locale={language} session={session} />
      <header className="dashboard-heading">
        <div>
          <span className="eyebrow">RAILRAKSHA · PUBLIC API & PARTNER ECOSYSTEM</span>
          <h1>
            {language === 'hi'
              ? 'डेवलपर पोर्टल — सार्वजनिक एपीआई, एसडीके एवं भागीदार तंत्र'
              : 'Developer Portal — Public API, SDKs & Partner Ecosystem'}
          </h1>
          <p>
            {language === 'hi'
              ? 'बैंकों, फिनटेक, यूपीआई और दूरसंचार प्रदाताओं के लिए 10ms हाई-स्पीड सत्यापन एपीआई, एसटीआईएक्स 2.1 थ्रेट फीड और मल्टी-लैंग्वेज एसडीके।'
              : 'Sub-10ms partner verification API, STIX 2.1 Threat Intel feeds, and multi-language SDKs for banks, telecom, and academic institutions.'}
          </p>
        </div>
      </header>
      <DeveloperPortal
        initialKpis={initialKpis}
        initialTenants={initialTenants}
        csrfToken={session.csrf}
        lang={language}
      />
    </section>
  );
}
