import {NextRequest,NextResponse} from 'next/server';
import {profileSchema} from '@railraksha/schemas';
import {apiFetch,getSession} from '@/lib/auth';
import {appOrigin,csrfMatches,trustedOrigin} from '@/lib/security';
export async function POST(request:NextRequest){
  const session=await getSession();if(!session)return NextResponse.json({error:'Sign in to continue'},{status:401});
  let data:FormData;
  try{data=await request.formData();}catch{return NextResponse.json({error:'Expected a valid form'},{status:400});}
  if(!trustedOrigin(request.headers.get('origin'),appOrigin())||!csrfMatches(session.csrf,data.get('csrf')))return NextResponse.json({error:'Invalid request'},{status:403});
  const parsed=profileSchema.safeParse({display_name:data.get('display_name'),language:data.get('language')});
  const locale=data.get('locale')==='hi'?'hi':'en';
  if(!parsed.success)return NextResponse.redirect(new URL(`/${locale}/profile?error=invalid`,appOrigin()),303);
  try{
    const result=await apiFetch('/v1/profile',session,{method:'PUT',body:JSON.stringify(parsed.data)});
    if(!result.ok)throw new Error('Profile update failed');
    return NextResponse.redirect(new URL(`/${parsed.data.language}/profile?saved=1`,appOrigin()),303);
  }catch{return NextResponse.redirect(new URL(`/${locale}/profile?error=save`,appOrigin()),303);}
}
