import {signIn} from '../helpers/identity';
import {test, expect, type Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const browserErrors = new WeakMap<Page, string[]>();
test.beforeEach(({page}) => {
  const errors: string[] = [];
  browserErrors.set(page, errors);
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
});
test.afterEach(({page}) => {
  expect(browserErrors.get(page)).toEqual([]);
});

async function checkAccessibility(page: Page) {
  const results = await new AxeBuilder({page})
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(results.violations.map((item) => item.id)).toEqual([]);
}

test('Phase 8: FairQueue waiting room, bot defense, simulation and operator RPF export', async ({page}) => {
  await signIn(page);
  await page.goto('/en/fairqueue');
  await expect(page.getByRole('heading', {level: 1, name: /FairQueue/i})).toBeVisible();
  await checkAccessibility(page);

  // 1. Citizen Waiting Room Journey (Human Mode)
  await page.locator('#fq-train-select').selectOption('12951');
  await page.locator('#fq-passenger-name').fill('Amitabh Bachchan');
  await page.locator('#fq-passenger-age').fill('45');
  await page.locator('#fq-sim-mode').selectOption('human');

  await page.getByRole('button', {name: /Join Tatkal Waiting Room/i}).click();

  // Verify waiting room result
  await expect(page.getByText('Entered fair queue successfully!')).toBeVisible();

  // 2. Tout Bot Detection & Appeal Journey (Bot Mode)
  await page.locator('#fq-sim-mode').selectOption('bot');
  await page.getByRole('button', {name: /Join Tatkal Waiting Room/i}).click();

  await expect(page.getByText(/CRITICAL RISK: Automated Tout Software Blocked/i)).toBeVisible();
  await expect(page.getByText(/Section 143 of the Railways Act/i).first()).toBeVisible();

  // Submit False-Positive Appeal
  const appealBtn = page.getByRole('button', {name: /Submit False-Positive Appeal/i});
  await expect(appealBtn).toBeVisible();
  await appealBtn.click();
  await expect(page.getByText(/Appeal logged/i)).toBeVisible();

  // 3. Tatkal Window Fairness Simulator (Before vs After)
  await page.getByRole('tab', {name: /Tatkal Fairness Simulator/i}).click();
  await expect(page.getByRole('heading', {name: /Tatkal Window Defense Simulator/i})).toBeVisible();
  await checkAccessibility(page);

  await page.locator('#sim-num-bots').fill('200');
  await page.locator('#sim-num-humans').fill('50');
  await page.locator('#sim-quota-seats').fill('40');

  await page.getByRole('button', {name: /Run Live Tatkal Simulation/i}).click();

  // Verify Simulator comparative results
  await expect(page.getByText(/Simulation complete!/i)).toBeVisible();
  await expect(page.getByText(/Bot Detection Rate:/i)).toBeVisible();
  await expect(page.getByText(/Traditional FIFO/i)).toBeVisible();
  await expect(page.getByText(/FairQueue \(Anti-Bot \+ 15s Lottery\)/i)).toBeVisible();
  await expect(page.getByText(/ACCEPTED: Bot detection rate >= 95%/i)).toBeVisible();

  // 4. Operator Bot Intelligence & RPF Dossier
  await page.getByRole('tab', {name: /Operator Bot Intelligence/i}).click();
  await expect(page.getByRole('heading', {name: /Operator Bot Intelligence Console/i})).toBeVisible();

  await expect(page.getByText(/Windows Monitored/i)).toBeVisible();
  await expect(page.getByText(/Blocked Tout Automation Families/i)).toBeVisible();
  await expect(page.getByText(/SuperTatkal Pro/i)).toBeVisible();
  await expect(page.getByText(/Quarantined Tout Device Clusters/i)).toBeVisible();

  // Export RPF Cyber Evidence Dossier
  await page.getByRole('button', {name: /Generate RPF Cyber Evidence Dossier/i}).click();
  await expect(page.getByText(/RPF Cyber Dossier Generated/i)).toBeVisible();
  await expect(page.getByText(/RPF-CYBER-EVIDENCE-/i).first()).toBeVisible();
  await expect(page.getByText(/Railway Protection Force/i).first()).toBeVisible();

  await checkAccessibility(page);
});
