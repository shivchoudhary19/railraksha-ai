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

test('Phase 13: Scale, Resilience, Mobile App & Hardening - SLOs, 50k RPS Benchmark, DR Drill, STRIDE & Expo Ecosystem', async ({
  page,
}) => {
  await signIn(page);
  await page.goto('/en/resilience');
  await expect(page.getByRole('heading', { level: 1, name: /Scale, Resilience/i })).toBeVisible();
  await checkAccessibility(page);

  // --- TAB 1: SLO & Observability ---
  await expect(page.getByText(/Target SLO/i)).toBeVisible();
  await expect(page.getByText(/99.9%/i).first()).toBeVisible();
  await expect(page.getByText(/Error Budget Remaining/i)).toBeVisible();
  await expect(page.getByText(/Verify API Latency Percentiles/i)).toBeVisible();
  await expect(page.getByText(/p50/i)).toBeVisible();

  // --- TAB 2: 50k RPS Load Benchmark ---
  await page.getByRole('button', { name: /50k RPS Load Benchmark/i }).click();
  await expect(page.getByRole('heading', { name: /50,000 RPS Cached Verify Load Benchmark/i })).toBeVisible();
  await checkAccessibility(page);

  // Trigger high-load benchmark
  await page.getByRole('button', { name: /Run 50k RPS Load Benchmark/i }).click();
  await expect(page.getByText(/CAPACITY_VERIFIED_EXCEEDS_50K_RPS/i)).toBeVisible();
  await expect(page.getByText('Throughput', { exact: true })).toBeVisible();
  await expect(page.getByText(/52,400 RPS/i)).toBeVisible();
  await checkAccessibility(page);

  // --- TAB 3: Disaster Recovery & Blue-Green ---
  await page.getByRole('button', { name: /DR Drill & Blue-Green/i }).click();
  await expect(page.getByText(/Recovery Point Objective \(RPO\)/i)).toBeVisible();
  await expect(page.getByText(/Recovery Time Objective \(RTO\)/i)).toBeVisible();
  await expect(page.getByText(/Blue-Green Deployment Cluster Status/i)).toBeVisible();
  await checkAccessibility(page);

  // Trigger automated DR drill
  await page.getByRole('button', { name: /Run Automated DR Drill/i }).click();
  await expect(page.getByText(/COMPLETED_SUCCESSFULLY/i)).toBeVisible();
  await expect(page.getByText(/Postgres Patroni Multi-AZ Promotion/i)).toBeVisible();
  await expect(page.getByText(/Zero-Downtime Blue-Green Cutover/i)).toBeVisible();
  await checkAccessibility(page);

  // --- TAB 4: STRIDE Threat Model ---
  await page.getByRole('button', { name: /STRIDE Threat Review/i }).click();
  await expect(page.getByText(/Overall Security Posture/i)).toBeVisible();
  await expect(page.getByText(/0.*Critical.*0.*High/i)).toBeVisible();
  await expect(page.getByText('Spoofing', { exact: true })).toBeVisible();
  await expect(page.getByText('Tampering', { exact: true })).toBeVisible();
  await expect(page.getByText('Information Disclosure', { exact: true })).toBeVisible();
  await checkAccessibility(page);

  // --- TAB 5: Mobile App Ecosystem ---
  await page.getByRole('button', { name: /Mobile App Ecosystem/i }).click();
  await expect(page.getByText(/RailRaksha Expo Mobile App/i)).toBeVisible();
  await expect(page.getByText(/in\.gov\.railraksha/i)).toBeVisible();
  await expect(page.getByText('Play Integrity', { exact: true })).toBeVisible();
  await expect(page.getByText(/MEETS_DEVICE_INTEGRITY/i)).toBeVisible();
  await checkAccessibility(page);

  // --- HINDI LOCALE PARITY ---
  await page.goto('/hi/resilience');
  await expect(page.getByRole('heading', { level: 1, name: /उत्पादन पैमाना, लचीलापन/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /एसएलओ और दृश्यता/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /50k आरपीएस लोड बेंचमार्क/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /आपदा पुनर्प्राप्ति और ब्लू-ग्रीन/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /स्ट्राइड सुरक्षा समीक्षा/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /एक्सपो मोबाइल इकोसिस्टम/i })).toBeVisible();
  await checkAccessibility(page);
});
