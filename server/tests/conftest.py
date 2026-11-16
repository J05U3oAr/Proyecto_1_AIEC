import os

import pytest
from redis.asyncio import Redis
from redis.asyncio.retry import Retry
from redis.backoff import NoBackoff

from sofia.config import Settings
from sofia.storage import Budget, SessionStore


@pytest.fixture
def settings():
    # Never load .env in deterministic tests.
    return Settings(
        _env_file=None,
        nvidia_api_key="synthetic-test-only",
        redis_url="redis://localhost:16379/15",
    )


@pytest.fixture
async def redis():
    url = os.environ.get("REDIS_TEST_URL", "redis://localhost:16379/15")
    client = Redis.from_url(
        url,
        decode_responses=True,
        socket_connect_timeout=2,
        socket_timeout=2,
        retry=Retry(NoBackoff(), 0),
    )
    await client.ping()
    before = set([key async for key in client.scan_iter(match="sofia:*")])
    yield client
    after = set([key async for key in client.scan_iter(match="sofia:*")])
    added = after - before
    if added:
        await client.delete(*added)
    await client.aclose()


@pytest.fixture
def store(redis):
    return SessionStore(redis, ttl=1800, lease_seconds=70, max_history=20)


@pytest.fixture
def budget(redis):
    return Budget(redis, 1000)
