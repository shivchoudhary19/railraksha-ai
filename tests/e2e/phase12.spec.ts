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

test('Phase 12: Privacy Vault & DPDP Compliance Toolkit - Data Export, Consent Receipts, DSR, Audit Chain, KMS & Scanner', async ({
  page,
}) => {
  await signIn(page);
  await page.goto('/en/privacy-vault');
  await expect(page.getByRole('heading', {level: 1, name: /Privacy Vault/i})).toBeVisible();
  await checkAccessibility(page);

  // --- TAB 1: Privacy Dashboard & Data Export ---
  await expect(page.getByRole('tab', {name: /1\. My Data & Privacy Dashboard/i})).toBeVisible();
  await expect(page.getByText(/Active Data Retention & Legal-Hold Policies/i)).toBeVisible();
  await expect(page.getByText(/RET-01/i)).toBeVisible();

  // Execute One-Click Data Export
  await page.getByRole('button', {name: /One-Click Data Export/i}).click();
  await expect(page.getByRole('heading', {name: /Personal Data Export Archive/i})).toBeVisible();
  await expect(page.getByText(/Digital Personal Data Protection Act \(DPDP\) 2023/i).first()).toBeVisible();
  await checkAccessibility(page);

  // --- TAB 2: Consent Manager & Receipts ---
  await page.getByRole('tab', {name: /2\. Consent Manager & Receipts/i}).click();
  await expect(page.getByRole('heading', {name: /Purpose-Bound Consent Management/i})).toBeVisible();
  await checkAccessibility(page);

  // Update consent preferences
  await page.getByRole('button', {name: /Save & Issue DPDP Consent Receipt/i}).click();
  await expect(page.getByRole('heading', {name: /Cryptographic Consent Receipts/i})).toBeVisible();
  await expect(page.getByText(/CNS-RCPT-/i).first()).toBeVisible();
  await checkAccessibility(page);

  // --- TAB 3: Data Principal Rights (DSR) & Audit Chain ---
  await page.getByRole('tab', {name: /3\. Data Principal Rights \(DSR\)/i}).click();
  await expect(page.getByRole('heading', {name: /Data Principal Rights & Grievance Portal/i})).toBeVisible();
  await checkAccessibility(page);

  // Register formal DSR request
  await page.getByRole('button', {name: /Register Formal DSR Request/i}).click();
  await expect(page.getByText(/DSR-2026-/i).first()).toBeVisible();
  await expect(page.getByText(/SLA Resolution Due:/i)).toBeVisible();

  // Verify Immutable Audit Chain
  await page.getByRole('button', {name: /Verify Hash Chain Integrity/i}).click();
  await expect(page.getByText(/STATUS: 100% UNTAMPERED & VERIFIED/i)).toBeVisible();
  await checkAccessibility(page);

  // --- TAB 4: Operator KMS Vault & Scanner ---
  await page.getByRole('tab', {name: /4\. Operator KMS Vault & Scanner/i}).click();
  await expect(page.getByRole('heading', {name: /Field-Level Envelope Encryption & Key Rotation/i})).toBeVisible();
  await checkAccessibility(page);

  // Encrypt PII under AES-256-GCM
  await page.getByRole('button', {name: /Encrypt & Tokenize \(AES-256-GCM\)/i}).click();
  await expect(page.getByText(/TOK-PII-/i).first()).toBeVisible();
  await expect(page.getByText(/Blind Index Hash:/i)).toBeVisible();

  // Test Decryption
  await page.getByRole('button', {name: /Test Decryption/i}).click();
  await expect(page.getByText(/Decrypted: \+91-9876543210/i)).toBeVisible();

  // Rotate Key
  await page.getByRole('button', {name: /Rotate to Key v2/i}).click();
  await expect(page.getByText(/Key rotation complete/i).first()).toBeVisible();

  // Run Database Plaintext PII Scanner
  await page.getByRole('button', {name: /Run Database Schema Audit/i}).click();
  await expect(page.getByText(/STATUS: CLEAN_COMPLIANT/i)).toBeVisible();
  await expect(page.getByText(/Plaintext Violations: 0/i)).toBeVisible();

  // Generate DPBI Statutory 6-Hour Notice
  await page.getByRole('button', {name: /Generate DPBI 6-Hour Notice/i}).click();
  await expect(page.getByText(/DPBI-BREACH-/i).first()).toBeVisible();
  await expect(page.getByText(/Statutory Window: 6 Hours \(ON TIME\)/i)).toBeVisible();
  await checkAccessibility(page);

  // --- HINDI LOCALE PARITY ---
  await page.goto('/hi/privacy-vault');
  await expect(page.getByRole('heading', {level: 1, name: /गोपनीयता वॉल्ट/i})).toBeVisible();
  await expect(page.getByRole('tab', {name: /1\. मेरा डेटा और गोपनीयता डैशबोर्ड/i})).toBeVisible();
  await expect(page.getByRole('tab', {name: /2\. सहमति प्रबंधक/i})).toBeVisible();
  await expect(page.getByRole('tab', {name: /3\. नागरिक अधिकार पोर्टल \(DSR\)/i})).toBeVisible();
  await expect(page.getByRole('tab', {name: /4\. ऑपरेटर वॉल्ट एवं पीआईआई स्कैनर/i})).toBeVisible();
  await checkAccessibility(page);
});
