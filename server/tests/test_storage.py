import asyncio
from datetime import UTC, datetime

import pytest

from sofia.errors import PublicError
from sofia.models import ChatResponse
from sofia.storage import Budget, SessionStore


async def test_session_isolation_credentials_and_expiration(store):
    sid, token = await store.create()
    other_sid, other_token = await store.create()
    with pytest.raises(PublicError) as invalid:
        await store.begin(sid, other_token, "r", "hash")
    assert invalid.value.code == "invalid_session"
    first = await store.begin(sid, token, "r", "hash")
    await store.commit(first, "r", "hash", ChatResponse(response="Uno"), "Privado", {})
    other = await store.begin(other_sid, other_token, "r", "hash")
    assert other.conversation.history == []
    await store.release(other_sid, other.owner)
    await store.redis.delete(store.key(sid))
    with pytest.raises(PublicError) as expired:
        await store.begin(sid, token, "r", "hash")
    assert expired.value.code == "session_expired"


async def test_two_instances_deduplicate_and_serialize(store, redis):
    second_store = SessionStore(redis, ttl=1800, lease_seconds=70, max_history=20)
    sid, token = await store.create()
    first = await store.begin(sid, token, "r", "same")
    with pytest.raises(PublicError) as busy:
        await second_store.begin(sid, token, "r", "same")
    assert busy.value.code == "session_busy"
    response = ChatResponse(response="Guardado", sessionId=sid, requestId="r")
    await store.commit(first, "r", "same", response, "Hola", {"movies": []})
    cached = await second_store.begin(sid, token, "r", "same")
    assert cached.cached == response
    assert len(cached.conversation.history) == 2
    assert await redis.ttl(store.key(sid)) > 1700
    await second_store.release(sid, cached.owner)
    with pytest.raises(PublicError) as conflict:
        await store.begin(sid, token, "r", "different")
    assert conflict.value.code == "request_conflict"


async def test_atomic_commit_rejects_expired_lease_and_wrong_owner(store):
    sid, token = await store.create()
    reservation = await store.begin(sid, token, "r", "hash")
    await store.release(sid, "wrong-owner")
    assert await store.redis.get(f"{store.key(sid)}:lock") == reservation.owner
    await store.release(sid, reservation.owner)
    newer = await store.begin(sid, token, "r2", "hash")
    with pytest.raises(PublicError) as failure:
        await store.commit(reservation, "r", "hash", ChatResponse(response="Viejo"), "Hola", {})
    assert failure.value.code == "session_conflict"
    assert await store.redis.get(f"{store.key(sid)}:lock") == newer.owner
    await store.delete(newer)
    await store.release(sid, newer.owner)


async def test_history_and_idempotency_window_are_bounded(store):
    sid, token = await store.create()
    for index in range(23):
        reservation = await store.begin(sid, token, str(index), "hash")
        await store.commit(
            reservation,
            str(index),
            "hash",
            ChatResponse(response="Respuesta"),
            "Hola",
            {},
        )
    reservation = await store.begin(sid, token, "latest", "hash")
    assert len(reservation.conversation.history) == 20
    assert len(reservation.conversation.completed) == 20
    assert "0" not in reservation.conversation.completed
    await store.release(sid, reservation.owner)


async def test_budget_is_atomic_across_instances_and_expires(redis):
    limits = [Budget(redis, 3), Budget(redis, 3)]
    results = await asyncio.gather(
        *(limits[index % 2].take() for index in range(12)),
        return_exceptions=True,
    )
    assert sum(result is None for result in results) == 3
    assert all(isinstance(result, PublicError) for result in results if result is not None)
    key = f"sofia:budget:nvidia:{datetime.now(UTC):%Y-%m-%d}"
    assert await redis.get(key) == "3"
    assert 0 < await redis.ttl(key) <= 86400


async def test_traffic_limit(redis):
    budget = Budget(redis, 1000)
    for _ in range(60):
        await budget.throttle("test-client")
    with pytest.raises(PublicError) as failure:
        await budget.throttle("test-client")
    assert failure.value.code == "rate_limited"
    await budget.throttle("another-client")
