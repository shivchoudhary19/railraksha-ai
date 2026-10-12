import lighthouse from 'lighthouse';
import {launch} from 'chrome-launcher';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from '@playwright/test';
import {config} from 'dotenv';
config({path:'.env',quiet:true});
const chromePath='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const chrome=await launch({chromeFlags:['--headless=new'],...(existsSync(chromePath)?{chromePath}:{})});
const routes=['','about','how-it-works','safety-tips','contact','privacy','terms','responsible-disclosure','login'];
const scores=[];
let browser;
mkdirSync('.local/lighthouse',{recursive:true});
async function audit(locale,route,authenticated=false){
  const result=await lighthouse(`http://localhost:3000/${locale}/${route}`,{port:chrome.port,output:'json',onlyCategories:authenticated?['accessibility']:['performance','accessibility','best-practices','seo'],disableStorageReset:authenticated,logLevel:'error'});
  if(!result)throw new Error('Lighthouse returned no report');
  const categories=Object.fromEntries(Object.entries(result.lhr.categories).map(([name,value])=>[name,Math.round(value.score*100)]));
  scores.push({route:`/${locale}/${route}`,categories});
  writeFileSync(`.local/lighthouse/${locale}-${route||'home'}.json`,result.report);
  console.log(`/${locale}/${route}: ${JSON.stringify(categories)}`);
}
try{
  for(const locale of ['en','hi'])for(const route of routes){
    await audit(locale,route);
  }
  if(!process.argv.includes('--public-only')){
    if(!process.env.DEMO_PASSWORD)throw new Error('Run make bootstrap before authenticated Lighthouse checks');
    browser=await chromium.connectOverCDP(`http://127.0.0.1:${chrome.port}`);
    const page=await browser.contexts()[0].newPage();
    await page.goto('http://localhost:3000/api/auth/login?locale=en');
    await page.getByLabel(/Username|Email/i).fill('demo.citizen@example.test');
    await page.getByLabel('Password',{exact:true}).fill(process.env.DEMO_PASSWORD);
    await page.getByRole('button',{name:/Sign In/i}).click();
    await page.waitForURL('http://localhost:3000/en/dashboard');await page.close();
    for(const locale of ['en','hi'])for(const route of ['dashboard','profile'])await audit(locale,route,true);
  }
  writeFileSync('.local/lighthouse/summary.json',JSON.stringify(scores,null,2));
  const passed=scores.every(item=>item.categories.accessibility>=90&&(item.route.endsWith('/')?Object.values(item.categories).every(score=>score>=90):true));
  process.exitCode=passed?0:1;
}finally{if(browser)await browser.close();await chrome.kill();}
