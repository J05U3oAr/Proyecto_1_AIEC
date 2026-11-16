import asyncio
import uuid
from pathlib import Path

import pytest

from catalog_common.cache import CatalogCache, CatalogError

CATALOG_ROOT = str(Path(__file__).resolve().parents[1])


async def test_shared_quota_is_atomic_and_cache_does_not_spend(cache_redis):
    name = "test-" + uuid.uuid4().hex
    a = CatalogCache(cache_redis, name, daily_limit=2)
    b = CatalogCache(cache_redis, name, daily_limit=2)
    calls = 0

    async def fetch():
        nonlocal calls
        await a.take()
        calls += 1
        await asyncio.sleep(0.02)
        return {"ok": True}

    assert await asyncio.gather(a.get("same", fetch), b.get("same", fetch)) == [
        {"ok": True},
        {"ok": True},
    ]
    assert calls == 1
    await a.get("other", fetch)
    with pytest.raises(CatalogError, match="quota_exhausted"):
        await b.get("third", fetch)
    assert calls == 2


async def test_expiry_failure_unlock_and_cooldown(cache_redis):
    cache = CatalogCache(cache_redis, "test-" + uuid.uuid4().hex, daily_limit=10, ttl=1)

    async def fail():
        raise CatalogError("provider_unavailable", retryable=True)

    with pytest.raises(CatalogError):
        await cache.get("same", fail)
    assert await cache.get("same", lambda: asyncio.sleep(0, result={"v": 1})) == {"v": 1}
    await asyncio.sleep(1.05)
    assert await cache.get("same", lambda: asyncio.sleep(0, result={"v": 2})) == {"v": 2}
    await cache.cooldown(10)
    with pytest.raises(CatalogError, match="provider_rate_limited"):
        await cache.take()


async def test_quota_shared_between_distinct_requests(cache_redis):
    provider = "test-" + uuid.uuid4().hex
    caches = [CatalogCache(cache_redis, provider, daily_limit=3) for _ in range(2)]
    results = await asyncio.gather(
        *(caches[i % 2].take() for i in range(20)), return_exceptions=True
    )
    assert sum(result is None for result in results) == 3
    assert all(result is None or isinstance(result, CatalogError) for result in results)


async def test_quota_uses_redis_utc_day_and_cooldown_never_shortens(cache_redis):
    cache = CatalogCache(cache_redis, "test-" + uuid.uuid4().hex, daily_limit=1)
    await cache_redis.hset(cache.prefix + ":quota", mapping={"day": "-1", "spent": "1000"})
    await cache.take()
    assert 0 < await cache_redis.ttl(cache.prefix + ":quota") <= 86400
    with pytest.raises(CatalogError, match="quota_exhausted"):
        await cache.take()
    await cache.cooldown(20)
    await cache.cooldown(1)
    assert await cache_redis.ttl(cache.prefix + ":cooldown") > 1


@pytest.mark.parametrize(
    "provider,limit,ttl", [("bad:namespace", 1, 1), ("tmdb", 0, 1), ("tmdb", 1, 0)]
)
def test_cache_config_rejects_invalid_limits(provider, limit, ttl, cache_redis):
    with pytest.raises(ValueError):
        CatalogCache(cache_redis, provider, limit, ttl)


async def test_cache_fail_closed_and_corruption(cache_redis, monkeypatch):
    from redis.exceptions import ConnectionError

    cache = CatalogCache(cache_redis, "test-" + uuid.uuid4().hex)

    async def broken(*args, **kwargs):
        raise ConnectionError("synthetic-private-redis-error")

    monkeypatch.setattr(cache_redis, "get", broken)
    with pytest.raises(CatalogError, match="storage_unavailable"):
        await cache.get("key", lambda: asyncio.sleep(0, result={}))
    monkeypatch.setattr(cache_redis, "ttl", broken)
    with pytest.raises(CatalogError, match="storage_unavailable"):
        await cache.take()
    monkeypatch.setattr(cache_redis, "eval", broken)
    with pytest.raises(CatalogError, match="storage_unavailable"):
        await cache.cooldown(1)


async def test_corrupt_cached_data_and_oversized_result(cache_redis):
    import hashlib

    cache = CatalogCache(cache_redis, "test-" + uuid.uuid4().hex)
    key = cache.prefix + ":cache:" + hashlib.sha256(b"key").hexdigest()
    await cache_redis.set(key, "[]")
    with pytest.raises(CatalogError, match="invalid_cached_result"):
        await cache.get("key", lambda: asyncio.sleep(0, result={}))
    with pytest.raises(CatalogError, match="invalid_provider_result"):
        await cache.get("large", lambda: asyncio.sleep(0, result={"text": "x" * 1048577}))


async def test_busy_requests_do_not_duplicate_provider(cache_redis, monkeypatch):
    import hashlib
    from unittest.mock import AsyncMock

    cache = CatalogCache(cache_redis, "test-" + uuid.uuid4().hex)
    key = cache.prefix + ":cache:" + hashlib.sha256(b"key").hexdigest() + ":lock"
    await cache_redis.set(key, "another-replica", ex=60)
    monkeypatch.setattr("catalog_common.cache.asyncio.sleep", AsyncMock())
    with pytest.raises(CatalogError, match="catalog_busy"):
        await cache.get("key", lambda: asyncio.sleep(0, result={}))


async def test_budget_is_shared_between_separate_processes(cache_redis):
    import os
    import sys

    namespace = "test-" + uuid.uuid4().hex
    code = """
import asyncio, os
from redis.asyncio import Redis
from catalog_common.cache import CatalogCache,CatalogError
async def main():
 r=Redis.from_url(os.environ['CATALOG_TEST_REDIS_URL'],decode_responses=True)
 c=CatalogCache(r,os.environ['TEST_CATALOG_NAMESPACE'],daily_limit=7)
 count=0
 try:
  for _ in range(15):
   try:
    await c.take()
    count+=1
   except CatalogError:
    pass
  print(count)
 finally:
  await r.aclose()
asyncio.run(main())
"""
    env = {
        **os.environ,
        "PYTHONPATH": CATALOG_ROOT,
        "CATALOG_TEST_REDIS_URL": os.environ.get(
            "CATALOG_TEST_REDIS_URL", "redis://localhost:16379/14"
        ),
        "TEST_CATALOG_NAMESPACE": namespace,
    }
    children = [
        await asyncio.create_subprocess_exec(
            sys.executable, "-c", code, env=env, stdout=asyncio.subprocess.PIPE
        )
        for _ in range(2)
    ]
    outputs = await asyncio.gather(*(child.communicate() for child in children))
    assert all(child.returncode == 0 for child in children)
    assert sum(int(output[0]) for output in outputs) == 7


async def test_replicas_cannot_raise_another_replicas_stricter_daily_limit(cache_redis):
    namespace = "test-" + uuid.uuid4().hex
    strict = CatalogCache(cache_redis, namespace, daily_limit=1)
    loose = CatalogCache(cache_redis, namespace, daily_limit=1000)
    await strict.take()
    with pytest.raises(CatalogError, match="quota_exhausted"):
        await loose.take()
