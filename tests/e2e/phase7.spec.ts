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

test('Phase 7: WebAudit asset verification, security scan and remediation snippets flow', async ({page}) => {
  await signIn(page);
  await page.goto('/en/webaudit');
  await expect(page.getByRole('heading', {name: /WebAudit · Railway Web Security Audit/i})).toBeVisible();
  await checkAccessibility(page);

  // 1. Test Domain Ownership Challenge Flow
  const testDomain = `audit-test-${Date.now()}.local`;
  await page.locator('#audit-domain').fill(testDomain);
  await page.getByRole('button', {name: 'Generate Ownership Challenge', exact: true}).click();
  await expect(page.locator('code').filter({hasText: 'railraksha-verify='})).toBeVisible();
  await expect(page.getByText(/Pending Verification/i)).toBeVisible();

  // Verify ownership
  await page.getByRole('button', {name: 'Verify Ownership Now', exact: true}).click();
  await expect(page.locator('strong').filter({hasText: /Domain Ownership Verified/i})).toBeVisible();

  // 2. Test Benchmark Clean Scan (localhost)
  await page.getByRole('button', {name: /Load Benchmark Clean/i}).click();
  await page.getByRole('button', {name: 'Run Security Audit', exact: true}).click();

  // Verify results view
  await expect(page.getByText(/Security Grade:/i)).toBeVisible();
  await expect(page.getByText(/Overall Score/i)).toBeVisible();
  await expect(page.getByText(/Security Header Findings/i)).toBeVisible();
  await expect(page.getByRole('table')).toBeVisible();

  // Test Remediation snippet tab switching
  await page.getByRole('button', {name: 'Apache HTTPD', exact: true}).click();
  await page.getByRole('button', {name: 'Cloudflare Transform Rules', exact: true}).click();
  await page.getByRole('button', {name: 'NGINX', exact: true}).click();
  await checkAccessibility(page);

  // 3. Test Vulnerable Target (demo-vuln.local)
  await page.getByRole('button', {name: /Load Vulnerable Target/i}).click();
  await page.getByRole('button', {name: 'Run Security Audit', exact: true}).click();
  await expect(page.getByText(/demo-vuln.local/i)).toBeVisible();

  // 4. Test Hindi localization
  await page.goto('/hi/webaudit');
  await expect(page.getByRole('heading', {name: /वेबऑडिट · रेलवे वेब सुरक्षा व स्वच्छता मूल्यांकन/i})).toBeVisible();
  await expect(page.getByText(/स्वामित्व चुनौती कोड प्राप्त करें/i)).toBeVisible();
  await checkAccessibility(page);
});

test('Phase 7: Secure Booking Blueprint full journey (Search, Authoritative Book, Cancel & Refund)', async ({page}) => {
  await signIn(page);
  await page.goto('/en/booking');
  await expect(page.getByRole('heading', {name: /Secure Railway Booking Blueprint/i})).toBeVisible();
  await expect(page.getByRole('heading', {name: /Secure Railway Booking Reference Architecture/i})).toBeVisible();
  await checkAccessibility(page);

  // 1. Search Trains (NDLS to MMCT)
  await page.locator('#from-station').selectOption('NDLS');
  await page.locator('#to-station').selectOption('MMCT');
  await page.getByRole('button', {name: 'Find Trains', exact: true}).click();

  await expect(page.getByRole('heading', {name: /Mumbai Rajdhani Express \(12951\)/i})).toBeVisible();
  await expect(page.getByText(/Seats Available/i).first()).toBeVisible();

  // 2. Book Seat
  await page.locator('#passenger-name').fill('Ramesh Sharma');
  await page.locator('#passenger-age').fill('42');
  await page.locator('#passenger-gender').selectOption('M');
  await page.getByRole('button', {name: /Confirm & Issue E-Ticket/i}).click();

  // 3. Verify Issued E-Ticket
  await expect(page.getByText(/Official E-Ticket Confirmed/i)).toBeVisible();
  await expect(page.getByText(/PNR:/i)).toBeVisible();
  await expect(page.getByText(/Ramesh Sharma \(42 yrs, M\)/i)).toBeVisible();
  await expect(page.getByText(/Digital Signature \(Ed25519 SHA256\):/i)).toBeVisible();
  await checkAccessibility(page);

  // 4. Cancel Ticket with Step-Up Refund
  await page.getByRole('button', {name: /Step-Up Cancel Ticket/i}).click();
  await expect(page.getByText(/Ticket Cancelled & Refunded/i)).toBeVisible();
  await expect(page.getByText(/Clerkage Deducted: ₹120/i)).toBeVisible();
  await expect(page.getByText(/Refund Credited: ₹/i)).toBeVisible();
});

test('Phase 7: Offline QR ticket verifier & RailMadad grievance filing', async ({page}) => {
  await signIn(page);
  await page.goto('/en/booking');

  // Switch to Verifier & Grievance tab
  await page.getByRole('tab', {name: /QR Verifier & RailMadad/i}).click();
  await expect(page.getByRole('heading', {name: /Offline E-Ticket QR Verifier/i})).toBeVisible();
  await expect(page.getByRole('heading', {name: /RailMadad Digital Grievance/i})).toBeVisible();
  await checkAccessibility(page);

  // 1. Issue a real signed ticket first by searching & booking
  await page.getByRole('tab', {name: /Secure Booking \(Demo\)/i}).click();
  await page.getByRole('button', {name: 'Find Trains', exact: true}).click();
  await page.getByRole('button', {name: /Confirm & Issue E-Ticket/i}).click();
  await expect(page.getByText(/Official E-Ticket Confirmed/i)).toBeVisible();

  // Switch back to verifier
  await page.getByRole('tab', {name: /QR Verifier & RailMadad/i}).click();

  // The QR payload is automatically synced into the verifier textarea!
  await page.getByRole('button', {name: 'Verify Cryptographic Signature', exact: true}).click();
  await expect(page.getByText(/AUTHENTIC · Official Indian Railways E-Ticket/i)).toBeVisible();
  await expect(page.locator('.verdict-official')).toBeVisible();

  // 2. Test Forgery / Tampering Detection
  await page.locator('#qr-payload').fill('PNR=9999999999&TRAIN=99999&DATE=2026-10-15&PASSENGER=Fraudster&FARE=0&SIG=deadbeefcafebabe');
  await page.getByRole('button', {name: 'Verify Cryptographic Signature', exact: true}).click();
  await expect(page.getByText(/COUNTERFEIT \/ TAMPERED · Signature Verification Failed/i)).toBeVisible();
  await expect(page.locator('.verdict-known_scam')).toBeVisible();

  // 3. File RailMadad Grievance
  await page.locator('#grievance-pnr').fill('1234567890');
  await page.locator('#grievance-cat').selectOption('security');
  await page.locator('#grievance-desc').fill('Suspicious individual attempting unauthorized coach entry near coach B3.');
  await page.getByRole('button', {name: 'Register RailMadad Grievance', exact: true}).click();

  await expect(page.getByText(/Grievance Registered/i)).toBeVisible();
  await expect(page.getByText(/RM-2026-/i)).toBeVisible();
  await checkAccessibility(page);

  // 4. Test Hindi localization
  await page.goto('/hi/booking');
  await expect(page.getByRole('heading', {name: /सुरक्षित रेलवे बुकिंग ब्लूप्रिंट/i})).toBeVisible();
  await checkAccessibility(page);
});
