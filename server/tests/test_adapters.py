import asyncio
import json
from contextlib import asynccontextmanager
from types import SimpleNamespace

import httpx
import pytest
from pydantic import SecretStr

from sofia.adapters import NvidiaLLM, RemoteMCP, mcp_http_client, validate_mcp_endpoint
from sofia.errors import PublicError
from sofia.tools import TOOLS


async def test_llm_request_and_response_are_bounded(settings):
    def handler(request):
        payload = json.loads(request.content)
        assert payload["model"] == settings.nvidia_model
        assert payload["max_tokens"] == 2048
        assert payload["stream"] is False
        assert payload["chat_template_kwargs"]["enable_thinking"] is False
        assert "synthetic-test-only" not in request.content.decode()
        assert request.headers["Authorization"] == "Bearer synthetic-test-only"
        assert len(payload["tools"]) == 5
        return httpx.Response(
            200,
            json={
                "choices": [{"message": {"content": "Hola"}, "finish_reason": "stop"}],
                "usage": {"prompt_tokens": 10, "completion_tokens": 2},
            },
        )

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        result = await NvidiaLLM(settings, client).complete([])
    assert result["message"]["content"] == "Hola"


@pytest.mark.parametrize(
    "status,body,code",
    [
        (429, {}, "provider_rate_limited"),
        (401, {}, "provider_unavailable"),
        (402, {}, "provider_unavailable"),
        (410, {}, "provider_unavailable"),
        (500, {"internal": "synthetic-secret"}, "upstream_unavailable"),
        (200, {}, "upstream_unavailable"),
        (200, {"choices": []}, "upstream_unavailable"),
        (200, {"choices": [{"message": {}, "finish_reason": "length"}]}, "upstream_unavailable"),
        (200, {"choices": [{"message": "wrong"}]}, "upstream_unavailable"),
    ],
)
async def test_llm_public_errors_do_not_expose_provider_bodies(settings, status, body, code):
    async with httpx.AsyncClient(
        transport=httpx.MockTransport(
            lambda _: httpx.Response(status, json=body, headers={"Retry-After": "7"}),
        )
    ) as client:
        with pytest.raises(PublicError) as error:
            await NvidiaLLM(settings, client).complete([])
    assert error.value.code == code
    assert "synthetic-secret" not in error.value.message
    if status == 429:
        assert error.value.retry_after == 7


async def test_llm_missing_key_timeout_size_and_retry_date(settings):
    settings.nvidia_api_key = SecretStr("")
    async with httpx.AsyncClient() as client:
        with pytest.raises(PublicError) as missing:
            await NvidiaLLM(settings, client).complete([])
    assert missing.value.code == "llm_not_configured"
    settings.nvidia_api_key = SecretStr("synthetic-test-only")

    def timeout(_):
        raise httpx.ReadTimeout("synthetic-secret")

    for handler, expected in [
        (timeout, "upstream_unavailable"),
        (lambda _: httpx.Response(200, content=b"x" * 131073), "invalid_llm_result"),
        (
            lambda _: httpx.Response(429, headers={"Retry-After": "Wed, 01 Jan"}),
            "provider_rate_limited",
        ),
    ]:
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
            with pytest.raises(PublicError) as failure:
                await NvidiaLLM(settings, client).complete([])
        assert failure.value.code == expected


@pytest.mark.parametrize(
    "url,token",
    [
        ("http://external.test/mcp", True),
        ("https://external.test/mcp", False),
        ("https://external.test/other", True),
        ("https://u:p@external.test/mcp", True),
        ("https://external.test/mcp?next=x", True),
        ("file:///mcp", True),
    ],
)
def test_mcp_destination_policy(url, token):
    with pytest.raises(ValueError):
        validate_mcp_endpoint(url, token)


def test_mcp_configured_remote_and_no_redirects():
    assert validate_mcp_endpoint("https://external.test/mcp", True)
    client = mcp_http_client(timeout=httpx.Timeout(1))
    assert not client.follow_redirects


@pytest.mark.parametrize(
    "payload,is_error",
    [
        ({"movies": []}, False),
        (None, False),
        ({"movies": []}, True),
        ({"movies": [], "extra": "synthetic-secret"}, False),
        ({"extra": "x" * 32769}, False),
    ],
)
async def test_mcp_transport_result_validation(monkeypatch, settings, payload, is_error):
    @asynccontextmanager
    async def transport(*args, **kwargs):
        assert not kwargs["http_client"].follow_redirects
        yield (None, None, None)

    class Session:
        def __init__(self, *args):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return None

        async def initialize(self):
            return None

        async def call_tool(self, name, args):
            return SimpleNamespace(isError=is_error, structuredContent=payload)

    monkeypatch.setattr("sofia.adapters.streamable_http_client", transport)
    monkeypatch.setattr("sofia.adapters.ClientSession", Session)
    args = TOOLS["search_movies"].arguments.model_validate({"query": "x"})
    if payload == {"movies": []} and not is_error:
        assert (await RemoteMCP(settings).call("search_movies", args)).movies == []
    else:
        with pytest.raises(PublicError):
            await RemoteMCP(settings).call("search_movies", args)


async def test_mcp_transport_timeout(monkeypatch, settings):
    @asynccontextmanager
    async def transport(*args, **kwargs):
        await asyncio.sleep(1)
        yield (None, None, None)

    settings.provider_timeout = 0.1
    monkeypatch.setattr("sofia.adapters.streamable_http_client", transport)
    args = TOOLS["search_movies"].arguments.model_validate({"query": "x"})
    with pytest.raises(PublicError) as failure:
        await RemoteMCP(settings).call("search_movies", args)
    assert failure.value.code == "upstream_unavailable"
