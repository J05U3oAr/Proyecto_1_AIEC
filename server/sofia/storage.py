import hashlib
import hmac
import json
import secrets
from collections.abc import Awaitable
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import cast

from redis.asyncio import Redis

from sofia.errors import PublicError
from sofia.models import ChatResponse

COMMIT = """
if redis.call('GET', KEYS[1]) ~= ARGV[1] then return 0 end
if redis.call('EXISTS', KEYS[2]) == 0 then return 0 end
redis.call('SET', KEYS[2], ARGV[2], 'EX', ARGV[3])
redis.call('DEL', KEYS[1])
return 1
"""
UNLOCK = """
if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) end
return 0
"""
SPEND = """
local current = tonumber(redis.call('GET', KEYS[1]) or '0')
if current >= tonumber(ARGV[1]) then return 0 end
redis.call('INCR', KEYS[1])
redis.call('EXPIRE', KEYS[1], ARGV[2])
return 1
"""


@dataclass
class Conversation:
    token_hash: str
    history: list[dict[str, str]]
    context: dict[str, object]
    completed: dict[str, dict[str, str]]


@dataclass
class Reservation:
    session_id: str
    owner: str
    conversation: Conversation
    cached: ChatResponse | None = None


class SessionStore:
    def __init__(self, redis: Redis, ttl: int, lease_seconds: int, max_history: int) -> None:
        self.redis = redis
        self.ttl = ttl
        self.lease_seconds = lease_seconds
        self.max_history = max_history

    @staticmethod
    def key(session_id: str) -> str:
        # Shared hash tag keeps atomic scripts compatible with Redis Cluster.
        return f"sofia:session:{{{session_id}}}"

    async def create(self) -> tuple[str, str]:
        session_id, token = secrets.token_urlsafe(24), secrets.token_urlsafe(32)
        data = {
            "token_hash": hashlib.sha256(token.encode()).hexdigest(),
            "history": [],
            "context": {},
            "completed": {},
        }
        created = await self.redis.set(self.key(session_id), json.dumps(data), ex=self.ttl, nx=True)
        if not created:
            raise PublicError("session_unavailable", "No pude crear la sesión.", retryable=True)
        return session_id, token

    async def begin(
        self,
        session_id: str,
        token: str,
        request_id: str,
        fingerprint: str,
    ) -> Reservation:
        key = self.key(session_id)
        owner = secrets.token_urlsafe(24)
        if not await self.redis.set(f"{key}:lock", owner, ex=self.lease_seconds, nx=True):
            raise PublicError("session_busy", "Hay una solicitud en curso.", 409, True)
        try:
            raw = await self.redis.get(key)
            if raw is None:
                raise PublicError("session_expired", "La sesión expiró; inicia otra.", 401)
            data = json.loads(raw)
            digest = hashlib.sha256(token.encode()).hexdigest()
            if not hmac.compare_digest(digest, data["token_hash"]):
                raise PublicError("invalid_session", "La sesión no está autorizada.", 401)
            conversation = Conversation(**data)
            reservation = Reservation(session_id, owner, conversation)
            previous = conversation.completed.get(request_id)
            if previous:
                if previous["fingerprint"] != fingerprint:
                    raise PublicError("request_conflict", "El ID ya se usó con otro mensaje.", 409)
                reservation.cached = ChatResponse.model_validate_json(previous["response"])
            return reservation
        except BaseException:
            await self.release(session_id, owner)
            raise

    async def commit(
        self,
        reservation: Reservation,
        request_id: str,
        fingerprint: str,
        response: ChatResponse,
        prompt: str,
        context: dict[str, object],
    ) -> None:
        conversation = reservation.conversation
        conversation.history.extend(
            [
                {"role": "user", "content": prompt},
                {"role": "assistant", "content": response.response},
            ]
        )
        conversation.history = conversation.history[-self.max_history :]
        conversation.context = context
        conversation.completed[request_id] = {
            "fingerprint": fingerprint,
            "response": response.model_dump_json(),
        }
        conversation.completed = dict(list(conversation.completed.items())[-20:])
        payload = json.dumps(
            {
                "token_hash": conversation.token_hash,
                "history": conversation.history,
                "context": conversation.context,
                "completed": conversation.completed,
            }
        )
        saved = await cast(
            Awaitable[int],
            self.redis.eval(
                COMMIT,
                2,
                f"{self.key(reservation.session_id)}:lock",
                self.key(reservation.session_id),
                reservation.owner,
                payload,
                str(self.ttl),
            ),
        )
        if not saved:
            raise PublicError("session_conflict", "La sesión cambió; inicia otra solicitud.", 409)

    async def release(self, session_id: str, owner: str) -> None:
        await cast(
            Awaitable[int], self.redis.eval(UNLOCK, 1, f"{self.key(session_id)}:lock", owner)
        )

    async def delete(self, reservation: Reservation) -> None:
        await self.redis.delete(self.key(reservation.session_id))


class Budget:
    def __init__(self, redis: Redis, daily_limit: int) -> None:
        self.redis = redis
        self.daily_limit = daily_limit

    async def take(self) -> None:
        now = datetime.now(UTC)
        midnight = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
        ttl = max(1, int((midnight - now).total_seconds()))
        key = f"sofia:budget:nvidia:{now:%Y-%m-%d}"
        if not await cast(
            Awaitable[int], self.redis.eval(SPEND, 1, key, str(self.daily_limit), str(ttl))
        ):
            raise PublicError("quota_exhausted", "Se agotó el presupuesto diario.", 429, True, ttl)

    async def throttle(self, client: str) -> None:
        digest = hashlib.sha256(client.encode()).hexdigest()
        minute = int(datetime.now(UTC).timestamp()) // 60
        key = f"sofia:rate:{digest}:{minute}"
        if not await cast(Awaitable[int], self.redis.eval(SPEND, 1, key, "60", "60")):
            raise PublicError(
                "rate_limited", "Espera antes de enviar otra solicitud.", 429, True, 60
            )
