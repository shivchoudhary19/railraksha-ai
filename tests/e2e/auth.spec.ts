import {demoPassword,signIn,credentialsSignIn,adminHeaders,createUser,mailboxLink,totp} from '../helpers/identity';
import {test,expect,type Page} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import AxeBuilder from '@axe-core/playwright';
const browserErrors=new WeakMap<Page,string[]>();
test.beforeEach(({page})=>{const errors:string[]=[];browserErrors.set(page,errors);page.on('pageerror',error=>errors.push(error.name));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});});
test.afterEach(({page})=>{expect(browserErrors.get(page)).toEqual([]);});
async function checkAccessibility(page:Page){expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations.map(item=>item.id)).toEqual([]);}
test('citizen signs in, cannot access operator workspace, saves profile, and signs out',async({page,context})=>{
  await signIn(page);await expect(page).toHaveURL(/\/en\/dashboard$/);
  await checkAccessibility(page);
  const cookie=(await context.cookies()).find(item=>item.name==='railraksha_session');
  expect(cookie?.httpOnly).toBe(true);expect(cookie?.sameSite).toBe('Lax');expect(cookie?.value).toMatch(/^[A-Za-z0-9_-]{43}$/);
  await page.goto('/en/operator');await expect(page.getByRole('heading',{name:'This workspace needs permission.'})).toBeVisible();
  await page.goto('/en/profile');await page.getByLabel('Display name').fill('DEMO saved profile');
  await checkAccessibility(page);
  await page.getByLabel('Preferred language').selectOption('hi');await page.getByRole('button',{name:'Save settings'}).click();
  await expect(page).toHaveURL(/\/hi\/profile\?saved=1/);await expect(page.getByLabel('दिखने वाला नाम')).toHaveValue('DEMO saved profile');
  await checkAccessibility(page);
  await page.getByRole('button',{name:'साइन आउट'}).click();await expect(page).toHaveURL(/\/hi$/);
  expect((await context.cookies()).some(item=>item.name==='railraksha_session')).toBe(false);
  await page.goto('/en/dashboard');await expect(page).toHaveURL(/\/en\/login/);
});
test('profile rejects cross-origin and missing CSRF after sign-in',async({page})=>{
  await signIn(page);await expect(page).toHaveURL(/\/en\/dashboard/);
  const rejected=await page.request.post('/api/profile',{headers:{Origin:'https://untrusted.example'},form:{display_name:'Rejected',language:'en',csrf:'wrong'}});
  expect(rejected.status()).toBe(403);
  const missing=await page.request.post('/api/profile',{headers:{Origin:'http://localhost:3000'},form:{display_name:'Rejected',language:'en'}});
  expect(missing.status()).toBe(403);
});
test('Hindi identity pages translate login, registration and reset forms',async({page})=>{
  await page.goto('/api/auth/login?locale=hi');
  await expect(page.getByRole('button',{name:'साइन इन करें',exact:true})).toBeVisible();
  await expect(page.getByLabel('ईमेल',{exact:true})).toBeVisible();
  await page.getByRole('link',{name:'पासवर्ड भूल गए?'}).click();
  await expect(page.getByRole('button',{name:'जमा करें',exact:true})).toBeVisible();
  await page.goto('/api/auth/login?locale=hi&mode=register');
  await expect(page.getByLabel(/पहला नाम/)).toBeVisible();
  await expect(page.getByRole('button',{name:'खाता बनाएँ',exact:true})).toBeVisible();
});
test('analyst enrols TOTP and accesses the operator shell',async({page,request})=>{
  test.setTimeout(90000);
  const user=await createUser(request,'analyst',['CONFIGURE_TOTP']);
  try{
    await credentialsSignIn(page,user.email,user.password);await page.locator('#mode-manual').click();
    const secret=await page.locator('#kc-totp-secret-key').textContent();if(!secret)throw new Error('TOTP enrolment secret is missing');
    const enrolledStep=Math.floor(Date.now()/30000);
    await page.locator('#totp').fill(totp(secret));await page.locator('#userLabel').fill('DEMO regression authenticator');
    await page.locator('#saveTOTPBtn').click();await expect(page).toHaveURL(/\/en\/dashboard/);await page.goto('/en/operator');
    await expect(page.getByRole('heading',{name:'Operator workspace'})).toBeVisible();
    await checkAccessibility(page);
    await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(page).toHaveURL(/\/en$/);
    await credentialsSignIn(page,user.email,user.password);await expect(page.locator('#otp')).toBeVisible();
    await page.locator('#otp').fill('000000');await page.getByRole('button',{name:/Sign In/i}).click();
    await expect(page.locator('#otp')).toBeVisible();
    await expect.poll(()=>Math.floor(Date.now()/30000),{timeout:35000}).not.toBe(enrolledStep);
    await page.locator('#otp').fill(totp(secret));
    await page.getByRole('button',{name:/Sign In/i}).click();await expect(page).toHaveURL(/\/en\/dashboard/);
  }finally{await user.dispose();}
});
test('signup requires email verification delivered to the local mailbox',async({page,request})=>{
  const email=`demo.registration.${randomBytes(5).toString('hex')}@example.test`;
  await page.goto('/api/auth/login?locale=en&mode=register');
  await page.getByLabel(/Email/).fill(email);await page.getByLabel(/First name/).fill('DEMO');
  await page.getByLabel(/Last name/).fill('Registration');await page.getByRole('button',{name:'Register',exact:true}).click();
  await expect(page.getByText(/verify your email|email verification/i).first()).toBeVisible();
  await page.goto(await mailboxLink(request,email));
  await page.locator('#password-new').fill(demoPassword());await page.locator('#password-confirm').fill(demoPassword());
  await page.getByRole('button',{name:'Submit',exact:true}).click();await expect(page).toHaveURL(/\/en\/dashboard/);
  const headers=await adminHeaders(request);
  const matches=await (await request.get('http://localhost:8081/admin/realms/railraksha/users',{headers,params:{email,exact:'true'}})).json() as {id:string;email:string}[];
  const created=matches.find(user=>user.email===email);if(!created)throw new Error('Synthetic registration was not found');
  expect((await request.delete(`http://localhost:8081/admin/realms/railraksha/users/${created.id}`,{headers})).status()).toBe(204);
});
test('password reset uses the local mailbox and accepts the new password',async({page,request})=>{
  const user=await createUser(request);const newPassword=randomBytes(24).toString('base64url');
  try{
    await page.goto('/api/auth/login?locale=en');await page.getByRole('link',{name:/Forgot password/i}).click();
    await page.locator('#username').fill(user.email);await page.getByRole('button',{name:'Submit',exact:true}).click();
    await page.goto(await mailboxLink(request,user.email));await page.locator('#password-new').fill(newPassword);
    await page.locator('#password-confirm').fill(newPassword);await page.getByRole('button',{name:'Submit',exact:true}).click();
    await expect(page).toHaveURL(/\/en\/dashboard/);await page.getByRole('button',{name:'Sign out',exact:true}).click();
    await expect(page).toHaveURL(/\/en$/);await credentialsSignIn(page,user.email,newPassword);
    await expect(page).toHaveURL(/\/en\/dashboard/);
  }finally{await user.dispose();}
});
test('a verified resident passkey registers and signs in without a password',async({page,context,request})=>{
  const user=await createUser(request,'citizen',['webauthn-register-passwordless']);const cdp=await context.newCDPSession(page);
  await cdp.send('WebAuthn.enable');
  let assertions=0;cdp.on('WebAuthn.credentialAsserted',()=>{assertions++;});
  await cdp.send('WebAuthn.addVirtualAuthenticator',{options:{protocol:'ctap2',transport:'internal',hasResidentKey:true,hasUserVerification:true,isUserVerified:true,automaticPresenceSimulation:true}});
  try{
    page.on('dialog',dialog=>dialog.accept('DEMO regression passkey'));
    await credentialsSignIn(page,user.email,user.password);await page.locator('#registerWebAuthn').click();
    await expect(page).toHaveURL(/\/en\/dashboard/);await page.getByRole('button',{name:'Sign out',exact:true}).click();
    await expect(page).toHaveURL(/\/en$/);await page.goto('/api/auth/login?locale=en');
    // The virtual authenticator accepts Keycloak's conditional passkey prompt automatically.
    await expect(page).toHaveURL(/\/en\/dashboard/);await expect.poll(()=>assertions).toBeGreaterThan(0);
  }finally{
    // Playwright closes this page/context and its virtual authenticator after the journey.
    await user.dispose();
  }
});
