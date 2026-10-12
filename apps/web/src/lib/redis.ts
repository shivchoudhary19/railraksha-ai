import Redis from 'ioredis';
const globalRedis=globalThis as typeof globalThis & {railRedis?:Redis};
export function redis(){
  if(!globalRedis.railRedis){
    globalRedis.railRedis=new Redis(process.env.REDIS_URL??'redis://localhost:6379',{lazyConnect:true,maxRetriesPerRequest:1,connectTimeout:2000,retryStrategy:()=>null});
    globalRedis.railRedis.on('error',()=>console.error(JSON.stringify({event:'redis_unavailable'})));
  }
  return globalRedis.railRedis;
}
export async function rateLimit(key:string,limit=30):Promise<boolean>{
  try{
    const result=await redis().eval(`local t=redis.call('TIME');local n=t[1]*1000+math.floor(t[2]/1000);redis.call('ZREMRANGEBYSCORE',KEYS[1],'-inf',n-60000);if redis.call('ZCARD',KEYS[1])>=tonumber(ARGV[1]) then return 0 end;redis.call('ZADD',KEYS[1],n,ARGV[2]);redis.call('EXPIRE',KEYS[1],60);return 1`,1,`web:rate:${key}`,limit,crypto.randomUUID());
    return result===1;
  }catch{
    return true; // Graceful fail-open when Redis is unavailable or unconfigured in serverless
  }
}

