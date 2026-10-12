import {createHash,randomBytes,timingSafeEqual} from 'node:crypto';
export function randomSecret(){return randomBytes(32).toString('base64url');}
export function pkceChallenge(verifier:string){return createHash('sha256').update(verifier).digest('base64url');}
export function csrfMatches(expected:string,provided:unknown):boolean {
  if(typeof provided!=='string'||!expected)return false;
  const a=Buffer.from(expected),b=Buffer.from(provided);
  return a.length===b.length&&timingSafeEqual(a,b);
}
export function trustedOrigin(origin:string|null,expected:string){
  if(!origin)return false;
  try{
    const originUrl=new URL(origin);
    const expectedOrigin=new URL(expected).origin;
    if(originUrl.origin===expectedOrigin)return true;
    if(originUrl.hostname==='vercel.app'||originUrl.hostname.endsWith('.vercel.app'))return true;
    if(process.env.APP_ENV!=='production'){
      const devOrigins=['http://localhost:3000','http://127.0.0.1:3000','http://0.0.0.0:3000'];
      if(devOrigins.includes(originUrl.origin)&&devOrigins.includes(expectedOrigin))return true;
    }
  }catch{
    return false;
  }
  return false;
}
export function secureCookies(){return process.env.NODE_ENV==='production'||process.env.VERCEL==='1'||process.env.APP_ENV==='production'||process.env.SESSION_COOKIE_SECURE==='true';}
export function appOrigin(){
  if(process.env.APP_ORIGIN)return process.env.APP_ORIGIN;
  if(process.env.VERCEL_PROJECT_PRODUCTION_URL)return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if(process.env.VERCEL_URL)return `https://${process.env.VERCEL_URL}`;
  const origin='http://localhost:3000';
  if(process.env.APP_ENV==='production'&&!origin.startsWith('https://'))throw new Error('HTTPS required');
  return origin;
}
