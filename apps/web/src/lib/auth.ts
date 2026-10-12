import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {createRemoteJWKSet,jwtVerify,SignJWT} from 'jose';
import {sessionSchema,roles,type Session} from '@railraksha/schemas';
import {z} from 'zod';
import {redis} from './redis';
import {randomSecret} from './security';

export const sessionCookie='railraksha_session';
export const sessionFallbackCookie='railraksha_session_token';
export const transactionCookie='railraksha_login';

const sessionSecret=new TextEncoder().encode(process.env.SESSION_SECRET??'railraksha-session-secret-32-chars-long-secure-key!!');

export function issuer(){return process.env.OIDC_ISSUER??'http://localhost:8081/realms/railraksha';}
export function internalIssuer(){return process.env.OIDC_INTERNAL_ISSUER??issuer();}
export function clientId(){return process.env.OIDC_CLIENT_ID??'railraksha-web';}

const keys=createRemoteJWKSet(new URL(`${internalIssuer()}/protocol/openid-connect/certs`));

export const transactionSchema=z.object({state:z.string(),nonce:z.string(),verifier:z.string(),returnTo:z.string(),locale:z.enum(['en','hi'])});

export async function signSessionToken(session:Session):Promise<string>{
  return new SignJWT({...session})
    .setProtectedHeader({alg:'HS256'})
    .setIssuedAt()
    .setExpirationTime(Math.floor(session.expiresAt/1000))
    .sign(sessionSecret);
}

export async function verifySessionToken(token:string):Promise<Session|null>{
  try{
    const {payload}=await jwtVerify(token,sessionSecret,{algorithms:['HS256']});
    const parsed=sessionSchema.safeParse(payload);
    return parsed.success&&parsed.data.expiresAt>Date.now()?parsed.data:null;
  }catch{
    return null;
  }
}

export async function getSession():Promise<Session|null>{
  const cookieStore=await cookies();
  const sid=cookieStore.get(sessionCookie)?.value;
  if(sid&&/^[A-Za-z0-9_-]{43}$/.test(sid)){
    try{
      const raw=await redis().get(`session:${sid}`);
      if(raw){
        const parsed=sessionSchema.safeParse(JSON.parse(raw));
        if(parsed.success&&parsed.data.expiresAt>Date.now())return parsed.data;
      }
    }catch{
      // Fall through to fallback signed token if Redis is unavailable or unconfigured
    }
  }
  const fallback=cookieStore.get(sessionFallbackCookie)?.value;
  if(fallback){
    const session=await verifySessionToken(fallback);
    if(session)return session;
  }
  return null;
}

export async function requireSession(locale:string){
  const session=await getSession();
  if(!session)redirect(`/${locale}/login`);
  return session;
}

const tokensSchema=z.object({access_token:z.string(),id_token:z.string(),expires_in:z.number().positive()});

export async function exchange(code:string,verifier:string,nonce:string,redirectUri:string):Promise<Session>{
  const response=await fetch(`${internalIssuer()}/protocol/openid-connect/token`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'authorization_code',client_id:clientId(),client_secret:process.env.OIDC_CLIENT_SECRET??'',code,code_verifier:verifier,redirect_uri:redirectUri}),signal:AbortSignal.timeout(8000),cache:'no-store'});
  if(!response.ok)throw new Error('Token exchange failed');
  const tokens=tokensSchema.parse(await response.json());
  const {payload}=await jwtVerify(tokens.id_token,keys,{issuer:issuer(),audience:clientId(),algorithms:['RS256'],requiredClaims:['sub','exp','iat','nonce']});
  if(payload.nonce!==nonce||payload.email_verified!==true)throw new Error('Unverified identity');
  const {payload:access}=await jwtVerify(tokens.access_token,keys,{issuer:issuer(),audience:process.env.OIDC_API_AUDIENCE??'railraksha-api',algorithms:['RS256'],requiredClaims:['sub','exp','iat']});
  if(access.sub!==payload.sub)throw new Error('Identity mismatch');
  const realm=z.object({roles:z.array(z.string())}).safeParse(access.realm_access);
  const acceptedRoles=realm.success?realm.data.roles.filter((role):role is typeof roles[number]=>roles.some(known=>known===role)):[];
  return sessionSchema.parse({sub:payload.sub,name:payload.name??payload.preferred_username??'',email:payload.email,roles:acceptedRoles,accessToken:tokens.access_token,idToken:tokens.id_token,csrf:randomSecret(),expiresAt:Math.min(Number(access.exp)*1000,Date.now()+tokens.expires_in*1000)});
}

export async function apiFetch(path:string,session:Session,init:RequestInit={}){
  return fetch(`${process.env.API_INTERNAL_URL??'http://localhost:8000'}${path}`,{...init,headers:{'Authorization':`Bearer ${session.accessToken}`,'Content-Type':'application/json',...init.headers},cache:'no-store',signal:init.signal??AbortSignal.timeout(5000)});
}
