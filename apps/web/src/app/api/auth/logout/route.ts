import {NextRequest,NextResponse} from 'next/server';
import {apiFetch,clientId,getSession,issuer,sessionCookie} from '@/lib/auth';
import {redis} from '@/lib/redis';
import {appOrigin,csrfMatches,trustedOrigin} from '@/lib/security';
export async function POST(request:NextRequest){
  const session=await getSession();
  if(!session)return NextResponse.json({error:'Invalid request'},{status:403});
  let form:FormData;
  try{form=await request.formData();}catch{return NextResponse.json({error:'Expected a valid form'},{status:400});}
  if(!trustedOrigin(request.headers.get('origin'),appOrigin())||!csrfMatches(session.csrf,form.get('csrf')))return NextResponse.json({error:'Invalid request'},{status:403});
  const locale=form.get('locale')==='hi'?'hi':'en';
  const sid=request.cookies.get(sessionCookie)?.value;
  const audited=await apiFetch('/v1/session-events',session,{method:'POST',body:JSON.stringify({action:'session.logout'})}).catch(()=>null);
  // Logging failure must never stop someone clearing an authenticated browser session.
  if(!audited?.ok)console.error(JSON.stringify({event:'logout_audit_unavailable'}));
  if(sid)await redis().del(`session:${sid}`);
  const url=new URL(`${issuer()}/protocol/openid-connect/logout`);
  url.search=new URLSearchParams({client_id:clientId(),id_token_hint:session.idToken,post_logout_redirect_uri:`${appOrigin()}/${locale}`}).toString();
  const response=NextResponse.redirect(url,303);response.cookies.delete(sessionCookie);return response;
}
