import {describe,expect,it,vi} from 'vitest';
const mock=vi.hoisted(()=>({eval:vi.fn(),on:vi.fn()}));
vi.mock('ioredis',()=>({default:class{eval=mock.eval;on=mock.on;}}));
import {redis,rateLimit} from '../src/lib/redis';
describe('Redis rate limiter',()=>{
  it('reuses one lazy connection with a sanitized error listener',()=>{
    expect(redis()).toBe(redis());expect(mock.on).toHaveBeenCalledWith('error',expect.any(Function));
    const log=vi.spyOn(console,'error').mockImplementation(()=>{});
    mock.on.mock.calls[0][1](new Error('redis://sensitive-credentials'));
    expect(log).toHaveBeenCalledWith('{"event":"redis_unavailable"}');log.mockRestore();
  });
  it('accepts only successful Lua decisions and propagates outages',async()=>{
    mock.eval.mockResolvedValueOnce(1);expect(await rateLimit('test')).toBe(true);
    mock.eval.mockResolvedValueOnce(0);expect(await rateLimit('test',2)).toBe(false);
    expect(mock.eval.mock.calls[1][2]).toBe('web:rate:test');expect(mock.eval.mock.calls[1][3]).toBe(2);
    mock.eval.mockRejectedValueOnce(new Error('offline'));await expect(rateLimit('test')).rejects.toThrow('offline');
  });
});
