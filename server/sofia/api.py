import asyncio
import hashlib
import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from time import monotonic
from uuid import uuid4

import httpx
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from pydantic import TypeAdapter
from redis.asyncio import Redis
from redis.asyncio.retry import Retry
from redis.backoff import NoBackoff
from redis.exceptions import RedisError
from starlette.middleware.base import RequestResponseEndpoint
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from sofia.adapters import NvidiaLLM, RemoteMCP
from sofia.agent import Agent
from sofia.config import Settings
from sofia.errors import PublicError
from sofia.models import ChatRequest, ErrorBody, Identifier
from sofia.storage import Budget, SessionStore

log = logging.getLogger("sofia.events")


class BodyLimit:
    def __init__(self, app: ASGIApp, limit: int) -> None:
        self.app, self.limit = app, limit

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http" or scope["method"] not in {"POST", "PUT", "PATCH"}:
            await self.app(scope, receive, send)
            return
        body = bytearray()
        while True:
            event = await receive()
            if event["type"] == "http.disconnect":
                return
            body.extend(event.get("body", b""))
            if len(body) > self.limit:
                response = JSONResponse(
                    {
                        "code": "input_too_large",
                        "message": "El mensaje supera el tamaño permitido.",
                        "retryable": False,
                        "requestId": scope.get("state", {}).get("request_id", str(uuid4())),
                    },
                    status_code=413,
                )
                await response(scope, receive, send)
                return
            if not event.get("more_body", False):
                break
        delivered = False

        async def replay() -> Message:
            nonlocal delivered
            if not delivered:
                delivered = True
                return {"type": "http.request", "body": bytes(body), "more_body": False}
            return await receive()

        await self.app(scope, replay, send)


def create_app(
    settings: Settings | None = None,
    agent: Agent | None = None,
    sessions: SessionStore | None = None,
    budget: Budget | None = None,
) -> FastAPI:
    config = settings or Settings()
    redis = Redis.from_url(
        config.redis_url.get_secret_value(),
        decode_responses=True,
        socket_connect_timeout=2,
        socket_timeout=2,
        retry=Retry(NoBackoff(), 0),
    )
    http = httpx.AsyncClient(follow_redirects=False, trust_env=False)
    store = sessions or SessionStore(
        redis,
        config.session_ttl,
        int(config.turn_timeout) + 10,
        config.max_history,
    )
    quota = budget or Budget(redis, config.llm_daily_budget)
    runner = agent or Agent(config, NvidiaLLM(config, http), RemoteMCP(config), quota)

    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncIterator[None]:
        yield
        await http.aclose()
        await redis.aclose()

    app = FastAPI(title="Sofía backend", version="0.1.0", lifespan=lifespan)
    app.add_middleware(BodyLimit, limit=config.request_body_limit)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=config.allowed_origins,
        allow_methods=["POST", "DELETE", "GET"],
        allow_headers=["Content-Type", "X-Session-Token"],
        expose_headers=["X-Session-Token", "X-Request-Id", "Retry-After"],
    )

    @app.middleware("http")
    async def request_metadata(request: Request, call_next: RequestResponseEndpoint) -> Response:
        request.state.request_id = str(uuid4())
        started = monotonic()
        try:
            response = await call_next(request)
        except Exception:
            # Sanitized boundary; never log exception messages, provider bodies or inputs.
            log.error("request_failed request_id=%s", request.state.request_id)
            response = JSONResponse(
                {
                    "code": "internal_error",
                    "message": "No pude completar la solicitud.",
                    "retryable": False,
                    "requestId": request.state.request_id,
                },
                status_code=500,
            )
        response.headers["X-Request-Id"] = request.state.request_id
        log.info(
            "request_done request_id=%s status=%s latency_ms=%d",
            request.state.request_id,
            response.status_code,
            (monotonic() - started) * 1000,
        )
        return response

    @app.exception_handler(PublicError)
    async def public_error(request: Request, exc: PublicError) -> JSONResponse:
        log.info(
            "turn_failed request_id=%s code=%s tools=%s usage=%s",
            request.state.request_id,
            exc.code,
            [(event.get("tool"), event.get("status")) for event in exc.trace],
            exc.usage,
        )
        body = ErrorBody(
            code=exc.code,
            message=exc.message,
            retryable=exc.retryable,
            requestId=request.state.request_id,
        )
        headers = {"Retry-After": str(exc.retry_after)} if exc.retry_after is not None else None
        return JSONResponse(body.model_dump(), status_code=exc.status, headers=headers)

    @app.exception_handler(RequestValidationError)
    async def invalid_request(request: Request, _: RequestValidationError) -> JSONResponse:
        return JSONResponse(
            {
                "code": "invalid_request",
                "message": "Revisa el formato del mensaje.",
                "retryable": False,
                "requestId": request.state.request_id,
            },
            status_code=422,
        )

    @app.exception_handler(RedisError)
    async def storage_error(request: Request, _: RedisError) -> JSONResponse:
        return JSONResponse(
            {
                "code": "storage_unavailable",
                "message": "El servicio de sesiones no está disponible.",
                "retryable": True,
                "requestId": request.state.request_id,
            },
            status_code=503,
        )

    @app.get("/health/live")
    async def live() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/health/ready")
    async def ready() -> dict[str, str]:
        await store.redis.ping()
        return {"status": "ok"}

    @app.post("/api/chat")
    async def chat(payload: ChatRequest, request: Request) -> JSONResponse:
        request_id = payload.requestId or request.state.request_id
        request.state.request_id = request_id
        await quota.throttle(request.client.host if request.client else "unknown")
        token = request.headers.get("X-Session-Token", "")
        if len(token) > 128 or bool(payload.sessionId) != bool(token):
            raise PublicError("invalid_session", "Envía la sesión y su credencial juntas.", 401)
        is_new = payload.sessionId is None
        session_id = payload.sessionId
        if session_id is None:
            session_id, token = await store.create()
        fingerprint = hashlib.sha256(
            payload.model_dump_json(exclude={"sessionId", "requestId"}).encode()
        ).hexdigest()
        reservation = await store.begin(session_id, token, request_id, fingerprint)
        succeeded = False
        try:
            if reservation.cached:
                response = reservation.cached
            else:
                try:
                    turn = await runner.run(
                        payload,
                        reservation.conversation.history,
                        reservation.conversation.context,
                        request_id,
                    )
                except TimeoutError as exc:
                    raise PublicError(
                        "turn_timeout", "La consulta tardó demasiado.", 504, True
                    ) from exc
                response = turn.response.model_copy(update={"sessionId": session_id})
                await store.commit(
                    reservation, request_id, fingerprint, response, payload.prompt, turn.context
                )
                log.info(
                    "turn_done request_id=%s tools=%s usage=%s",
                    request_id,
                    [(event.get("tool"), event.get("status")) for event in turn.trace],
                    turn.usage,
                )
            succeeded = True
            return JSONResponse(
                response.model_dump(exclude_none=True), headers={"X-Session-Token": token}
            )
        finally:
            await asyncio.shield(store.release(session_id, reservation.owner))
            if is_new and not succeeded:
                await asyncio.shield(store.redis.delete(store.key(session_id)))

    @app.delete("/api/session/{session_id}", status_code=204)
    async def clear(session_id: str, request: Request) -> Response:
        try:
            TypeAdapter(Identifier).validate_python(session_id)
        except ValueError as exc:
            raise PublicError("invalid_session", "La sesión no está autorizada.", 401) from exc
        token = request.headers.get("X-Session-Token", "")
        reservation = await store.begin(session_id, token, str(uuid4()), "delete")
        try:
            await store.delete(reservation)
        finally:
            await store.release(session_id, reservation.owner)
        return Response(status_code=204)

    return app
