import uuid
from typing import Protocol, cast

SLIDING_WINDOW = """
local now = redis.call('TIME')
local stamp = now[1] * 1000 + math.floor(now[2] / 1000)
local window = tonumber(ARGV[1]) * 1000
redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', stamp - window)
if redis.call('ZCARD', KEYS[1]) >= tonumber(ARGV[2]) then return 0 end
redis.call('ZADD', KEYS[1], stamp, ARGV[3])
redis.call('EXPIRE', KEYS[1], ARGV[1])
return 1
"""


class RedisCommands(Protocol):
    async def eval(self, script: str, numkeys: int, *args: str) -> object: ...


async def allowed(redis: RedisCommands, key: str, limit: int, window: int) -> bool:
    result = await redis.eval(SLIDING_WINDOW, 1, key, str(window), str(limit), uuid.uuid4().hex)
    return cast(int, result) == 1
