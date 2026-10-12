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

test('Phase 9: AI Threat Defense LLM firewall, safe chatbot, deepfake triage, and red-team lab', async ({page}) => {
  await signIn(page);
  await page.goto('/en/aithreat');
  await expect(page.getByRole('heading', {level: 1, name: /AI Threat Defense/i})).toBeVisible();
  await checkAccessibility(page);

  // --- 1. Tab 1: Safe Railway Assistant & LLM Firewall ---
  // (a) Test official knowledge FAQ preset
  await page.getByRole('button', {name: /Tatkal Timings & Quota Rules/i}).click();
  await expect(page.getByText(/10:00 AM/i).first()).toBeVisible();
  await expect(page.getByText(/Official Source Citation/i).first()).toBeVisible();

  // (b) Test strict OTP Refusal Guardrail
  await page.getByRole('button', {name: /Attack: Soliciting OTP Verification/i}).click();
  await expect(page.getByText(/Strict Zero-Trust Guardrail Refusal/i).first()).toBeVisible();
  await expect(page.getByText(/Helpline 1930/i).first()).toBeVisible();

  // (c) Test Adversarial Prompt Injection Block
  await page.getByRole('button', {name: /Attack: DAN Jailbreak Instruction Override/i}).click();
  await expect(page.getByText(/RailRaksha AI Firewall: BLOCKED/i).first()).toBeVisible();

  // (d) Test PII Sanitization
  await page.getByRole('button', {name: /Test: Prompt with Aadhaar & PAN Redaction/i}).click();
  await expect(page.getByText(/Sanitized PII:/i).first()).toBeVisible();
  await expect(page.getByText('aadhaar').first()).toBeVisible();

  // --- 2. Tab 2: Deepfake & Voice-Clone Triage ---
  await page.getByRole('tab', {name: /Deepfake & Voice-Clone Triage/i}).click();
  await expect(page.getByRole('heading', {name: /Synthetic Media Digital Forensics/i})).toBeVisible();
  await checkAccessibility(page);

  // (a) Analyze Synthetic Voice Clone
  await page.getByRole('button', {name: /Urgent Arrest Distress Call/i}).click();
  await page.getByRole('button', {name: /Analyze Media Authenticity/i}).click();
  await expect(page.getByText(/HIGH DEEPFAKE/i)).toBeVisible();
  await expect(page.getByText(/Helpline 139 \/ 1930/i).first()).toBeVisible();

  // (b) Analyze Authentic CCTV Capture
  await page.getByRole('button', {name: /Authentic Station Camera Capture/i}).click();
  await page.getByRole('button', {name: /Analyze Media Authenticity/i}).click();
  await expect(page.getByText(/LOW SYNTHETIC/i)).toBeVisible();

  // --- 3. Tab 3: AI Red-Team Lab & Malicious AI Intel ---
  await page.getByRole('tab', {name: /AI Red-Team Lab & Malicious AI Intel/i}).click();
  await expect(page.getByRole('heading', {name: /Automated Adversarial AI Red-Team Suite/i})).toBeVisible();
  await checkAccessibility(page);

  // Execute Red-Team Benchmark
  await page.getByRole('button', {name: /Execute Automated 350\+ Prompt Red-Team Benchmark/i}).click();
  await expect(page.getByText(/VERDICT: ACCEPTED/i)).toBeVisible();
  await expect(page.getByText(/100%/i).first()).toBeVisible();

  // Verify Malicious Threat Intel cards
  await expect(page.getByText('FraudGPT / WormGPT')).toBeVisible();
  await expect(page.getByText(/VoiceClone V2/i)).toBeVisible();

  // --- 4. Hindi Parity Check ---
  await page.goto('/hi/aithreat');
  await expect(page.getByRole('heading', {level: 1, name: /एआई खतरा सुरक्षा/i})).toBeVisible();
  await expect(page.getByRole('tab', {name: /सुरक्षित रेलवे सहायक/i})).toBeVisible();
  await checkAccessibility(page);
});
