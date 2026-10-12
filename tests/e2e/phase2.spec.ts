import {demoPassword,signIn,credentialsSignIn,createUser,totp} from '../helpers/identity';
import {test,expect,type Page} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import AxeBuilder from '@axe-core/playwright';

const browserErrors=new WeakMap<Page,string[]>();
test.beforeEach(({page})=>{
  const errors:string[]=[];
  browserErrors.set(page,errors);
  page.on('pageerror',error=>errors.push(error.name));
  page.on('console',message=>{
    if(message.type()==='error')errors.push(message.text());
  });
});
test.afterEach(({page})=>{
  expect(browserErrors.get(page)).toEqual([]);
});

async function checkAccessibility(page:Page){
  const results=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
  expect(results.violations.map(item=>item.id)).toEqual([]);
}

test('Phase 2: public scams page loads and passes accessibility',async({page})=>{
  await page.goto('/en/scams');
  await expect(page.getByRole('heading',{name:/Reviewed scam reports/i})).toBeVisible();
  await checkAccessibility(page);

  await page.goto('/hi/scams');
  await expect(page.getByRole('heading',{name:/समीक्षित धोखाधड़ी रिपोर्ट/i})).toBeVisible();
  await checkAccessibility(page);
});

test('Phase 2: citizen end-to-end report and analyst moderation flow',async({page,request})=>{
  test.setTimeout(90000);
  const fakeUrl=`https://fake-irctc-booking-${randomBytes(4).toString('hex')}.example.test/tatkal`;

  // 1. Citizen signs in and verifies an unknown URL
  await signIn(page);
  await page.goto('/en/verify');
  await expect(page.getByRole('heading',{name:/Check before you trust/i})).toBeVisible();
  await checkAccessibility(page);

  await page.locator('#value').fill(fakeUrl);
  await page.getByRole('button',{name:/Check identifier/i}).click();
  await expect(page.locator('.verdict')).toBeVisible();
  await expect(page.locator('.verdict-unknown')).toBeVisible();

  // 2. Citizen accesses reports page and submits a scam report
  await page.goto('/en/reports');
  await expect(page.getByRole('heading',{name:/Report\. Track\. Stay informed/i})).toBeVisible();
  await checkAccessibility(page);

  await page.locator('#value').fill(fakeUrl);
  await page.locator('#description').fill('This site claims to book tatkal tickets and demands UPI payment upfront. Fraud alert.');
  await page.locator('input[name="consent"]').check();
  await page.getByRole('button',{name:/Submit report/i}).click();

  await expect(page.getByText(/Saved successfully/i)).toBeVisible();
  await expect(page.locator('.record-list').getByText(fakeUrl)).toBeVisible();

  // Citizen cannot access moderation workspace
  await page.goto('/en/moderation');
  await expect(page.getByRole('heading',{name:/Permission required/i})).toBeVisible();

  // Sign out citizen
  await page.goto('/en/dashboard');
  await page.getByRole('button',{name:/Sign out/i}).click();
  await expect(page).toHaveURL(/\/en$/);

  // 3. Create analyst with TOTP, complete enrolment, and sign in fresh with OTP
  const analyst=await createUser(request,'analyst',['CONFIGURE_TOTP']);
  try {
    await credentialsSignIn(page,analyst.email,analyst.password);
    await page.locator('#mode-manual').click();
    const secret=await page.locator('#kc-totp-secret-key').textContent();
    if(!secret)throw new Error('TOTP secret key missing');
    const enrolledStep=Math.floor(Date.now()/30000);
    await page.locator('#totp').fill(totp(secret));
    await page.locator('#userLabel').fill('DEMO analyst authenticator');
    await page.locator('#saveTOTPBtn').click();
    await expect(page).toHaveURL(/\/en\/dashboard/);

    // Sign out to initiate fresh login with OTP
    await page.getByRole('button',{name:/Sign out/i}).click();
    await expect(page).toHaveURL(/\/en$/);

    // Sign in with OTP for fresh amr=["otp"] token
    await credentialsSignIn(page,analyst.email,analyst.password);
    await expect(page.locator('#otp')).toBeVisible();
    await expect.poll(()=>Math.floor(Date.now()/30000),{timeout:35000}).not.toBe(enrolledStep);
    await page.locator('#otp').fill(totp(secret));
    await page.getByRole('button',{name:/Sign In/i}).click();
    await expect(page).toHaveURL(/\/en\/dashboard/);

    // Analyst goes to moderation
    await page.goto('/en/moderation');
    await expect(page.getByRole('heading',{name:/Review with care/i})).toBeVisible();
    await checkAccessibility(page);

    const reportCard=page.locator('.record-list article').filter({hasText:fakeUrl});
    await expect(reportCard).toBeVisible();
    await reportCard.locator('textarea[name="note"]').fill('Confirmed phishing tatkal site. Approved for blocklist.');
    await reportCard.getByRole('button',{name:/Approve scam report/i}).click();
    await expect(page.getByText(/Saved successfully/i)).toBeVisible();

    // Sign out analyst
    await page.goto('/en/dashboard');
    await page.getByRole('button',{name:/Sign out/i}).click();
    await expect(page).toHaveURL(/\/en$/);

    // 4. Citizen signs back in and checks Verify: now it must be "known_scam"
    await signIn(page);
    await page.goto('/en/verify');
    await page.locator('#value').fill(fakeUrl);
    await page.getByRole('button',{name:/Check identifier/i}).click();
    await expect(page.locator('.verdict-known_scam')).toBeVisible();

    // 5. Check public scams feed has no PII
    await page.goto('/en/scams');
    await expect(page.locator('.record-list')).toBeVisible();
    await expect(page.getByText('This site claims to book tatkal tickets')).not.toBeVisible();
  } finally {
    await analyst.dispose();
  }
});
