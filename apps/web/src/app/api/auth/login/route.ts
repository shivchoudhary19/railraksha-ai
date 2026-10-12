import {NextRequest,NextResponse} from 'next/server';
import {safeReturnPath} from '@railraksha/schemas';
import {clientId,issuer,transactionCookie} from '@/lib/auth';
import {redis,rateLimit} from '@/lib/redis';
import {appOrigin,pkceChallenge,randomSecret,secureCookies} from '@/lib/security';
export async function GET(request:NextRequest){
  const locale=request.nextUrl.searchParams.get('locale')==='hi'?'hi':'en';
  try{
    if(!await rateLimit('login'))return NextResponse.json({error:'Please wait before retrying'},{status:429});
    const state=randomSecret(),nonce=randomSecret(),verifier=randomSecret(),transactionId=randomSecret();
    const returnTo=safeReturnPath(request.nextUrl.searchParams.get('returnTo')??`/${locale}/dashboard`);
    await redis().set(`login:${transactionId}`,JSON.stringify({state,nonce,verifier,returnTo,locale}),'EX',300);
    const register=request.nextUrl.searchParams.get('mode')==='register';
    const url=new URL(`${issuer()}/protocol/openid-connect/${register?'registrations':'auth'}`);
    url.search=new URLSearchParams({client_id:clientId(),response_type:'code',scope:'openid email profile',redirect_uri:`${appOrigin()}/api/auth/callback`,state,nonce,code_challenge:pkceChallenge(verifier),code_challenge_method:'S256',ui_locales:locale}).toString();
    if(request.nextUrl.searchParams.get('reauth')==='1'){url.searchParams.set('prompt','login');url.searchParams.set('max_age','0');}
    const response=NextResponse.redirect(url);
    response.cookies.set(transactionCookie,transactionId,{httpOnly:true,secure:secureCookies(),sameSite:'lax',path:'/',maxAge:300});
    response.headers.set('Cache-Control','no-store');
    return response;
  }catch{return NextResponse.redirect(new URL(`/${locale}/login?error=unavailable`,appOrigin()));}
}
