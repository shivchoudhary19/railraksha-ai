import {NextRequest,NextResponse} from 'next/server';
import {apiFetch,exchange,sessionCookie,transactionCookie,transactionSchema} from '@/lib/auth';
import {redis,rateLimit} from '@/lib/redis';
import {appOrigin,csrfMatches,randomSecret,secureCookies} from '@/lib/security';
import {errors} from 'jose';
export async function GET(request:NextRequest){
  let locale='en';
  try{
    if(!await rateLimit('callback'))throw new Error('Rate limited');
    const id=request.cookies.get(transactionCookie)?.value;
    if(!id||!/^[A-Za-z0-9_-]{43}$/.test(id))throw new Error('Missing transaction');
    const raw=await redis().getdel(`login:${id}`);
    if(!raw)throw new Error('Expired transaction');
    const transaction=transactionSchema.parse(JSON.parse(raw));locale=transaction.locale;
    if(!csrfMatches(transaction.state,request.nextUrl.searchParams.get('state')))throw new Error('Invalid state');
    const code=request.nextUrl.searchParams.get('code');if(!code)throw new Error('Authorization failed');
    const session=await exchange(code,transaction.verifier,transaction.nonce,`${appOrigin()}/api/auth/callback`);
    const audit=await apiFetch('/v1/session-events',session,{method:'POST',body:JSON.stringify({action:'session.login'})});
    if(!audit.ok)throw new Error('Audit unavailable');
    const sid=randomSecret();const ttl=Math.floor((session.expiresAt-Date.now())/1000);
    if(ttl<1)throw new Error('Expired session');
    await redis().set(`session:${sid}`,JSON.stringify(session),'EX',ttl);
    const response=NextResponse.redirect(new URL(transaction.returnTo,appOrigin()));
    response.cookies.set(sessionCookie,sid,{httpOnly:true,secure:secureCookies(),sameSite:'lax',path:'/',maxAge:ttl});
    response.cookies.delete(transactionCookie);response.headers.set('Cache-Control','no-store');return response;
  }catch(error){
    const known=['Token exchange failed','Unverified identity','Identity mismatch','Audit unavailable'];
    const reason=error instanceof Error&&known.includes(error.message)?error.message:error instanceof Error?error.name:'unknown';
    console.error(JSON.stringify({event:'signin_failed',reason,claim:error instanceof errors.JWTClaimValidationFailed?error.claim:undefined}));
    const response=NextResponse.redirect(new URL(`/${locale}/login?error=signin`,appOrigin()));
    response.cookies.delete(transactionCookie);return response;
  }
}
