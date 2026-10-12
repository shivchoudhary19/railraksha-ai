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

test('Phase 11: Student Safe Zone - Job Scam Checker, k-Anonymity Password Breach, Cyber Academy & Certification', async ({
  page,
}) => {
  await signIn(page);
  await page.goto('/en/student');
  await expect(page.getByRole('heading', {level: 1, name: /Student Safe Zone/i})).toBeVisible();
  await checkAccessibility(page);

  // --- TAB 1: Job Scam Checker ---
  await expect(page.getByRole('tab', {name: /1\. Job & Recruitment Scam Checker/i})).toBeVisible();
  // Click Verify Job Offer on default preset (Upfront fee scam)
  await page.getByRole('button', {name: /Verify Job Offer Authenticity/i}).click();
  await expect(page.getByText(/LIKELY SCAM/i)).toBeVisible();
  await expect(page.getByText(/Identified Fraud Red Flags:/i)).toBeVisible();
  await expect(page.getByText(/Demands medical examination fee/i)).toBeVisible();
  await checkAccessibility(page);

  // Test Authentic Official CEN circular
  await page.getByRole('button', {name: /Authentic Official CEN Circular/i}).click();
  await page.getByRole('button', {name: /Verify Job Offer Authenticity/i}).click();
  await expect(page.getByText(/OFFICIAL VERIFIED/i)).toBeVisible();
  await expect(page.getByText(/Matched: rrbapply\.gov\.in/i)).toBeVisible();

  // --- TAB 2: Password Breach Check (k-Anonymity) ---
  await page.getByRole('tab', {name: /2\. Password Breach \(k-Anonymity\)/i}).click();
  await expect(page.getByRole('heading', {name: /Dark-Web Password Breach Check via k-Anonymity/i})).toBeVisible();
  await checkAccessibility(page);

  await page.getByRole('button', {name: /Check Breach Anonymously/i}).click();
  await expect(page.getByText(/COMPROMISED PASSWORD/i)).toBeVisible();
  await expect(page.getByText(/Matched Hash Suffixes/i)).toBeVisible();
  await checkAccessibility(page);

  // Test strong password preset
  await page.getByRole('button', {name: /Strong \/ Uncompromised/i}).click();
  await page.getByRole('button', {name: /Check Breach Anonymously/i}).click();
  await expect(page.getByText(/SAFE \/ NO BREACH FOUND/i)).toBeVisible();

  // --- TAB 3: Cyber Academy & Certification ---
  await page.getByRole('tab', {name: /3\. Cyber Academy & Certified Badges/i}).click();
  await expect(page.getByRole('heading', {level: 3, name: /RRB Job Recruitment & Appointment Letter Fraud Defense/i})).toBeVisible();
  await checkAccessibility(page);

  // Submit quiz with passing score
  await page.getByRole('button', {name: /Submit Quiz & Generate Certificate/i}).click();
  await expect(page.getByText(/Congratulations! You scored/i)).toBeVisible();
  await expect(page.getByText(/Certificate of Cyber Safety & Scam Defense/i)).toBeVisible();
  await expect(page.getByText(/RR-CERT-2026-/i).first()).toBeVisible();
  await checkAccessibility(page);

  // Verify certificate publicly
  await page.getByRole('button', {name: /Verify Certificate Publicly/i}).click();
  await expect(page.getByText(/AUTHENTIC/i)).toBeVisible();

  // --- TAB 4: Emergency Support & Helplines ---
  await page.getByRole('tab', {name: /4\. Emergency Support \(1930 \/ 14416\)/i}).click();
  await expect(page.getByText(/Cyber Crime Helpline 1930/i)).toBeVisible();
  await expect(page.getByText(/Tele-MANAS Helpline 14416/i)).toBeVisible();
  await expect(page.getByText(/RailMadad Helpline 139/i)).toBeVisible();
  await checkAccessibility(page);

  // --- HINDI LOCALE PARITY ---
  await page.goto('/hi/student');
  await expect(page.getByRole('heading', {level: 1, name: /छात्र सुरक्षा केंद्र/i})).toBeVisible();
  await expect(page.getByRole('tab', {name: /1\. नौकरी\/भर्ती घोटाला चेकर/i})).toBeVisible();
  await expect(page.getByRole('tab', {name: /2\. पासवर्ड ब्रीच \(k-Anonymity\)/i})).toBeVisible();
  await expect(page.getByRole('tab', {name: /3\. साइबर अकादमी एवं प्रमाण पत्र/i})).toBeVisible();
  await expect(page.getByRole('tab', {name: /4\. छात्र हेल्पलाइन \(1930 \/ 14416\)/i})).toBeVisible();
  await checkAccessibility(page);
});
