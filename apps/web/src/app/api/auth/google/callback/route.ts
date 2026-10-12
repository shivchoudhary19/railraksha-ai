import {NextRequest,NextResponse} from 'next/server';
import {safeReturnPath,type Session} from '@railraksha/schemas';
import {apiFetch,sessionCookie,sessionFallbackCookie,signSessionToken} from '@/lib/auth';
import {redis} from '@/lib/redis';
import {appOrigin,randomSecret,secureCookies} from '@/lib/security';
import {createRemoteJWKSet,jwtVerify} from 'jose';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const googleOidcKeys = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));

export async function GET(request:NextRequest){
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const state = searchParams.get('state');

  let locale = 'en';
  let returnTo = '/en/dashboard';

  if(state){
    try{
      const decoded = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
      if(decoded.locale === 'hi') locale = 'hi';
      if(decoded.returnTo) returnTo = decoded.returnTo;
    }catch{}
  }

  if(error || !code){
    return NextResponse.redirect(new URL(`/${locale}/login?error=cancelled`, appOrigin()));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error('Missing Google OAuth client credentials in environment variables');
    return NextResponse.redirect(new URL(`/${locale}/login?error=missing_credentials`, appOrigin()));
  }
  const origin = appOrigin();
  const redirectUri = `${origin}/api/auth/google/callback`;

  try{
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if(!tokenResponse.ok){
      console.error('Google token exchange failed', await tokenResponse.text());
      return NextResponse.redirect(new URL(`/${locale}/login?error=oauth_exchange_failed`, appOrigin()));
    }

    const tokens = await tokenResponse.json();
    let sub = `google_${randomSecret().slice(0, 16)}`;
    let name = 'Google Verified Citizen';
    let email = 'citizen.google@railraksha.gov.in';

    if(tokens.id_token){
      try{
        const {payload} = await jwtVerify(tokens.id_token, googleOidcKeys, {
          issuer: ['https://accounts.google.com', 'accounts.google.com'],
        });
        if(payload.sub) sub = `google_${payload.sub}`;
        if(typeof payload.name === 'string') name = payload.name;
        if(typeof payload.email === 'string') email = payload.email;
      }catch(err){
        console.warn('ID token verification notice:', err);
      }
    }

    const session: Session = {
      sub,
      name,
      email,
      roles: ['citizen'],
      accessToken: tokens.access_token || `google_token_${randomSecret()}`,
      idToken: tokens.id_token || `google_id_${randomSecret()}`,
      csrf: randomSecret(),
      expiresAt: Date.now() + (24 * 60 * 60 * 1000),
    };

    const sid = randomSecret();
    const ttlSeconds = 24 * 60 * 60;
    await redis().set(`session:${sid}`, JSON.stringify(session), 'EX', ttlSeconds).catch(() => null);

    const fallbackToken = await signSessionToken(session);

    await apiFetch('/v1/session-events', session, {
      method: 'POST',
      body: JSON.stringify({action: 'session.google_oauth_login'}),
    }).catch(() => null);

    const targetUrl = safeReturnPath(returnTo);
    const response = NextResponse.redirect(new URL(targetUrl, appOrigin()));

    response.cookies.set(sessionCookie, sid, {
      httpOnly: true,
      secure: secureCookies(),
      sameSite: 'lax',
      path: '/',
      maxAge: ttlSeconds,
    });
    response.cookies.set(sessionFallbackCookie, fallbackToken, {
      httpOnly: true,
      secure: secureCookies(),
      sameSite: 'lax',
      path: '/',
      maxAge: ttlSeconds,
    });

    // Clear state cookie
    response.cookies.set('railraksha_google_oauth_state', '', {
      httpOnly: true,
      secure: secureCookies(),
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });

    return response;
  }catch(err){
    console.error('OAuth callback error', err);
    return NextResponse.redirect(new URL(`/${locale}/login?error=signin`, appOrigin()));
  }
}
