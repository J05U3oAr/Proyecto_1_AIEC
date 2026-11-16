import asyncio
import json
from typing import Protocol
from urllib.parse import urlsplit

import httpx
from mcp import ClientSession
from mcp.client.streamable_http import streamable_http_client
from pydantic import ValidationError

from sofia.config import Settings
from sofia.errors import PublicError, unavailable
from sofia.models import Model, ToolResult
from sofia.tools import TOOLS, definitions, validate_result


class LLM(Protocol):
    async def complete(
        self,
        messages: list[dict[str, object]],
        *,
        allow_tools: bool = True,
    ) -> dict[str, object]: ...


class MCP(Protocol):
    async def call(self, name: str, arguments: Model) -> ToolResult: ...


class NvidiaLLM:
    def __init__(self, settings: Settings, client: httpx.AsyncClient) -> None:
        self.settings = settings
        self.client = client

    async def complete(
        self,
        messages: list[dict[str, object]],
        *,
        allow_tools: bool = True,
    ) -> dict[str, object]:
        if not self.settings.nvidia_api_key.get_secret_value():
            raise PublicError(
                "llm_not_configured", "El servicio de conversación no está configurado."
            )
        try:
            async with self.client.stream(
                "POST",
                f"{self.settings.nvidia_base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.settings.nvidia_api_key.get_secret_value()}"
                },
                json={
                    "model": self.settings.nvidia_model,
                    "messages": messages,
                    "tools": definitions(),
                    "tool_choice": "auto" if allow_tools else "none",
                    "stream": False,
                    "max_tokens": self.settings.max_output_tokens,
                    "temperature": 1,
                    "top_p": 0.95,
                    "chat_template_kwargs": {"enable_thinking": False},
                },
                timeout=self.settings.provider_timeout,
            ) as response:
                if response.status_code == 429:
                    retry = response.headers.get("Retry-After", "60")
                    seconds = min(int(retry), 3600) if retry.isdigit() else 60
                    raise PublicError(
                        "provider_rate_limited", "El proveedor pide esperar.", 429, True, seconds
                    )
                if response.status_code in {401, 403, 402, 404, 410}:
                    raise PublicError(
                        "provider_unavailable", "El endpoint gratuito no está disponible."
                    )
                response.raise_for_status()
                body = bytearray()
                async for chunk in response.aiter_bytes():
                    body.extend(chunk)
                    if len(body) > 131072:
                        raise PublicError(
                            "invalid_llm_result", "La respuesta supera el límite permitido."
                        )
                payload = json.loads(body)
            choices = payload["choices"]
            if not choices or choices[0].get("finish_reason") == "length":
                raise ValueError("Incomplete completion")
            message = choices[0]["message"]
            if not isinstance(message, dict):
                raise ValueError("Invalid completion")
            usage = payload.get("usage", {})
            return {"message": message, "usage": usage}
        except (httpx.HTTPError, ValueError, KeyError, TypeError, IndexError) as exc:
            raise unavailable() from exc


def validate_mcp_endpoint(value: str, has_token: bool) -> str:
    parts = urlsplit(value)
    local = parts.hostname in {"localhost", "127.0.0.1", "movies", "books"}
    if (
        parts.username
        or parts.password
        or parts.query
        or parts.fragment
        or parts.path != "/mcp"
        or not parts.hostname
        or (parts.scheme != "https" and not (local and parts.scheme == "http"))
        or (not local and not has_token)
    ):
        raise ValueError("MCP requires configured /mcp endpoint and remote authentication")
    return value


class RemoteMCP:
    def __init__(self, settings: Settings) -> None:
        self.timeout = settings.provider_timeout
        self.token = settings.mcp_token.get_secret_value()
        self.urls = {
            "movies": validate_mcp_endpoint(settings.movies_mcp_url, bool(self.token)),
            "books": validate_mcp_endpoint(settings.books_mcp_url, bool(self.token)),
        }

    async def call(self, name: str, arguments: Model) -> ToolResult:
        tool = TOOLS[name]
        headers = {"Authorization": f"Bearer {self.token}"} if self.token else None
        try:
            async with asyncio.timeout(self.timeout):
                async with mcp_http_client(headers, httpx.Timeout(self.timeout)) as http:
                    async with streamable_http_client(
                        self.urls[tool.server],
                        http_client=http,
                    ) as (read, write, _):
                        async with ClientSession(read, write) as session:
                            await session.initialize()
                            result = await session.call_tool(name, arguments.model_dump())
                            if result.isError:
                                raise unavailable()
                            if result.structuredContent is None:
                                raise ValueError("Structured MCP results required")
                            if len(json.dumps(result.structuredContent)) > 32768:
                                raise ValueError("MCP result too large")
                            parsed = ToolResult.model_validate(result.structuredContent)
                            validate_result(name, arguments, parsed)
                            return parsed
        except PublicError:
            raise
        except (ExceptionGroup, TimeoutError, httpx.HTTPError, ValueError, ValidationError) as exc:
            raise unavailable() from exc


def mcp_http_client(
    headers: dict[str, str] | None = None,
    timeout: httpx.Timeout | None = None,
    auth: httpx.Auth | None = None,
) -> httpx.AsyncClient:
    # Configured endpoints only; redirects must never move bearer tokens to another host.
    return httpx.AsyncClient(
        headers=headers,
        timeout=timeout,
        auth=auth,
        follow_redirects=False,
        trust_env=False,
    )
