import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({get:vi.fn(),cookie:vi.fn(),verify:vi.fn(),redirect:vi.fn((url:string)=>{throw new Error(`redirect:${url}`);})}));
vi.mock('next/headers',()=>({cookies:async()=>({get:mocks.cookie})}));
vi.mock('next/navigation',()=>({redirect:mocks.redirect}));
vi.mock('../src/lib/redis',()=>({redis:()=>({get:mocks.get})}));
vi.mock('jose',()=>({createRemoteJWKSet:vi.fn(()=>()=>{}),jwtVerify:mocks.verify}));
import {apiFetch,clientId,exchange,getSession,internalIssuer,issuer,requireSession} from '../src/lib/auth';
import type {Session} from '@railraksha/schemas';
const subject='53b4be18-a02f-4f79-b0c8-905f0de68a54';
const session:Session={sub:subject,name:'DEMO',email:'demo@example.test',roles:['citizen'],accessToken:'test-access',idToken:'test-id',csrf:'a'.repeat(43),expiresAt:Date.now()+60000};
const fetchMock=vi.fn();
beforeEach(()=>{vi.clearAllMocks();mocks.verify.mockReset();fetchMock.mockReset();vi.stubGlobal('fetch',fetchMock);});
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
describe('server session boundary',()=>{
  it('rejects missing or malformed opaque cookies',async()=>{
    mocks.cookie.mockReturnValue(undefined);expect(await getSession()).toBeNull();
    mocks.cookie.mockReturnValue({value:'../key'});expect(await getSession()).toBeNull();expect(mocks.get).not.toHaveBeenCalled();
  });
  it('rejects missing, malformed, invalid and expired stored sessions',async()=>{
    mocks.cookie.mockReturnValue({value:'a'.repeat(43)});
    for(const raw of [null,'{','{}',JSON.stringify({...session,expiresAt:1})]){mocks.get.mockResolvedValueOnce(raw);expect(await getSession()).toBeNull();}
    mocks.get.mockRejectedValueOnce(new Error('offline'));expect(await getSession()).toBeNull();
  });
  it('loads a validated session and guards anonymous pages',async()=>{
    mocks.cookie.mockReturnValue({value:'a'.repeat(43)});mocks.get.mockResolvedValue(JSON.stringify(session));
    expect(await requireSession('hi')).toEqual(session);expect(mocks.get).toHaveBeenCalledWith('session:'+'a'.repeat(43));
    mocks.cookie.mockReturnValue(undefined);await expect(requireSession('hi')).rejects.toThrow('redirect:/hi/login');
  });
});
describe('OIDC exchange',()=>{
  function prepare(identity:Record<string,unknown>={},access:Record<string,unknown>={}){
    fetchMock.mockResolvedValue(new Response(JSON.stringify({access_token:'test-access',id_token:'test-id',expires_in:900}),{status:200}));
    mocks.verify.mockResolvedValueOnce({payload:{sub:subject,nonce:'expected',email_verified:true,email:'demo@example.test',name:'DEMO',...identity}})
      .mockResolvedValueOnce({payload:{sub:subject,exp:Math.floor(Date.now()/1000)+900,realm_access:{roles:['citizen','untrusted']},...access}});
  }
  it('verifies issuer, audience, algorithm, nonce and API identity',async()=>{
    prepare();const result=await exchange('code','verifier','expected','http://localhost:3000/api/auth/callback');
    expect(result.roles).toEqual(['citizen']);expect(result.csrf).toHaveLength(43);
    expect(mocks.verify.mock.calls[0][2]).toMatchObject({issuer:issuer(),audience:clientId(),algorithms:['RS256']});
    expect(mocks.verify.mock.calls[1][2]).toMatchObject({audience:'railraksha-api',requiredClaims:['sub','exp','iat']});
    const body=fetchMock.mock.calls[0][1].body as URLSearchParams;
    expect(body.get('code_verifier')).toBe('verifier');expect(body.get('grant_type')).toBe('authorization_code');
  });
  it.each([{nonce:'wrong'},{email_verified:false}])('rejects unverified identity %j',async(identity)=>{
    prepare(identity);await expect(exchange('code','verifier','expected','http://localhost/callback')).rejects.toThrow('Unverified identity');
  });
  it('rejects a mismatched subject',async()=>{
    prepare({}, {sub:'different'});await expect(exchange('code','verifier','expected','http://localhost/callback')).rejects.toThrow('Identity mismatch');
  });
  it('rejects failed, malformed, and unsigned provider responses',async()=>{
    fetchMock.mockResolvedValueOnce(new Response('',{status:400}));await expect(exchange('code','v','n','http://localhost/callback')).rejects.toThrow('Token exchange failed');
    fetchMock.mockResolvedValueOnce(new Response('{}'));await expect(exchange('code','v','n','http://localhost/callback')).rejects.toThrow();
    prepare();mocks.verify.mockReset().mockRejectedValue(new Error('Bad signature'));await expect(exchange('code','v','n','http://localhost/callback')).rejects.toThrow('Bad signature');
  });
  it('handles absent optional role claims and username fallback',async()=>{
    prepare({name:undefined,preferred_username:'DEMO fallback'},{realm_access:undefined});
    const result=await exchange('code','v','expected','http://localhost/callback');expect(result.roles).toEqual([]);expect(result.name).toBe('DEMO fallback');
  });
  it('uses configured service URLs without exposing tokens to browser requests',async()=>{
    vi.stubEnv('OIDC_INTERNAL_ISSUER','http://identity:8080/realms/demo');expect(internalIssuer()).toContain('identity');
    vi.stubEnv('OIDC_ISSUER','https://identity.example/realm');expect(issuer()).toBe('https://identity.example/realm');
    vi.stubEnv('OIDC_CLIENT_ID','configured');expect(clientId()).toBe('configured');
    fetchMock.mockResolvedValue(new Response('{}'));await apiFetch('/v1/profile',session);
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer test-access');
    expect(fetchMock.mock.calls[0][1].cache).toBe('no-store');
  });
});
