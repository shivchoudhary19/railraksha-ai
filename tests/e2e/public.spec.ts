import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const pages=['','about','how-it-works','safety-tips','contact','privacy','terms','responsible-disclosure','login'];
for(const locale of ['en','hi']){
  for(const path of pages){
    test(`public ${locale}/${path||'home'} loads and meets accessibility checks`,async({page})=>{
      const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
      page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
      const response=await page.goto(`/${locale}/${path}`);
      expect(response?.status()).toBe(200);await expect(page.locator('html')).toHaveAttribute('lang',locale);
      await expect(page.locator('main h1')).toBeVisible();
      const csp=response?.headers()['content-security-policy']??'';
      expect(csp).toContain("'nonce-");expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).not.toContain('unsafe-inline');expect(csp).not.toContain('unsafe-eval');
      const results=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
      expect(results.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))).toEqual([]);
      expect(errors).toEqual([]);
    });
  }
}
test('language switch preserves the public route',async({page})=>{
  await page.goto('/en/safety-tips');await page.getByRole('link',{name:'Switch to Hindi'}).click();
  await expect(page).toHaveURL(/\/hi\/safety-tips/);await expect(page.locator('html')).toHaveAttribute('lang','hi');
});
test('keyboard skip link reaches main content',async({page})=>{
  await page.goto('/en');await page.keyboard.press('Tab');await expect(page.getByRole('link',{name:'Skip to content'})).toBeFocused();
  await page.keyboard.press('Enter');await expect(page).toHaveURL(/#main$/);
});
test('dark theme persists and remains accessible',async({page})=>{
  await page.goto('/en');await page.getByRole('button',{name:'Change color theme'}).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  expect((await new AxeBuilder({page}).withTags(['wcag2aa']).analyze()).violations.map(v=>v.id)).toEqual([]);
});
for(const width of [360,375,768,1280]){
  test(`home has no horizontal overflow at ${width}px`,async({page})=>{
    await page.setViewportSize({width,height:900});await page.goto('/hi');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await expect(page.locator('main h1')).toBeVisible();
  });
}
test('anonymous account routes require login and mutations reject missing sessions',async({page,request})=>{
  for(const path of ['dashboard','operator','profile']){await page.goto(`/en/${path}`);await expect(page).toHaveURL(/\/en\/login/);}
  expect((await request.post('/api/profile',{form:{display_name:'Injection',language:'en'}})).status()).toBe(401);
  expect((await request.post('/api/auth/logout',{form:{csrf:'wrong'}})).status()).toBe(403);
  expect((await request.get('/api/auth/callback?code=untrusted&state=wrong',{maxRedirects:0})).status()).toBe(307);
});
