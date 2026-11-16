"""Shared quotas and single-flight caching. Redis failure always fails closed."""

import asyncio
import hashlib
import json
import re
import secrets
from collections.abc import Awaitable, Callable
from typing import cast

from redis.asyncio import Redis
from redis.exceptions import RedisError

TAKE = """
local now = tonumber(redis.call('TIME')[1])
local day = math.floor(now / 86400)
if redis.call('HGET', KEYS[1], 'day') ~= tostring(day) then
  redis.call('HSET', KEYS[1], 'day', day, 'spent', 0, 'limit', ARGV[1])
end
local limit = math.min(tonumber(ARGV[1]),
    tonumber(redis.call('HGET', KEYS[1], 'limit') or ARGV[1]))
redis.call('HSET', KEYS[1], 'limit', limit)
local remaining = (day + 1) * 86400 - now
if tonumber(redis.call('HGET', KEYS[1], 'spent')) >= limit then
  return remaining
end
redis.call('HINCRBY', KEYS[1], 'spent', 1)
redis.call('EXPIREAT', KEYS[1], (day + 1) * 86400)
return 0
"""
RELEASE = """
if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) end
return 0
"""


class CatalogError(Exception):
    def __init__(self, code: str, retryable: bool = False, retry_after: int = 0) -> None:
        super().__init__(code)
        self.code = code
        self.retryable = retryable
        self.retry_after = retry_after


class CatalogCache:
    def __init__(
        self, redis: Redis, provider: str, daily_limit: int = 1000, ttl: int = 3600
    ) -> None:
        if not re.fullmatch(r"[a-z][a-z0-9_-]{1,64}", provider):
            raise ValueError("Invalid provider namespace")
        if not 1 <= daily_limit <= 1000 or not 1 <= ttl <= 86400:
            raise ValueError("Invalid catalog limits")
        self.redis = redis
        self.prefix = f"sofia:catalog:{{{provider}}}"
        self.daily_limit = daily_limit
        self.ttl = ttl

    async def take(self) -> None:
        try:
            wait = await self.redis.ttl(f"{self.prefix}:cooldown")
            if wait > 0:
                raise CatalogError("provider_rate_limited", True, wait)
            remaining = await cast(
                Awaitable[int],
                self.redis.eval(TAKE, 1, f"{self.prefix}:quota", str(self.daily_limit)),
            )
            if remaining:
                raise CatalogError("quota_exhausted", True, remaining)
        except RedisError:
            raise CatalogError("storage_unavailable", True) from None

    async def cooldown(self, seconds: int) -> None:
        # Concurrent 429s may extend but must never shorten a shared cooldown.
        try:
            await cast(
                Awaitable[int],
                self.redis.eval(
                    "local t=redis.call('TTL',KEYS[1]); "
                    "if t < tonumber(ARGV[1]) then "
                    "redis.call('SET',KEYS[1],'1','EX',ARGV[1]) end; return 1",
                    1,
                    f"{self.prefix}:cooldown",
                    str(max(1, min(seconds, 86400))),
                ),
            )
        except RedisError:
            raise CatalogError("storage_unavailable", True) from None

    async def get(
        self, key: str, fetch: Callable[[], Awaitable[dict[str, object]]]
    ) -> dict[str, object]:
        digest = hashlib.sha256(key.encode()).hexdigest()
        cache_key = f"{self.prefix}:cache:{digest}"
        lock_key = f"{cache_key}:lock"
        owner = secrets.token_hex(16)
        try:
            # Wait at most two seconds for another replica; never duplicate its request.
            for _ in range(41):
                raw = await self.redis.get(cache_key)
                if raw is not None:
                    result = json.loads(raw)
                    if not isinstance(result, dict):
                        raise CatalogError("invalid_cached_result")
                    return cast(dict[str, object], result)
                if await self.redis.set(lock_key, owner, nx=True, ex=60):
                    break
                await asyncio.sleep(0.05)
            else:
                raise CatalogError("catalog_busy", True, 2)
            try:
                # Recheck after acquiring the lock: a previous owner may have just saved.
                raw = await self.redis.get(cache_key)
                if raw is not None:
                    return cast(dict[str, object], json.loads(raw))
                result = await fetch()
                encoded = json.dumps(result, ensure_ascii=False)
                if len(encoded.encode()) > 1048576:
                    raise CatalogError("invalid_provider_result")
                await self.redis.set(cache_key, encoded, ex=self.ttl)
                return result
            finally:
                await cast(Awaitable[int], self.redis.eval(RELEASE, 1, lock_key, owner))
        except (RedisError, ValueError, TypeError):
            raise CatalogError("storage_unavailable", True) from None
