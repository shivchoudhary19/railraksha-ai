import {test,expect,type Page} from '@playwright/test';
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

test('UI Pro Max: login page renders Google auth, railway SSO, security indicators and passes accessibility',async({page})=>{
  // 1. English Login View
  await page.goto('/en/login');
  await expect(page.locator('.google-btn')).toBeVisible();
  await expect(page.getByRole('button',{name:/Continue with Google/i})).toBeVisible();
  await expect(page.locator('.pro-sso-btn')).toBeVisible();
  await expect(page.locator('.defense-beacon')).toBeVisible();
  await expect(page.locator('.demo-persona-panel')).toBeVisible();
  await checkAccessibility(page);

  // 2. Hindi Login View
  await page.goto('/hi/login');
  await expect(page.locator('.google-btn')).toBeVisible();
  await expect(page.getByRole('button',{name:/Google के साथ साइन इन करें/i})).toBeVisible();
  await expect(page.locator('.pro-sso-btn')).toBeVisible();
  await checkAccessibility(page);
});

test('Firebase Google Authentication: Citizen signs in, accesses dashboard, and signs out cleanly',async({page,context})=>{
  await page.goto('/en/login');

  // Click Google Sign-in button
  await page.locator('.google-btn').click();

  // Should navigate to dashboard
  await expect(page).toHaveURL(/\/en\/dashboard$/);
  await expect(page.getByText('Rahul Sharma (Google Verified)')).toBeVisible();
  await checkAccessibility(page);

  // Check secure cookies
  const cookies=await context.cookies();
  const sessionCookie=cookies.find(c=>c.name==='railraksha_session');
  const tokenCookie=cookies.find(c=>c.name==='railraksha_session_token');
  expect(sessionCookie?.httpOnly).toBe(true);
  expect(sessionCookie?.sameSite).toBe('Lax');
  expect(tokenCookie?.httpOnly).toBe(true);

  // Citizen cannot access operator workspace
  await page.goto('/en/operator');
  await expect(page.getByRole('heading',{name:'This workspace needs permission.'})).toBeVisible();

  // Sign out cleanly
  await page.goto('/en/dashboard');
  await page.locator('.account-nav').getByRole('button',{name:'Sign out'}).click();
  await expect(page).toHaveURL(/\/en$/);

  // Cookies cleared
  const afterCookies=await context.cookies();
  expect(afterCookies.some(c=>c.name==='railraksha_session')).toBe(false);
  expect(afterCookies.some(c=>c.name==='railraksha_session_token')).toBe(false);

  // Protected route redirects to login
  await page.goto('/en/dashboard');
  await expect(page).toHaveURL(/\/en\/login$/);
});

test('Firebase Google Authentication: RPF Cyber Lead quick-access persona allows operator workspace entry',async({page})=>{
  await page.goto('/en/login');

  // Click RPF Cyber Officer persona chip
  await page.getByRole('button',{name:/RPF Cyber Officer/i}).click();

  await expect(page).toHaveURL(/\/en\/dashboard$/);
  await expect(page.getByText('Inspector Vikram Singh (RPF Cyber Defense)')).toBeVisible();

  // RPF persona can access operator workspace
  await page.goto('/en/operator');
  await expect(page.getByRole('heading',{name:'Operator workspace'})).toBeVisible();
  await checkAccessibility(page);

  // Sign out cleanly
  await page.locator('.account-nav').getByRole('button',{name:'Sign out'}).click();
  await expect(page).toHaveURL(/\/en$/);
});

test('Mobile Authentication: Sign in on mobile, header reflects user state, mobile drawer shows profile and signs out',async({page})=>{
  // Emulate mobile viewport (iPhone SE / 375px)
  await page.setViewportSize({width:375,height:812});

  await page.goto('/en/login');
  await expect(page.locator('.google-btn')).toBeVisible();

  // Sign in with Google on mobile
  await page.locator('.google-btn').click();
  await expect(page).toHaveURL(/\/en\/dashboard$/);

  // Header MUST show user identity / "My account", NOT "Sign in"
  await expect(page.locator('.site-header .user-account-button')).toBeVisible();
  await expect(page.locator('.site-header').getByText(/Rahul/i)).toBeVisible();
  await expect(page.locator('.site-header').getByRole('link',{name:/Sign in/i})).not.toBeVisible();

  // Open mobile drawer
  await page.locator('.mobile-menu-toggle').click();
  await expect(page.locator('.mobile-drawer-panel')).toBeVisible();
  await expect(page.locator('.mobile-user-name')).toHaveText(/Rahul Sharma/i);
  await expect(page.locator('.mobile-user-badge')).toBeVisible();

  // No horizontal overflow on mobile
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);

  // Sign out from mobile drawer
  await page.locator('.mobile-logout-btn').click();
  await expect(page).toHaveURL(/\/en$/);

  // Header should now show "Sign in" on public home
  await expect(page.locator('.site-header').getByRole('link',{name:/Sign in/i})).toBeVisible();
  await expect(page.locator('.site-header .user-account-button')).not.toBeVisible();
});

test('Google Auth API: rejects untrusted origins',async({request})=>{
  const response=await request.post('/api/auth/google',{
    headers:{
      Origin:'https://malicious-attacker.evil',
      'Content-Type':'application/json',
    },
    data:{
      demoPersona:'citizen',
      locale:'en',
    },
  });
  expect(response.status()).toBe(403);
});
