import {NextRequest,NextResponse} from 'next/server';
import {appOrigin,randomSecret,secureCookies} from '@/lib/security';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request:NextRequest){
  const searchParams = request.nextUrl.searchParams;
  const locale = searchParams.get('locale') === 'hi' ? 'hi' : 'en';
  const returnTo = searchParams.get('returnTo') || `/${locale}/dashboard`;

  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(new URL(`/${locale}/login?error=missing_client_id`, appOrigin()));
  }
  const origin = appOrigin();
  const redirectUri = `${origin}/api/auth/google/callback`;

  const nonce = randomSecret();
  const stateData = JSON.stringify({locale, returnTo, nonce});
  const state = Buffer.from(stateData).toString('base64url');

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid email profile');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'select_account');

  const response = NextResponse.redirect(authUrl.toString());
  response.cookies.set('railraksha_google_oauth_state', state, {
    httpOnly: true,
    secure: secureCookies(),
    sameSite: 'lax',
    path: '/',
    maxAge: 600, // 10 minutes
  });

  return response;
}
