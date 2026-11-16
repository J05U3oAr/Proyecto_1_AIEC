import asyncio
from contextlib import asynccontextmanager

import httpx
import pytest
from redis.exceptions import ConnectionError

from sofia.agent import TurnResult
from sofia.api import BodyLimit, create_app
from sofia.errors import PublicError
from sofia.models import ChatResponse


class Runner:
    def __init__(self):
        self.calls = []
        self.error = None
        self.wait = None

    async def run(self, payload, history, context, request_id):
        self.calls.append((payload, list(history), context))
        if self.error:
            raise self.error
        if self.wait:
            await self.wait.wait()
        return TurnResult(ChatResponse(response="Respuesta de prueba", requestId=request_id), {})


@asynccontextmanager
async def client_for(settings, store, budget, runner):
    app = create_app(settings, runner, store, budget)
    async with app.router.lifespan_context(app):
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app, raise_app_exceptions=False),
            base_url="http://test",
        ) as client:
            yield client


async def test_legacy_session_followup_and_idempotent_replay(settings, store, budget):
    runner = Runner()
    async with client_for(settings, store, budget, runner) as client:
        first = await client.post("/api/chat", json={"prompt": "Hola"})
        assert first.status_code == 200
        assert first.json()["response"] == "Respuesta de prueba"
        sid = first.json()["sessionId"]
        token = first.headers["X-Session-Token"]
        assert token not in first.text
        payload = {"prompt": "Otra pregunta", "sessionId": sid, "requestId": "stable"}
        second = await client.post("/api/chat", json=payload, headers={"X-Session-Token": token})
        repeated = await client.post("/api/chat", json=payload, headers={"X-Session-Token": token})
        assert second.status_code == repeated.status_code == 200
        assert second.json() == repeated.json()
        assert len(runner.calls) == 2
        assert runner.calls[1][1][0]["content"] == "Hola"
        conflict = await client.post(
            "/api/chat", json={**payload, "prompt": "Cambio"}, headers={"X-Session-Token": token}
        )
        assert conflict.status_code == 409
        reset = await client.delete(f"/api/session/{sid}", headers={"X-Session-Token": token})
        assert reset.status_code == 204
        expired = await client.post("/api/chat", json=payload, headers={"X-Session-Token": token})
        assert expired.status_code == 401


async def test_unrelated_clients_have_no_history_and_wrong_token_is_rejected(
    settings, store, budget
):
    runner = Runner()
    async with client_for(settings, store, budget, runner) as client:
        one = await client.post("/api/chat", json={"prompt": "Privado uno"})
        two = await client.post("/api/chat", json={"prompt": "Privado dos"})
        assert one.json()["sessionId"] != two.json()["sessionId"]
        assert runner.calls[0][1] == runner.calls[1][1] == []
        result = await client.post(
            "/api/chat",
            json={
                "prompt": "Leer otro",
                "sessionId": one.json()["sessionId"],
            },
            headers={"X-Session-Token": two.headers["X-Session-Token"]},
        )
        assert result.status_code == 401
        assert len(runner.calls) == 2


@pytest.mark.parametrize(
    "payload,headers",
    [
        ({"prompt": "Hola", "sessionId": "s"}, {}),
        ({"prompt": "Hola"}, {"X-Session-Token": "token"}),
        ({"prompt": "Hola", "sessionId": "s"}, {"X-Session-Token": "x" * 129}),
    ],
)
async def test_session_credential_pair(settings, store, budget, payload, headers):
    async with client_for(settings, store, budget, Runner()) as client:
        result = await client.post("/api/chat", json=payload, headers=headers)
        assert result.status_code == 401


@pytest.mark.parametrize(
    "payload",
    [
        {"prompt": ""},
        {"prompt": "x" * 4001},
        {"prompt": "Hola", "role": "system"},
        {"prompt": "Hola", "sessionId": "../unsafe"},
    ],
)
async def test_invalid_payload_is_sanitized(settings, store, budget, payload):
    async with client_for(settings, store, budget, Runner()) as client:
        result = await client.post("/api/chat", json=payload)
        assert result.status_code == 422
        assert "input" not in result.json()
        assert result.json()["requestId"] == result.headers["X-Request-Id"]


async def test_body_limits_malformed_json_and_cors(settings, store, budget):
    async with client_for(settings, store, budget, Runner()) as client:
        large = await client.post(
            "/api/chat", content=b"x" * 17000, headers={"Content-Type": "application/json"}
        )
        assert large.status_code == 413
        broken = await client.post(
            "/api/chat", content=b"{secret", headers={"Content-Type": "application/json"}
        )
        assert broken.status_code == 422
        assert "secret" not in broken.text
        cors = await client.options(
            "/api/chat",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "X-Session-Token",
            },
        )
        assert cors.status_code == 200
        forbidden = await client.options(
            "/api/chat",
            headers={
                "Origin": "https://evil.example",
                "Access-Control-Request-Method": "POST",
            },
        )
        assert forbidden.status_code == 400
        assert (await client.get("/health/live")).json() == {"status": "ok"}
        assert (await client.get("/health/ready")).status_code == 200
        assert (await client.get("/openapi.json")).status_code == 200


@pytest.mark.parametrize(
    "error,status,code",
    [
        (
            PublicError("provider_rate_limited", "Espera.", 429, True, 9),
            429,
            "provider_rate_limited",
        ),
        (TimeoutError(), 504, "turn_timeout"),
        (ConnectionError("synthetic-internal-secret"), 503, "storage_unavailable"),
        (RuntimeError("synthetic-internal-secret"), 500, "internal_error"),
    ],
)
async def test_failures_never_leak_and_new_failed_session_is_removed(
    settings,
    store,
    budget,
    error,
    status,
    code,
    caplog,
):
    runner = Runner()
    runner.error = error
    before = set([key async for key in store.redis.scan_iter(match="sofia:session:*")])
    async with client_for(settings, store, budget, runner) as client:
        result = await client.post("/api/chat", json={"prompt": "Mensaje de prueba"})
    assert result.status_code == status
    assert result.json()["code"] == code
    assert "synthetic-internal-secret" not in result.text + caplog.text
    if status == 429:
        assert result.headers["Retry-After"] == "9"
    after = set([key async for key in store.redis.scan_iter(match="sofia:session:*")])
    assert after == before


async def test_concurrent_requests_do_not_repeat_turn(settings, store, budget):
    runner = Runner()
    async with client_for(settings, store, budget, runner) as client:
        first = await client.post("/api/chat", json={"prompt": "Hola"})
        payload = {"prompt": "Segundo", "sessionId": first.json()["sessionId"], "requestId": "next"}
        headers = {"X-Session-Token": first.headers["X-Session-Token"]}
        runner.wait = asyncio.Event()
        pending = asyncio.create_task(client.post("/api/chat", json=payload, headers=headers))
        for _ in range(100):
            if len(runner.calls) == 2:
                break
            await asyncio.sleep(0.001)
        duplicate = await client.post("/api/chat", json=payload, headers=headers)
        runner.wait.set()
        assert (await pending).status_code == 200
        assert duplicate.status_code == 409
        assert len(runner.calls) == 2


async def test_invalid_delete_and_default_app(settings, store, budget):
    async with client_for(settings, store, budget, Runner()) as client:
        result = await client.delete("/api/session/invalid!")
        assert result.status_code == 401
    from sofia.main import app

    assert app.title == "Sofía backend"


async def test_disconnected_or_chunked_body():
    called = []
    sent = []

    async def app(scope, receive, send):
        called.append(await receive())

    async def send(event):
        sent.append(event)

    events = iter([{"type": "http.disconnect"}])

    async def receive():
        return next(events)

    middleware = BodyLimit(app, limit=5)
    await middleware({"type": "http", "method": "POST"}, receive, send)
    assert called == []
    events = iter(
        [
            {"type": "http.request", "body": b"abc", "more_body": True},
            {"type": "http.request", "body": b"d", "more_body": False},
        ]
    )
    await middleware({"type": "http", "method": "POST"}, receive, send)
    assert called[0]["body"] == b"abcd"
