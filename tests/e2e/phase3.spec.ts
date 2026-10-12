import {demoPassword,signIn,credentialsSignIn,createUser,totp} from '../helpers/identity';
import {test,expect,type Page} from '@playwright/test';
import {randomBytes} from 'node:crypto';
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

test('Phase 3: citizen PhishRadar website analysis flow', async ({page}) => {
  // 1. Citizen signs in
  await signIn(page);
  await page.goto('/en/phishradar');
  await expect(page.getByRole('heading', {name: /Website Safety & PhishRadar/i})).toBeVisible();
  await checkAccessibility(page);

  // 2. Scan a lookalike railway booking link
  const suspiciousUrl = `https://irctc-tatkal-fast-${randomBytes(3).toString('hex')}.xyz/booking?refund=instant`;
  await page.locator('#scan-url').fill(suspiciousUrl);
  await page.getByRole('button', {name: /Analyze website/i}).click();

  // 3. Verdict card appears
  await expect(page.locator('.verdict')).toBeVisible();
  await expect(page.locator('.verdict-known_scam')).toBeVisible(); // 'dangerous' maps to verdict-known_scam border
  await expect(page.getByText(/Calculated Risk Score/i).first()).toBeVisible();
  await expect(page.getByRole('heading', {name: /Why we flagged this/i})).toBeVisible();
  await expect(page.getByRole('heading', {name: /Recommended actions/i})).toBeVisible();

  // 4. Test Hindi translation of PhishRadar
  await page.goto('/hi/phishradar');
  await expect(page.getByRole('heading', {name: /वेबसाइट सुरक्षा व फ़िशिंग जाँच/i})).toBeVisible();
  await checkAccessibility(page);

  // 5. Citizen cannot access operator takedown workspace
  await page.goto('/en/takedowns');
  await expect(page.getByRole('heading', {name: /Permission required/i})).toBeVisible();
});

test('Phase 3: operator CT-log monitor simulation and takedown case flow', async ({
  page,
  request,
}) => {
  test.setTimeout(90000);
  const analyst = await createUser(request, 'analyst', ['CONFIGURE_TOTP']);
  try {
    // Enroll TOTP
    await credentialsSignIn(page, analyst.email, analyst.password);
    await page.locator('#mode-manual').click();
    const secret = await page.locator('#kc-totp-secret-key').textContent();
    if (!secret) throw new Error('TOTP secret key missing');
    const enrolledStep = Math.floor(Date.now() / 30000);
    await page.locator('#totp').fill(totp(secret));
    await page.locator('#userLabel').fill('DEMO analyst authenticator');
    await page.locator('#saveTOTPBtn').click();
    await expect(page).toHaveURL(/\/en\/dashboard/);

    // Sign out & sign back in for fresh token with amr=["otp"]
    await page.getByRole('button', {name: /Sign out/i}).click();
    await expect(page).toHaveURL(/\/en$/);
    await credentialsSignIn(page, analyst.email, analyst.password);
    await expect(page.locator('#otp')).toBeVisible();
    await expect.poll(() => Math.floor(Date.now() / 30000), {timeout: 35000}).not.toBe(enrolledStep);
    await page.locator('#otp').fill(totp(secret));
    await page.getByRole('button', {name: /Sign In/i}).click();
    await expect(page).toHaveURL(/\/en\/dashboard/);

    // Navigate to PhishRadar monitor tab
    await page.goto('/en/phishradar');
    await page.getByRole('button', {name: /Proactive Domain Monitor/i}).click();
    await expect(page.getByRole('button', {name: /Simulate CT-log discovery/i})).toBeVisible();
    await checkAccessibility(page);

    // Trigger simulation
    await page.getByRole('button', {name: /Simulate CT-log discovery/i}).click();
    await expect(page.getByText(/Action completed successfully/i)).toBeVisible();
    await expect(page.locator('.record-list article').first()).toBeVisible();

    // Access operator takedowns workspace
    await page.goto('/en/takedowns');
    await expect(page.getByRole('heading', {name: /Domain Takedown & Incident Defense/i})).toBeVisible();
    await checkAccessibility(page);

    // Create a new takedown case
    const testDomain = `fake-tatkal-${randomBytes(3).toString('hex')}.example.test`;
    await page.locator('#takedown-domain').fill(testDomain);
    await page.locator('#takedown-registrar').fill('DEMO Registrar Inc');
    await page.locator('#takedown-evidence').fill('Automated CT-log detection flagged brand impersonation.');
    await page.getByRole('button', {name: /Create takedown case/i}).click();

    await expect(page.getByText(/Takedown case updated successfully/i)).toBeVisible();
    const caseCard = page.locator('.record-list article').filter({hasText: testDomain});
    await expect(caseCard).toBeVisible();
    await expect(caseCard.locator('.case-status')).toHaveText('DRAFT');

    // Update status to reported
    await caseCard.getByRole('button', {name: /Reported to abuse desk/i}).click();
    await expect(page.getByText(/Takedown case updated successfully/i)).toBeVisible();
    await expect(caseCard.locator('.case-status')).toHaveText('REPORTED');
  } finally {
    await analyst.dispose();
  }
});
