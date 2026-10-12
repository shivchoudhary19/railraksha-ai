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
  const expectedOrigin=new URL(expected).origin;
  if(origin===expectedOrigin)return true;
  if(process.env.APP_ENV!=='production'){
    const devOrigins=['http://localhost:3000','http://127.0.0.1:3000','http://0.0.0.0:3000'];
    if(devOrigins.includes(origin)&&devOrigins.includes(expectedOrigin))return true;
  }
  return false;
}
export function secureCookies(){return process.env.APP_ENV==='production'||process.env.SESSION_COOKIE_SECURE==='true';}
export function appOrigin(){const origin=process.env.APP_ORIGIN??'http://localhost:3000';if(process.env.APP_ENV==='production'&&!origin.startsWith('https://'))throw new Error('HTTPS required');return origin;}
