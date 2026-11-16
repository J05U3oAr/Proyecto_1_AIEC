"""Bounded offline load check: real Redis, two clients, synthetic upstream only."""

import argparse
import asyncio
import json
import math
import os
import time
from uuid import uuid4

from redis.asyncio import Redis

from catalog_common.cache import CatalogCache, CatalogError


async def benchmark(redis: Redis, requests: int = 40, concurrency: int = 8) -> dict[str, object]:
    if not 1 <= requests <= 200 or not 1 <= concurrency <= 32:
        raise ValueError("Benchmark limits: requests 1..200, concurrency 1..32")
    provider = f"benchmark-{uuid4().hex}"
    clients = [CatalogCache(redis, provider) for _ in range(2)]
    gate = asyncio.Semaphore(concurrency)
    timings: list[float] = []
    calls = 0
    errors = 0

    async def run(index: int) -> None:
        nonlocal calls, errors
        async with gate:
            started = time.perf_counter()
            cache = clients[index % 2]

            async def fetch() -> dict[str, object]:
                nonlocal calls
                await cache.take()
                calls += 1
                await asyncio.sleep(0.01)
                return {"synthetic": True}

            try:
                await cache.get(str(index % 5), fetch)
            except CatalogError:
                errors += 1
            timings.append((time.perf_counter() - started) * 1000)

    try:
        await asyncio.gather(*(run(i) for i in range(requests)))
        timings.sort()
        return {
            "mode": "synthetic_provider_real_redis",
            "requests": requests,
            "concurrency": concurrency,
            "cacheClients": 2,
            "processes": 1,
            "providerRequests": calls,
            "errors": errors,
            "p50Ms": round(timings[math.ceil(requests * 0.5) - 1], 3),
            "p95Ms": round(timings[math.ceil(requests * 0.95) - 1], 3),
        }
    finally:
        keys = [key async for key in redis.scan_iter(match=f"{clients[0].prefix}:*")]
        if keys:
            await redis.delete(*keys)


async def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--requests", type=int, default=40)
    parser.add_argument("--concurrency", type=int, default=8)
    args = parser.parse_args()
    redis = Redis.from_url(
        os.environ.get("CATALOG_TEST_REDIS_URL", "redis://localhost:16379/14"),
        decode_responses=True,
        socket_connect_timeout=2,
        socket_timeout=2,
    )
    try:
        result = await benchmark(redis, args.requests, args.concurrency)
        print(json.dumps(result))
        return 0 if result["errors"] == 0 else 1
    finally:
        await redis.aclose()


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
