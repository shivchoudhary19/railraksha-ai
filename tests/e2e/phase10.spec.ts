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

test('Phase 10: RailSOC SIEM alert feed, CERT-In dossier generation, OT equipment monitoring, and attack simulator', async ({page}) => {
  await signIn(page);
  await page.goto('/en/soc');
  await expect(page.getByRole('heading', {level: 1, name: /RailSOC/i})).toBeVisible();
  await checkAccessibility(page);

  // Verify KPI Counters
  await expect(page.getByText(/Total SIEM Alerts/i)).toBeVisible();
  await expect(page.getByText(/Critical OT Threats/i)).toBeVisible();
  await expect(page.getByText(/CERT-In Dossiers/i)).toBeVisible();
  await expect(page.getByText(/KAVACH INTERLOCK 100% HEALTHY/i)).toBeVisible();

  // --- TAB 2: OT / Signalling & Cyber-Physical Attack Simulator ---
  await page.getByRole('tab', {name: /2\. OT \/ Signalling & Attack Simulator/i}).click();
  await expect(page.getByRole('heading', {name: /Active Signalling & OT Infrastructure Nodes/i})).toBeVisible();
  await expect(page.getByText(/NDLS-EI-01/i)).toBeVisible();
  await expect(page.getByText(/KAVACH-SEC-RADIO-04/i)).toBeVisible();
  await expect(page.getByText(/WR-SCADA-PWR-02/i)).toBeVisible();
  await checkAccessibility(page);

  // Trigger Scenario A: Kavach Spoofed Radio Stop
  await page.getByRole('button', {name: /Inject Attack Vector & Verify Interlock/i}).click();
  await expect(page.getByText(/DETECTION VERDICT: SIGMA-RAIL-001/i)).toBeVisible();
  await expect(page.getByText(/KAVACH FAILSAFE ENGAGED/i)).toBeVisible();

  // Switch to Scenario B: PLC Interlocking Coil Tamper
  await page.getByLabel(/Scenario B/i).check();
  await page.getByRole('button', {name: /Inject Attack Vector & Verify Interlock/i}).click();
  await expect(page.getByText(/DETECTION VERDICT: SIGMA-RAIL-002/i)).toBeVisible();
  await expect(page.getByText(/INTERLOCKING HARDWARE LOCK ENFORCED/i)).toBeVisible();

  // Switch to Scenario C: Rogue Tap on Signalling VLAN
  await page.getByLabel(/Scenario C/i).check();
  await page.getByRole('button', {name: /Inject Attack Vector & Verify Interlock/i}).click();
  await expect(page.getByText(/DETECTION VERDICT: SIGMA-RAIL-005/i)).toBeVisible();
  await expect(page.getByText(/NETWORK ACCESS CONTROL/i)).toBeVisible();

  // --- TAB 1: SIEM Alert Feed & Escalate to Official CERT-In Incident ---
  await page.getByRole('tab', {name: /1\. SIEM Alert Stream & CERT-In/i}).click();
  await expect(page.getByText(/Sigma Rule Alerts/i)).toBeVisible();
  await checkAccessibility(page);

  // Click on the first alert button
  const alertButtons = page.locator('button:has-text("SIGMA-RAIL-")');
  await expect(alertButtons.first()).toBeVisible();
  await alertButtons.first().click();

  // Verify Triage Details & Escalate to CERT-In Incident
  const escalateBtn = page.getByRole('button', {name: /Escalate to CERT-In Incident/i});
  await expect(escalateBtn).toBeVisible();
  await escalateBtn.click();

  // Verify Generated CERT-In Dossier Card
  await expect(page.getByText(/OFFICIAL CERT-IN INCIDENT DOSSIER/i)).toBeVisible();
  await expect(page.getByText(/Mandatory Window: 6 Hours/i)).toBeVisible();
  await expect(page.getByText(/SHA-256 Chain of Custody:/i)).toBeVisible();

  // --- TAB 3: High-Throughput 5k Event Ingestion Benchmark ---
  await page.getByRole('tab', {name: /3\. 5k Ingestion Benchmark/i}).click();
  await expect(page.getByRole('heading', {name: /5,000 Synthetic Events Sigma Rules Ingestion Benchmark/i})).toBeVisible();
  await checkAccessibility(page);

  // Run benchmark
  await page.getByRole('button', {name: /Execute 5,000 Ingestion Benchmark/i}).click();
  await expect(page.getByText(/Total Events Tested/i)).toBeVisible();
  await expect(page.getByText(/Throughput \(Events\/Sec\)/i)).toBeVisible();
  await expect(page.getByText(/Avg Latency \/ Event/i)).toBeVisible();
  await expect(page.getByText(/PASSED: Processed 5000 events/i)).toBeVisible();

  // Test Hindi locale parity
  await page.goto('/hi/soc');
  await expect(page.getByRole('heading', {level: 1, name: /रेलएसओसी/i})).toBeVisible();
  await expect(page.getByText(/कवच इंटरलॉक 100% सुरक्षित/i)).toBeVisible();
  await checkAccessibility(page);
});
