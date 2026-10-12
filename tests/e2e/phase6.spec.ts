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

test('Phase 6: RailRaksha Shield extension view & matching simulator flow', async ({page}) => {
  await signIn(page);
  await page.goto('/en/shield');
  await expect(page.getByRole('heading', {name: /RailRaksha Shield · Real-Time Protection/i})).toBeVisible();
  await checkAccessibility(page);

  // 1. Verify Extension download link and guide
  const downloadLink = page.getByRole('link', {name: /Download Shield Extension/i});
  await expect(downloadLink).toBeVisible();
  await expect(downloadLink).toHaveAttribute('href', '/downloads/railraksha-shield.zip');
  await expect(page.getByText('Quick Installation Guide')).toBeVisible();

  // 2. Test Simulator with a known scam domain
  await page.locator('#simDomain').fill('irctc-fast-tatkal.xyz');
  await page.getByRole('button', {name: 'Simulate Shield Check', exact: true}).click();
  await expect(page.locator('.verdict')).toBeVisible();
  await expect(page.getByText(/Confirmed Threat · Red Signal Blocked/i)).toBeVisible();
  await expect(page.getByText(/Client Prefix \(4-byte\):/i)).toBeVisible();

  // 3. Test Simulator with an official domain
  await page.locator('#simDomain').fill('irctc.co.in');
  await page.getByRole('button', {name: 'Simulate Shield Check', exact: true}).click();
  await expect(page.locator('.verdict-official')).toBeVisible();
  await expect(page.getByText(/Verified Official Railway Portal · Green Signal/i)).toBeVisible();

  // 4. Test Hindi localization
  await page.goto('/hi/shield');
  await expect(page.getByRole('heading', {name: /रेल रक्षा शील्ड · वास्तविक समय सुरक्षा व एक्सटेंशन/i})).toBeVisible();
  await expect(page.getByRole('link', {name: /शील्ड एक्सटेंशन डाउनलोड करें/i})).toBeVisible();
  await checkAccessibility(page);
});

test('Phase 6: Cryptographic threat feed and Ed25519 signature inspection flow', async ({page}) => {
  await signIn(page);
  await page.goto('/en/shield');

  // Switch to Feed tab
  await page.getByRole('button', {name: /Cryptographic Threat Feed/i}).click();
  await expect(page.getByRole('heading', {name: /Live Signed Threat Feed & Delta/i})).toBeVisible();

  // Wait for feed data or click fetch
  await expect(page.getByText(/Feed Version/i)).toBeVisible();
  await expect(page.getByText(/Active Blocked Prefixes/i)).toBeVisible();
  await expect(page.getByText(/Ed25519 Public Key/i)).toBeVisible();
  await expect(page.getByText(/SHA-256 Checksum/i)).toBeVisible();
  await expect(page.getByText(/Sample Blocked Prefixes/i)).toBeVisible();
  await checkAccessibility(page);
});

test('Phase 6: Mobile PWA, Web Share Target and package asset delivery', async ({page}) => {
  await signIn(page);
  await page.goto('/en/shield');

  // Switch to PWA tab
  await page.getByRole('button', {name: /Mobile PWA & Share Target/i}).click();
  await expect(page.getByRole('heading', {name: /Mobile PWA & Web Share Target/i})).toBeVisible();
  await expect(page.getByText(/Share Target Integration/i)).toBeVisible();
  await expect(page.getByRole('link', {name: /Test Share Target Direct Route/i})).toBeVisible();
  await checkAccessibility(page);

  // Verify web manifest JSON
  const manifestRes = await page.request.get('/manifest.json');
  expect(manifestRes.status()).toBe(200);
  const manifestData = await manifestRes.json();
  expect(manifestData.name).toContain('RailRaksha');
  expect(manifestData.share_target).toBeDefined();
  expect(manifestData.share_target.action).toBe('/en/verify');

  // Verify offline service worker script
  const swRes = await page.request.get('/sw.js');
  expect(swRes.status()).toBe(200);

  // Verify extension zip download availability
  const zipRes = await page.request.get('/downloads/railraksha-shield.zip');
  expect(zipRes.status()).toBe(200);
  expect((await zipRes.body()).length).toBeGreaterThan(1000);
});

test('Phase 6: Dashboard quick navigation to Shield', async ({page}) => {
  await signIn(page);
  await page.goto('/en/dashboard');
  const shieldLink = page.getByRole('link', {name: 'RailRaksha Shield', exact: true});
  await expect(shieldLink).toBeVisible();
  await shieldLink.click();
  await expect(page).toHaveURL(/\/en\/shield/);

  // Test Hindi dashboard link
  await page.goto('/hi/dashboard');
  const shieldLinkHi = page.getByRole('link', {name: 'RailRaksha शील्ड', exact: true});
  await expect(shieldLinkHi).toBeVisible();
  await shieldLinkHi.click();
  await expect(page).toHaveURL(/\/hi\/shield/);
});
