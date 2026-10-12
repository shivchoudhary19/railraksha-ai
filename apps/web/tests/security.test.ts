import {describe,it,expect} from 'vitest';
import {csrfMatches,pkceChallenge,randomSecret,trustedOrigin,secureCookies,appOrigin} from '../src/lib/security';
import {canOperate,profileSchema,safeReturnPath} from '../../../packages/schemas/src';
describe('authorization and input boundaries',()=>{
  it.each(['citizen','student','asset_owner','partner_dev','verified_reporter'])('denies operator access for %s',role=>expect(canOperate([role])).toBe(false));
  it.each(['analyst','soc_lead','rpf_cyber','admin','super_admin'])('accepts assigned %s',role=>expect(canOperate([role])).toBe(true));
  it.each(['//evil.example','https://evil.example','/en/../../secret','/en/dashboard?redirect=evil','/hi/arbitrary'])('rejects unsafe return path %s',path=>expect(safeReturnPath(path)).toBe('/en/dashboard'));
  it('accepts only account return paths',()=>{expect(safeReturnPath('/hi/profile')).toBe('/hi/profile');expect(safeReturnPath(null)).toBe('/en/dashboard');});
  it('rejects privilege injection and markup',()=>{expect(profileSchema.safeParse({display_name:'Demo',language:'en',roles:['admin']}).success).toBe(false);expect(profileSchema.safeParse({display_name:'<script>',language:'en'}).success).toBe(false);expect(profileSchema.safeParse({display_name:'  ',language:'en'}).success).toBe(false);expect(profileSchema.safeParse({display_name:'डेमो',language:'hi'}).success).toBe(true);});
});
describe('OIDC and CSRF primitives',()=>{
  it('generates independent high-entropy values',()=>{const a=randomSecret();expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);expect(a).not.toBe(randomSecret());});
  it('matches RFC 7636 PKCE test vector',()=>expect(pkceChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM'));
  it('checks csrf tokens',()=>{expect(csrfMatches('correct','correct')).toBe(true);for(const value of [null,undefined,'','incorrect','wrong!!'])expect(csrfMatches('correct',value)).toBe(false);expect(csrfMatches('é','aa')).toBe(false);expect(csrfMatches('','')).toBe(false);});
  it('checks an exact origin',()=>{expect(trustedOrigin('https://app.example','https://app.example/path')).toBe(true);expect(trustedOrigin('https://app.example.evil','https://app.example')).toBe(false);expect(trustedOrigin(null,'https://app.example')).toBe(false);});
  it('requires TLS for production',()=>{const before={...process.env};process.env.SESSION_COOKIE_SECURE='true';expect(secureCookies()).toBe(true);process.env.APP_ENV='production';process.env.APP_ORIGIN='http://localhost';expect(()=>appOrigin()).toThrow();process.env.APP_ORIGIN='https://app.example';expect(appOrigin()).toBe('https://app.example');process.env=before;});
});
