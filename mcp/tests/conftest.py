import os

import pytest
from redis.asyncio import Redis


@pytest.fixture
async def cache_redis():
    client = Redis.from_url(
        os.environ.get("CATALOG_TEST_REDIS_URL", "redis://localhost:16379/14"),
        decode_responses=True,
        socket_connect_timeout=2,
        socket_timeout=2,
    )
    await client.ping()
    before = set([key async for key in client.scan_iter(match="sofia:catalog:*")])
    yield client
    after = set([key async for key in client.scan_iter(match="sofia:catalog:*")])
    added = after - before
    if added:
        await client.delete(*added)
    await client.aclose()
