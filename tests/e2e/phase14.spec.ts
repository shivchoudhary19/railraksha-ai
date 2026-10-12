import { signIn } from '../helpers/identity';
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const browserErrors = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
  const errors: string[] = [];
  browserErrors.set(page, errors);
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
});
test.afterEach(({ page }) => {
  expect(browserErrors.get(page)).toEqual([]);
});

async function checkAccessibility(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(results.violations.map((item) => item.id)).toEqual([]);
}

test('Phase 14: Public API, Partner Ecosystem, Docs & Developer Portal - Sandbox Keys, SDKs, STIX 2.1 & Status Page', async ({
  page,
}) => {
  await signIn(page);

  // --- DEVELOPER PORTAL ---
  await page.goto('/en/developers');
  await expect(page.getByRole('heading', { level: 1, name: /Developer Portal/i })).toBeVisible();
  await checkAccessibility(page);

  // --- TAB 1: Sandbox & Live API ---
  await expect(page.getByRole('button', { name: /Sandbox & Live API/i })).toBeVisible();
  await expect(page.getByText(/1-Click Sandbox API Key Generator/i)).toBeVisible();

  // Generate Sandbox Key
  await page.getByRole('button', { name: /Generate Instant Sandbox Key/i }).click();
  await expect(page.getByText(/rr_test_/i).first()).toBeVisible();
  await expect(page.getByText(/Quota: 10,000 req\/day/i)).toBeVisible();
  await checkAccessibility(page);

  // Test Live Verify API
  await page.getByRole('button', { name: /Test API Call/i }).click();
  await expect(page.getByText(/OFFICIAL — ALLOW/i)).toBeVisible();
  await expect(page.getByText(/Latency:/i)).toBeVisible();
  await checkAccessibility(page);

  // --- TAB 2: SDKs & Code Snippets ---
  await page.getByRole('button', { name: /SDKs & Code Snippets/i }).click();
  await expect(page.getByText(/Official RailRaksha SDK Libraries/i)).toBeVisible();
  await expect(page.getByText(/TypeScript \/ Node\.js SDK/i)).toBeVisible();
  await expect(page.getByText(/Python SDK/i)).toBeVisible();
  await expect(page.getByText(/Java \/ Android SDK/i)).toBeVisible();
  await checkAccessibility(page);

  // --- TAB 3: STIX 2.1 Threat Feed ---
  await page.getByRole('button', { name: /STIX 2.1 Threat Feed/i }).click();
  await expect(page.getByText(/STIX\/TAXII 2.1 Threat Intelligence Bundle/i)).toBeVisible();
  await page.getByRole('button', { name: /Fetch Live STIX 2.1 Bundle/i }).click();
  await expect(page.getByText(/STIX 2.1 JSON BUNDLE/i)).toBeVisible();
  await expect(page.getByText(/RailRaksha National Threat Intel Unit/i)).toBeVisible();
  await checkAccessibility(page);

  // --- TAB 4: Partners & White-Label ---
  await page.getByRole('button', { name: /Partners & White-Label/i }).click();
  await expect(page.getByText(/CERT-In National Threat Feed/i)).toBeVisible();
  await expect(page.getByText(/Northern Railway Vigilance Branch/i)).toBeVisible();
  await expect(page.getByText(/IIT Delhi Student Cyber Cell/i)).toBeVisible();
  await checkAccessibility(page);

  // --- TAB 5: Platform KPIs & Impact ---
  await page.getByRole('button', { name: /Platform KPIs & Impact/i }).click();
  await expect(page.getByText(/Total Verifications/i)).toBeVisible();
  await expect(page.getByText(/Fraud Loss Prevented/i)).toBeVisible();
  await expect(page.getByText(/Fake Domains Dismantled/i)).toBeVisible();
  await checkAccessibility(page);

  // --- PUBLIC STATUS PAGE ---
  await page.goto('/en/status');
  await expect(page.getByRole('heading', { level: 1, name: /Platform System Status/i })).toBeVisible();
  await expect(page.getByText(/All Systems Fully Operational/i)).toBeVisible();
  await expect(page.getByText(/Citizen Verify API/i)).toBeVisible();
  await checkAccessibility(page);

  // --- HINDI LOCALE PARITY ---
  await page.goto('/hi/developers');
  await expect(page.getByRole('heading', { level: 1, name: /डेवलपर पोर्टल/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /सैंडबॉक्स और लाइव एपीआई/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /एसडीके और कोड उदाहरण/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /STIX 2.1 थ्रेट फीड/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /पार्टनर और व्हाइट-लेबल/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /प्लेटफ़ॉर्म प्रभाव \(केपीआई\)/i })).toBeVisible();
  await checkAccessibility(page);

  await page.goto('/hi/status');
  await expect(page.getByRole('heading', { level: 1, name: /सिस्टम स्थिति एवं प्लेटफ़ॉर्म उपलब्धता/i })).toBeVisible();
  await expect(page.getByText(/सभी प्रणालियाँ पूरी तरह चालू हैं/i)).toBeVisible();
  await checkAccessibility(page);
});
