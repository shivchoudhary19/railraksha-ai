import createMiddleware from 'next-intl/middleware';
import {NextRequest} from 'next/server';
import {routing} from './i18n/routing';

const intl=createMiddleware(routing);

export function middleware(request:NextRequest){
  const nonce=btoa(crypto.randomUUID());
  const dev=process.env.NODE_ENV==='development';
  const identityOrigin=new URL(process.env.OIDC_ISSUER??'http://localhost:8081/realms/railraksha').origin;
  const csp=[
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev?" 'unsafe-eval'":''} https://accounts.google.com https://apis.google.com https://www.gstatic.com`,
    `style-src 'self' 'nonce-${nonce}'`,
    "img-src 'self' data: https://*.googleusercontent.com https://lh3.googleusercontent.com https://www.gstatic.com",
    "font-src 'self' data:",
    `connect-src 'self'${dev?' ws:':''} https://accounts.google.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://*.googleapis.com https://*.firebaseio.com`,
    "object-src 'none'",
    "base-uri 'self'",
    `form-action 'self' ${identityOrigin} https://accounts.google.com`,
    "frame-ancestors 'none'",
    process.env.APP_ENV==='production'?'upgrade-insecure-requests':''
  ].filter(Boolean).join('; ');

  request.headers.set('x-nonce',nonce);
  request.headers.set('Content-Security-Policy',csp);

  const response=intl(request);
  response.headers.set('Content-Security-Policy',csp);
  response.headers.set('X-Content-Type-Options','nosniff');
  response.headers.set('Referrer-Policy','strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=()');
  response.headers.set('X-Frame-Options','DENY');
  if(process.env.APP_ENV==='production')response.headers.set('Strict-Transport-Security','max-age=31536000');
  return response;
}

export const config={matcher:['/((?!api|_next|.*\\..*).*)']};
