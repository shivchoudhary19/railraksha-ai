import {afterEach,describe,expect,it,vi} from 'vitest';
import {NextRequest} from 'next/server';
vi.mock('next-intl/middleware',async()=>{
  const {NextResponse}=await import('next/server');
  return {default:()=>()=>NextResponse.next()};
});
import {middleware} from '../src/middleware';
afterEach(()=>vi.unstubAllEnvs());
describe('security headers',()=>{
  it('uses fresh nonces and the full production header policy',()=>{
    vi.stubEnv('NODE_ENV','production');vi.stubEnv('APP_ENV','production');
    vi.stubEnv('OIDC_ISSUER','https://identity.example/realms/railraksha');
    const first=middleware(new NextRequest('https://railraksha.example/en'));
    const second=middleware(new NextRequest('https://railraksha.example/en'));
    const policy=first.headers.get('Content-Security-Policy')!;
    expect(policy).not.toBe(second.headers.get('Content-Security-Policy'));
    for(const directive of ["'nonce-","'strict-dynamic'","object-src 'none'","frame-ancestors 'none'","upgrade-insecure-requests"]){expect(policy).toContain(directive);}
    expect(policy).not.toMatch(/unsafe-inline|unsafe-eval/);
    expect(policy).toContain("form-action 'self' https://identity.example");
    expect(policy).not.toContain('/realms/');
    expect(first.headers.get('Strict-Transport-Security')).toBe('max-age=31536000');
    expect(first.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(first.headers.get('X-Frame-Options')).toBe('DENY');
    expect(first.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    expect(first.headers.get('Permissions-Policy')).toBe('camera=(), microphone=(), geolocation=()');
  });
  it('allows the development compiler without enabling HSTS on local HTTP',()=>{
    vi.stubEnv('NODE_ENV','development');vi.stubEnv('APP_ENV','development');
    const response=middleware(new NextRequest('http://localhost:3000/en'));
    expect(response.headers.get('Content-Security-Policy')).toContain("'unsafe-eval'");
    expect(response.headers.has('Strict-Transport-Security')).toBe(false);
  });
});
