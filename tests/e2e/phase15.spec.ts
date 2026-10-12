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

test('Phase 15: Advanced R&D - Federated Learning (DP), Regional Voice IVR, Telecom DLT, UPI Shield, Fraud-Rings & Drift Monitoring', async ({
  page,
}) => {
  await signIn(page);

  // --- ENGLISH PAGE ---
  await page.goto('/en/advanced-rd');
  await expect(page.getByRole('heading', { level: 1, name: /Advanced R&D, Voice IVR/i })).toBeVisible();
  await checkAccessibility(page);

  // --- TAB 1: Federated Learning & DP ---
  await expect(page.getByRole('tab', { name: /Federated Learning & DP/i })).toBeVisible();
  await expect(page.getByText(/Global Model Accuracy/i)).toBeVisible();
  await expect(page.getByText(/DP Privacy Budget/i)).toBeVisible();

  // Submit on-device FedAvg gradient update
  await page.getByRole('button', { name: /Submit Weight Update \(FedAvg\)/i }).click();
  await expect(page.getByText(/WEIGHT_AGGREGATED_SECURE_FEDAVG/i)).toBeVisible();
  await expect(page.getByText(/DP Noise Added:/i)).toBeVisible();
  await checkAccessibility(page);

  // --- TAB 2: Regional Voice IVR ---
  await page.getByRole('tab', { name: /Regional Voice IVR/i }).click();
  await expect(page.getByText(/Feature-Phone Citizen IVR Simulator/i)).toBeVisible();

  // Test dialer with official 139
  await page.getByRole('button', { name: /Dial IVR & Verify Voice Prompt/i }).click();
  await expect(page.getByText(/OFFICIAL/i).first()).toBeVisible();
  await expect(page.getByText(/IVR Spoken Audio Script:/i)).toBeVisible();
  await expect(page.getByText(/Telecom SSML Markup:/i)).toBeVisible();
  await checkAccessibility(page);

  // Test scam sample via button
  await page.getByRole('button', { name: /refund\.irctc@oksbi \(Scam\)/i }).click();
  await page.getByRole('button', { name: /Dial IVR & Verify Voice Prompt/i }).click();
  await expect(page.getByText(/SCAM_ALERT/i).first()).toBeVisible();
  await expect(page.getByText(/Safety Guidance:/i)).toBeVisible();

  // --- TAB 3: Telecom DLT & UPI Shield ---
  await page.getByRole('tab', { name: /Telecom DLT & UPI Shield/i }).click();
  await expect(page.getByText(/TRAI DLT SMS Header Registry/i)).toBeVisible();
  await expect(page.getByText(/Railway UPI Merchant Shield/i)).toBeVisible();

  // Test DLT Header
  await page.getByRole('button', { name: /Verify DLT Header/i }).click();
  await expect(page.getByText(/OFFICIAL_DLT_VERIFIED/i)).toBeVisible();
  await expect(page.getByText(/Indian Railway Catering & Tourism Corp Ltd/i).first()).toBeVisible();

  // Test UPI VPA
  await page.getByRole('button', { name: /Verify UPI Handle/i }).click();
  await expect(page.getByText(/LOW_VERIFIED/i)).toBeVisible();
  await expect(page.getByText(/ALLOW_PAYMENT/i)).toBeVisible();
  await checkAccessibility(page);

  // --- TAB 4: Fraud-Ring Syndicates ---
  await page.getByRole('tab', { name: /Fraud-Ring Syndicates/i }).click();
  await expect(page.getByText(/Graph-Based Organized Fraud-Ring Syndicates/i)).toBeVisible();
  await expect(page.getByText(/Jamtara Fake Tatkal Syndicate/i)).toBeVisible();
  await expect(page.getByText(/Mewat Railway Recruitment Ring/i)).toBeVisible();
  await checkAccessibility(page);

  // --- TAB 5: Model Drift & Bug Bounty ---
  await page.getByRole('tab', { name: /Model Drift & Bug Bounty/i }).click();
  await expect(page.getByText(/AI Model Drift & Continuous Retraining Pipeline/i)).toBeVisible();
  await expect(page.getByText(/PSI Metric/i)).toBeVisible();
  await expect(page.getByText(/Responsible Disclosure & Bug Bounty Hall of Fame/i)).toBeVisible();
  await expect(page.getByText(/@shreya_sec/i)).toBeVisible();
  await checkAccessibility(page);

  // --- HINDI PAGE PARITY & A11Y ---
  await page.goto('/hi/advanced-rd');
  await expect(page.getByRole('heading', { level: 1, name: /उन्नत अनुसंधान, वॉयस आईवीआर/i })).toBeVisible();
  await expect(page.getByRole('tab', { name: /फेडरेटेड लर्निंग/i })).toBeVisible();
  await checkAccessibility(page);
});
