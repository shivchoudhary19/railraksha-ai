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

test('Phase 5: citizen AppGuard app & package check flow', async ({page}) => {
  // 1. Sign in and navigate to AppGuard
  await signIn(page);
  await page.goto('/en/appguard');
  await expect(page.getByRole('heading', {name: /AppGuard · Fake Apps & Device Security/i})).toBeVisible();
  await checkAccessibility(page);

  // 2. Check an unverified fake tatkal look-alike package
  await page.locator('#app-identifier').fill('com.irctc.tatkal.fastbooking.xyz');
  await page.getByRole('button', {name: 'Verify app authenticity', exact: true}).click();

  // 3. Suspicious verdict card appears
  await expect(page.locator('.verdict')).toBeVisible();
  await expect(page.locator('.verdict-unknown')).toBeVisible();
  await expect(page.getByText(/Calculated Risk Score/i).first()).toBeVisible();
  await expect(page.getByText(/Unverified \/ Third-Party Lure/i)).toBeVisible();
  await expect(page.getByRole('heading', {name: /Suspicious Characteristics & Indicators/i})).toBeVisible();

  // 4. Check an official railway app
  await page.locator('#app-identifier').fill('cris.org.in.prs.ima');
  await page.getByRole('button', {name: 'Verify app authenticity', exact: true}).click();

  // 5. Official safe verdict appears
  await expect(page.locator('.verdict-official')).toBeVisible();
  await expect(page.getByText('Verified Official Railway App', {exact: true})).toBeVisible();

  // 6. Test Hindi translation of AppGuard
  await page.goto('/hi/appguard');
  await expect(page.getByRole('heading', {name: /जाली ऐप व डिवाइस सुरक्षा गार्ड/i})).toBeVisible();
  await checkAccessibility(page);
});

test('Phase 5: safe device checkup self-assessment flow', async ({page}) => {
  await signIn(page);
  await page.goto('/en/appguard');

  // 1. Switch to Device Checkup tab
  await page.getByRole('button', {name: /Safe Device Checkup/i}).click();
  await expect(
    page.getByRole('heading', {name: /Safe Device Checkup \(7-Point Self-Assessment\)/i})
  ).toBeVisible();

  // 2. Select high-risk answers
  await page.locator('#screen_lock').selectOption('no');
  await page.locator('#sideloading_disabled').selectOption('no');
  await page.locator('#play_protect_active').selectOption('no');

  // 3. Calculate score
  await page.getByRole('button', {name: 'Calculate Device Safety Score', exact: true}).click();

  // 4. Assert critical risk alert and remediation steps
  await expect(page.locator('.verdict-known_scam')).toBeVisible();
  await expect(page.getByText(/Critical Exposure · Immediate Action Required/i)).toBeVisible();
  await expect(page.getByRole('heading', {name: /Required Fix-It Actions/i})).toBeVisible();

  // 5. Check accessibility
  await checkAccessibility(page);
});

test('Phase 5: official apps and public station Wi-Fi guide flow', async ({page}) => {
  await signIn(page);
  await page.goto('/en/appguard');

  // 1. Switch to Guide tab
  await page.getByRole('button', {name: /Official Apps & Station Wi-Fi/i}).click();
  await expect(
    page.getByRole('heading', {name: /Verified Official Indian Railways Applications/i})
  ).toBeVisible();

  // 2. Assert official app cards
  await expect(page.getByRole('heading', {name: /IRCTC Rail Connect/i})).toBeVisible();
  await expect(page.getByRole('heading', {name: /UTS on Mobile/i})).toBeVisible();
  await expect(page.getByRole('heading', {name: /RailMadad/i})).toBeVisible();

  // 3. Assert Station Wi-Fi guide
  await expect(page.getByRole('heading', {name: /Station Wi-Fi \(RailWire\) Public Safety Guide/i})).toBeVisible();
  await expect(page.getByText(/Verify Official Captive Portal/i)).toBeVisible();
  await expect(page.getByText(/Beware of "Evil-Twin" Hotspots/i)).toBeVisible();

  // 4. Verify accessibility
  await checkAccessibility(page);
});
