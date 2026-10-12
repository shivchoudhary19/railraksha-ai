import {NextRequest,NextResponse} from 'next/server';
import {safeReturnPath,type Session} from '@railraksha/schemas';
import {apiFetch,sessionCookie,sessionFallbackCookie,signSessionToken} from '@/lib/auth';
import {redis,rateLimit} from '@/lib/redis';
import {appOrigin,randomSecret,secureCookies,trustedOrigin} from '@/lib/security';
import {createRemoteJWKSet,jwtVerify} from 'jose';

// Public JWKS endpoints for Google Identity Services & Firebase Auth
const googleOidcKeys=createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
const firebaseAuthKeys=createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'));

interface GoogleAuthBody {
  idToken?: string;
  demoPersona?: 'citizen'|'verified_reporter'|'rpf_cyber'|'analyst';
  persona?: 'citizen'|'verified_reporter'|'rpf_cyber'|'analyst';
  locale?: string;
  returnTo?: string;
}

export async function POST(request:NextRequest){
  try{
    if(!await rateLimit('google_auth',40)){
      return NextResponse.json({error:'Rate limit exceeded. Please wait a moment.'},{status:429});
    }

    const originHeader=request.headers.get('origin');
    if(originHeader&&!trustedOrigin(originHeader,appOrigin())){
      return NextResponse.json({error:'Untrusted origin request'},{status:403});
    }

    const body=(await request.json().catch(()=>({}))) as GoogleAuthBody;
    const locale=body.locale==='hi'?'hi':'en';
    const activePersona=body.demoPersona||body.persona;

    let sub=`google_${randomSecret().slice(0,16)}`;
    let name='Rahul Sharma (Google Verified)';
    let email='rahul.sharma.citizen@gmail.com';
    let userRoles:Session['roles']=['citizen'];

    // 1. Verify Real Google or Firebase ID Token if provided
    if(body.idToken&&typeof body.idToken==='string'&&body.idToken.split('.').length===3){
      let verified=false;
      // Try verifying against Google OIDC certs
      try{
        const {payload}=await jwtVerify(body.idToken,googleOidcKeys,{
          issuer:['https://accounts.google.com','accounts.google.com'],
        });
        if(payload.sub){
          sub=`google_${payload.sub}`;
          name=typeof payload.name==='string'?payload.name:'Google User';
          email=typeof payload.email==='string'?payload.email:email;
          verified=true;
        }
      }catch{
        // Try verifying against Firebase Auth certs
        try{
          const projectId=process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID||'railraksha-defense';
          const {payload}=await jwtVerify(body.idToken,firebaseAuthKeys,{
            issuer:`https://securetoken.google.com/${projectId}`,
          });
          if(payload.sub){
            sub=`google_${payload.sub}`;
            name=typeof payload.name==='string'?payload.name:(typeof payload.email==='string'?payload.email.split('@')[0]:'Firebase User');
            email=typeof payload.email==='string'?payload.email:email;
            verified=true;
          }
        }catch{
          // Token verification failed or expired
        }
      }

      if(!verified&&!activePersona){
        return NextResponse.json({error:'Invalid or expired Google credential'},{status:401});
      }
    }

    // 2. Persona selection (for Presentation & Testing)
    if(activePersona){
      switch(activePersona){
        case 'rpf_cyber':
          sub=`google_rpf_${randomSecret().slice(0,10)}`;
          name='Inspector Vikram Singh (RPF Cyber Defense)';
          email='vikram.singh.rpf@gmail.com';
          userRoles=['rpf_cyber','analyst','citizen'];
          break;
        case 'analyst':
          sub=`google_soc_${randomSecret().slice(0,10)}`;
          name='Ananya Iyer (RailSOC Lead)';
          email='ananya.iyer.soc@gmail.com';
          userRoles=['analyst','soc_lead','citizen'];
          break;
        case 'verified_reporter':
          sub=`google_scout_${randomSecret().slice(0,10)}`;
          name='Priya Patel (Railway Cyber Scout)';
          email='priya.patel.scout@gmail.com';
          userRoles=['citizen','verified_reporter'];
          break;
        default:
          sub=`google_cit_${randomSecret().slice(0,10)}`;
          name='Rahul Sharma (Google Verified)';
          email='rahul.sharma.citizen@gmail.com';
          userRoles=['citizen'];
          break;
      }
    }

    // 3. Construct conforming Session object
    const session:Session={
      sub,
      name,
      email,
      roles:userRoles,
      accessToken:`google_token_${randomSecret()}`,
      idToken:body.idToken||`google_id_${randomSecret()}`,
      csrf:randomSecret(),
      expiresAt:Date.now()+(24*60*60*1000), // 24 hours
    };

    // 4. Store Session in Redis with automatic cleanup
    const sid=randomSecret();
    const ttlSeconds=24*60*60;
    await redis().set(`session:${sid}`,JSON.stringify(session),'EX',ttlSeconds).catch(()=>null);

    // 5. Generate signed fallback token for resilient zero-downtime edge auth
    const fallbackToken=await signSessionToken(session);

    // 6. Log session audit event
    await apiFetch('/v1/session-events',session,{
      method:'POST',
      body:JSON.stringify({action:'session.google_login'}),
    }).catch(()=>null);

    const targetUrl=safeReturnPath(body.returnTo??`/${locale}/dashboard`);
    const response=NextResponse.json({ok:true,returnTo:targetUrl});

    // 7. Set secure cookies
    response.cookies.set(sessionCookie,sid,{
      httpOnly:true,
      secure:secureCookies(),
      sameSite:'lax',
      path:'/',
      maxAge:ttlSeconds,
    });
    response.cookies.set(sessionFallbackCookie,fallbackToken,{
      httpOnly:true,
      secure:secureCookies(),
      sameSite:'lax',
      path:'/',
      maxAge:ttlSeconds,
    });

    response.headers.set('Cache-Control','no-store');
    return response;
  }catch(error){
    console.error(JSON.stringify({event:'google_auth_failed',error:error instanceof Error?error.message:'unknown'}));
    return NextResponse.json({error:'Internal server error during authentication'},{status:500});
  }
}
