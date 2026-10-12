import {beforeEach,describe,expect,it,vi} from 'vitest';
import {NextRequest} from 'next/server';
import type {Session} from '@railraksha/schemas';
const mocks=vi.hoisted(()=>({getSession:vi.fn(),apiFetch:vi.fn(),exchange:vi.fn(),rateLimit:vi.fn(),getdel:vi.fn(),set:vi.fn(),del:vi.fn()}));
vi.mock('@/lib/auth',async(importOriginal)=>({...await importOriginal<typeof import('../src/lib/auth')>(),getSession:mocks.getSession,apiFetch:mocks.apiFetch,exchange:mocks.exchange}));
vi.mock('@/lib/redis',()=>({rateLimit:mocks.rateLimit,redis:()=>({getdel:mocks.getdel,set:mocks.set,del:mocks.del})}));
import {GET as login} from '../src/app/api/auth/login/route';
import {GET as callback} from '../src/app/api/auth/callback/route';
import {POST as logout} from '../src/app/api/auth/logout/route';
import {POST as profile} from '../src/app/api/profile/route';
import {GET as toolGet,POST as toolPost} from '../src/app/api/tools/[...path]/route';
const sid='a'.repeat(43);
const session:Session={sub:'53b4be18-a02f-4f79-b0c8-905f0de68a54',name:'DEMO',email:'demo@example.test',roles:['citizen'],accessToken:'test-access',idToken:'test-id',csrf:'test-csrf',expiresAt:Date.now()+60000};
const transaction={state:'test-state',nonce:'test-nonce',verifier:'test-verifier',returnTo:'/hi/dashboard',locale:'hi'};
function formRequest(path:string,values:Record<string,string>,origin='http://localhost:3000'){
  return new NextRequest(`http://localhost:3000${path}`,{method:'POST',headers:{Origin:origin,Cookie:`railraksha_session=${sid}`},body:new URLSearchParams(values)});
}
function callbackRequest(state='test-state'){
  return new NextRequest(`http://localhost:3000/api/auth/callback?code=test-code&state=${state}`,{headers:{Cookie:`railraksha_login=${sid}`}});
}
beforeEach(()=>{
  vi.resetAllMocks();mocks.getSession.mockResolvedValue(session);mocks.rateLimit.mockResolvedValue(true);
  mocks.apiFetch.mockResolvedValue(new Response('{}'));mocks.exchange.mockResolvedValue(session);
  mocks.getdel.mockResolvedValue(JSON.stringify(transaction));
});
describe('tool proxy trust boundaries',()=>{
  const context=(path:string)=>({params:Promise.resolve({path:path.split('/')})});
  const request=(path:string,body:string,headers:Record<string,string>={})=>new NextRequest(`http://localhost:3000/api/tools/${path}`,{method:'POST',headers:{Origin:'http://localhost:3000','x-csrf-token':session.csrf,'Content-Type':'application/json',...headers},body});
  it('denies arbitrary paths, anonymous callers and cross-origin writes',async()=>{
    expect((await toolGet(new NextRequest('http://localhost:3000/api/tools/admin'),context('admin'))).status).toBe(404);
    mocks.getSession.mockResolvedValueOnce(null);expect((await toolGet(new NextRequest('http://localhost:3000/api/tools/reports'),context('reports'))).status).toBe(401);
    for(const headers of [{Origin:'https://untrusted.example'},{'x-csrf-token':'wrong'}] as Record<string,string>[])expect((await toolPost(request('reports','{}',headers),context('reports'))).status).toBe(403);
    expect(mocks.apiFetch).not.toHaveBeenCalled();
  });
  it('validates bodies before forwarding and bounds chunked requests',async()=>{
    expect((await toolPost(request('verify','{"kind":"url"}'),context('verify'))).status).toBe(422);
    expect((await toolPost(request('reports','x'.repeat(65537),{'Content-Length':'1'}),context('reports'))).status).toBe(413);
    const response=await toolPost(request('verify','{"kind":"domain","value":"demo.example"}'),context('verify'));
    expect(response.status).toBe(200);expect(mocks.apiFetch.mock.calls[0][0]).toBe('/v1/verify');
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
  it('forwards only the registry search parameter and safe binary downloads',async()=>{
    await toolGet(new NextRequest('http://localhost:3000/api/tools/registry?search=DEMO&access_token=secret'),context('registry'));
    expect(mocks.apiFetch.mock.calls[0][0]).toBe('/v1/registry?search=DEMO');
    mocks.apiFetch.mockResolvedValueOnce(new Response('DEMO encrypted screenshot',{headers:{'Content-Type':'text/html'}}));
    const response=await toolGet(new NextRequest('http://localhost:3000/api/tools/evidence/53b4be18-a02f-4f79-b0c8-905f0de68a54'),context('evidence/53b4be18-a02f-4f79-b0c8-905f0de68a54'));
    expect(response.headers.get('content-type')).toBe('image/png');expect(response.headers.get('content-disposition')).toContain('attachment');
  });
  it('enforces file request framing and handles outages without credential details',async()=>{
    expect((await toolPost(request('verify/qr','{}'),context('verify/qr'))).status).toBe(400);
    const data=new FormData();data.set('file',new File(['DEMO PNG'],'demo.png',{type:'image/png'}));
    const upload=new NextRequest('http://localhost:3000/api/tools/verify/qr',{method:'POST',headers:{Origin:'http://localhost:3000','x-csrf-token':session.csrf},body:data});
    expect((await toolPost(upload,context('verify/qr'))).status).toBe(200);
    mocks.apiFetch.mockRejectedValueOnce(new Error('private token details'));
    const response=await toolGet(new NextRequest('http://localhost:3000/api/tools/reports'),context('reports'));
    expect(response.status).toBe(503);expect(JSON.stringify(await response.json())).not.toContain('private');
  });
});
describe('OIDC routes',()=>{
  it('creates an opaque transaction with PKCE and rejects open redirects',async()=>{
    const response=await login(new NextRequest('http://localhost:3000/api/auth/login?locale=hi&returnTo=https://untrusted.example'));
    const url=new URL(response.headers.get('location')!);expect(url.origin).toBe('http://localhost:8081');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    for(const key of ['state','nonce','code_challenge'])expect(url.searchParams.get(key)).toHaveLength(43);
    expect(response.cookies.get('railraksha_login')?.value).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(response.headers.get('set-cookie')).toMatch(/HttpOnly/i);
    expect(JSON.parse(mocks.set.mock.calls[0][1]).returnTo).toBe('/en/dashboard');
    expect(mocks.set.mock.calls[0].slice(2)).toEqual(['EX',300]);
  });
  it('handles registration, throttling and an unavailable store',async()=>{
    const registered=await login(new NextRequest('http://localhost:3000/api/auth/login?mode=register'));
    expect(new URL(registered.headers.get('location')!).pathname).toContain('/registrations');
    mocks.rateLimit.mockResolvedValueOnce(false);expect((await login(new NextRequest('http://localhost:3000/api/auth/login'))).status).toBe(429);
    mocks.set.mockRejectedValueOnce(new Error('offline'));
    expect((await login(new NextRequest('http://localhost:3000/api/auth/login'))).headers.get('location')).toContain('/en/login?error=unavailable');
  });
  it('consumes the transaction before rejecting mismatched state',async()=>{
    const response=await callback(callbackRequest('wrong'));expect(mocks.getdel).toHaveBeenCalledWith(`login:${sid}`);
    expect(mocks.exchange).not.toHaveBeenCalled();expect(mocks.set).not.toHaveBeenCalled();
    expect(response.headers.get('location')).toContain('/hi/login?error=signin');
  });
  it('denies missing cookies, expired transactions and unsuccessful audits',async()=>{
    expect((await callback(new NextRequest('http://localhost:3000/api/auth/callback'))).headers.get('location')).toContain('error=signin');
    mocks.getdel.mockResolvedValueOnce(null);await callback(callbackRequest());expect(mocks.exchange).not.toHaveBeenCalled();
    mocks.apiFetch.mockResolvedValueOnce(new Response('',{status:503}));await callback(callbackRequest());expect(mocks.set).not.toHaveBeenCalled();
  });
  it('stores tokens server-side and delivers an opaque session cookie',async()=>{
    const response=await callback(callbackRequest());expect(response.headers.get('location')).toBe('http://localhost:3000/hi/dashboard');
    expect(response.cookies.get('railraksha_session')?.value).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(response.headers.get('set-cookie')).not.toMatch(/test-access|test-id/);
    expect(JSON.parse(mocks.set.mock.calls[0][1]).accessToken).toBe('test-access');
    expect(mocks.set.mock.calls[0][3]).toBeGreaterThan(0);
  });
  it('does not store already-expired sessions',async()=>{
    mocks.exchange.mockResolvedValueOnce({...session,expiresAt:1});await callback(callbackRequest());expect(mocks.set).not.toHaveBeenCalled();
  });
  it('logs a failure category without authorization codes, tokens or error details',async()=>{
    const output=vi.spyOn(console,'error').mockImplementation(()=>{});
    mocks.exchange.mockRejectedValueOnce(new Error('private authorization or token details'));
    await callback(callbackRequest());
    expect(output).toHaveBeenCalledWith(JSON.stringify({event:'signin_failed',reason:'Error'}));
    expect(output.mock.calls.flat().join(' ')).not.toMatch(/private|test-code|test-access|test-id/);
    output.mockRestore();
  });
});
describe('profile and logout trust boundaries',()=>{
  it('returns structured errors for malformed form requests',async()=>{
    for(const handler of [profile,logout]){
      const response=await handler(new NextRequest('http://localhost:3000/api/profile',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}));
      expect(response.status).toBe(400);expect(await response.json()).toEqual({error:'Expected a valid form'});
    }
    expect(mocks.apiFetch).not.toHaveBeenCalled();
  });
  it('requires an authenticated session',async()=>{
    mocks.getSession.mockResolvedValue(null);expect((await profile(formRequest('/api/profile',{}))).status).toBe(401);
    expect((await logout(formRequest('/api/auth/logout',{}))).status).toBe(403);
  });
  it('rejects foreign origins and wrong CSRF tokens before accessing the API',async()=>{
    for(const handler of [profile,logout]){
      expect((await handler(formRequest('/api/profile',{csrf:session.csrf},'https://untrusted.example'))).status).toBe(403);
      expect((await handler(formRequest('/api/profile',{csrf:'wrong'}))).status).toBe(403);
    }
    expect(mocks.apiFetch).not.toHaveBeenCalled();expect(mocks.del).not.toHaveBeenCalled();
  });
  it('validates profile fields and discards injected roles',async()=>{
    const invalid=await profile(formRequest('/api/profile',{csrf:session.csrf,display_name:'<script>',language:'hi',locale:'hi'}));
    expect(invalid.headers.get('location')).toContain('/hi/profile?error=invalid');expect(mocks.apiFetch).not.toHaveBeenCalled();
    const response=await profile(formRequest('/api/profile',{csrf:session.csrf,display_name:'DEMO',language:'hi',roles:'admin'}));
    expect(response.status).toBe(303);expect(response.headers.get('location')).toContain('/hi/profile?saved=1');
    expect(JSON.parse(mocks.apiFetch.mock.calls[0][2].body)).toEqual({display_name:'DEMO',language:'hi'});
  });
  it('reports save failures without falsely claiming success',async()=>{
    const values={csrf:session.csrf,display_name:'DEMO',language:'en'};
    mocks.apiFetch.mockResolvedValueOnce(new Response('',{status:503}));expect((await profile(formRequest('/api/profile',values))).headers.get('location')).toContain('error=save');
    mocks.apiFetch.mockRejectedValueOnce(new Error('offline'));expect((await profile(formRequest('/api/profile',values))).headers.get('location')).toContain('error=save');
  });
  it('deletes the session and uses only the configured provider for OIDC logout',async()=>{
    const response=await logout(formRequest('/api/auth/logout',{csrf:session.csrf,locale:'hi'}));
    expect(mocks.del).toHaveBeenCalledWith(`session:${sid}`);
    const url=new URL(response.headers.get('location')!);expect(url.origin).toBe('http://localhost:8081');
    expect(url.searchParams.get('post_logout_redirect_uri')).toBe('http://localhost:3000/hi');
    expect(url.searchParams.get('id_token_hint')).toBe('test-id');expect(response.headers.get('set-cookie')).toContain('railraksha_session=;');
  });
  it('clears the session when logout auditing is unavailable',async()=>{
    const log=vi.spyOn(console,'error').mockImplementation(()=>{});mocks.apiFetch.mockRejectedValueOnce(new Error('offline'));
    const response=await logout(formRequest('/api/auth/logout',{csrf:session.csrf}));expect(response.status).toBe(303);expect(mocks.del).toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith('{"event":"logout_audit_unavailable"}');log.mockRestore();
  });
});
