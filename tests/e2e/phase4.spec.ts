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

test('Phase 4: citizen ScamLens message analysis flow', async ({page}) => {
  // 1. Citizen signs in
  await signIn(page);
  await page.goto('/en/scamlens');
  await expect(page.getByRole('heading', {name: /Message & Email Deception Analysis/i})).toBeVisible();
  await checkAccessibility(page);

  // 2. Analyze a suspicious deceptive SMS
  const suspiciousText =
    'Dear passenger, your train ticket refund is pending. Click https://irctc-refund-fast.biz to enter UPI PIN immediately or call +919876543210.';
  await page.locator('#scam-text').fill(suspiciousText);
  await page.getByRole('button', {name: 'Analyze message', exact: true}).click();

  // 3. Verdict card appears
  await expect(page.locator('.verdict')).toBeVisible();
  await expect(page.locator('.verdict-known_scam')).toBeVisible();
  await expect(page.getByText(/Calculated Risk Score/i).first()).toBeVisible();
  await expect(page.getByRole('heading', {name: /Detected Red Flags/i})).toBeVisible();
  await expect(page.getByRole('heading', {name: /Extracted Identifiers/i})).toBeVisible();
  await expect(page.getByRole('heading', {name: /Safe Next Steps/i})).toBeVisible();

  // 4. Test Hindi translation of ScamLens
  await page.goto('/hi/scamlens');
  await expect(page.getByRole('heading', {name: /संदेश व ईमेल धोखाधड़ी विश्लेषक/i})).toBeVisible();
  await checkAccessibility(page);
});

test('Phase 4: email header deception analysis flow', async ({page}) => {
  await signIn(page);
  await page.goto('/en/scamlens');

  // 1. Switch to Email tab
  await page.getByRole('button', {name: /Email Header Check/i}).click();
  await expect(page.getByRole('heading', {name: /Email Authenticity & Header Inspection/i})).toBeVisible();

  // 2. Fill spoofed email headers
  await page.locator('#from_header').fill('IRCTC Official Support <support@spoofed-mailer.xyz>');
  await page.locator('#reply_to').fill('attacker@darkweb-server.com');
  await page.locator('#subject').fill('Immediate Action: Ticket Refund Pending');
  await page.locator('#body').fill('Dear customer, please click the link below and verify your bank account.');
  await page.locator('#spf_result').selectOption('fail');
  await page.locator('#dkim_result').selectOption('fail');
  await page.locator('#dmarc_result').selectOption('fail');

  // 3. Submit
  await page.getByRole('button', {name: /Inspect email headers/i}).click();

  // 4. Assert spoofing warnings
  await expect(page.locator('.verdict-known_scam')).toBeVisible();
  await expect(page.getByText(/Sender Display Name Spoofing Detected/i)).toBeVisible();
  await expect(page.getByText(/Reply-To Diversion Detected/i)).toBeVisible();
  await expect(page.getByRole('heading', {name: /Authentication Failures/i})).toBeVisible();
});

test('Phase 4: emergency 1930 checklist ("I already clicked / paid")', async ({page}) => {
  await signIn(page);
  await page.goto('/en/scamlens');

  // 1. Switch to Emergency checklist tab
  await page.getByRole('button', {name: /I Already Paid \/ Clicked \(1930\)/i}).click();
  await expect(
    page.getByRole('heading', {name: /Emergency "Golden Hour" Protocol \(Helpline 1930\)/i})
  ).toBeVisible();

  // 2. Verify emergency steps and actionable links
  await expect(page.getByRole('heading', {name: /Golden Hour: Call National Cybercrime Helpline 1930/i})).toBeVisible();
  await expect(page.getByRole('link', {name: /Call Helpline 1930/i})).toBeVisible();
  await expect(page.getByRole('heading', {name: /Freeze UPI & Block Debit\/Credit Cards/i})).toBeVisible();
  await expect(page.getByRole('heading', {name: /Lodge Formal Complaint on National Portal/i})).toBeVisible();
  await expect(page.getByRole('link', {name: /Open Portal/i}).first()).toBeVisible();

  // 3. Verify WCAG accessibility
  await checkAccessibility(page);
});
