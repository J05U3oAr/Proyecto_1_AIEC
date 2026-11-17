"""Stateless MCP HTTP with canonical M1 schemas and sanitized explicit errors."""

import asyncio
import hmac
import json
import logging
import time
from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import asynccontextmanager
from typing import Protocol, cast

import httpx
from mcp import types
from mcp.server.lowlevel import Server
from mcp.server.streamable_http_manager import StreamableHTTPSessionManager
from mcp.server.transport_security import TransportSecuritySettings
from pydantic import ValidationError
from redis.asyncio import Redis
from redis.exceptions import RedisError
from starlette.applications import Starlette
from starlette.middleware import Middleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response
from starlette.routing import Route
from starlette.types import ASGIApp, Receive, Scope, Send

from books.config import BooksSettings
from books.google_books import GoogleBooks
from catalog_common.cache import CatalogCache, CatalogError
from sofia.models import BookId, SearchBooks, ToolResult
from sofia.tools import TOOLS, validate_result

logger = logging.getLogger("sofia.books")


class Catalog(Protocol):
    async def search(self, args: SearchBooks) -> ToolResult: ...
    async def details(self, args: BookId) -> ToolResult: ...


class MCPTransport:
    def __init__(self, manager: StreamableHTTPSessionManager) -> None:
        self.manager = manager

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        await self.manager.handle_request(scope, receive, send)


class Guard:
    def __init__(self, app: ASGIApp, token: str) -> None:
        self.app, self.token = app, token

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] == "http" and scope["path"] == "/mcp":
            request = Request(scope)
            if request.headers.get("origin"):
                response = JSONResponse({"error": "origin_forbidden"}, status_code=403)
                await response(scope, receive, send)
                return
            supplied = request.headers.get("authorization", "")
            if not self.token or not hmac.compare_digest(
                supplied.encode(), f"Bearer {self.token}".encode()
            ):
                response = JSONResponse({"error": "unauthorized"}, status_code=401)
                await response(scope, receive, send)
                return
        await self.app(scope, receive, send)


def create_app(settings: BooksSettings, catalog: Catalog | None = None) -> Starlette:
    server: Server[object, object] = Server("sofia-books")
    redis = Redis.from_url(
        settings.redis_url.get_secret_value(),
        decode_responses=True,
        socket_timeout=2,
        socket_connect_timeout=2,
    )
    http = httpx.AsyncClient(
        trust_env=False,
        follow_redirects=False,
        limits=httpx.Limits(max_connections=16, max_keepalive_connections=8),
    )
    service = catalog or GoogleBooks(
        http,
        CatalogCache(
            redis, "google_books", settings.google_books_daily_budget, settings.catalog_cache_ttl
        ),
        settings.google_books_api_key.get_secret_value(),
        settings.google_books_retries,
        settings.google_books_timeout,
    )

    # SDK v1 decorators lack public type annotations; narrow this external boundary.
    ListHandler = Callable[[], Awaitable[list[types.Tool]]]
    CallHandler = Callable[[str, dict[str, object]], Awaitable[types.CallToolResult]]
    register_list = cast(Callable[[], Callable[[ListHandler], ListHandler]], server.list_tools)
    register_call = cast(Callable[..., Callable[[CallHandler], CallHandler]], server.call_tool)

    @register_list()
    async def list_tools() -> list[types.Tool]:
        return [
            types.Tool(
                name=name,
                description=TOOLS[name].description,
                inputSchema=TOOLS[name].arguments.model_json_schema(),
                outputSchema=ToolResult.model_json_schema(),
                annotations=types.ToolAnnotations(readOnlyHint=True, destructiveHint=False),
            )
            for name in ("search_books", "book_details")
        ]

    # Runtime validation below is strict and does not echo invalid input to the caller.
    @register_call(validate_input=False)
    async def call_tool(name: str, arguments: dict[str, object]) -> types.CallToolResult:
        started = time.perf_counter()
        code = "ok"
        try:
            async with asyncio.timeout(12):
                if name == "search_books":
                    args = SearchBooks.model_validate(arguments)
                    result = await service.search(args)
                elif name == "book_details":
                    detail_args = BookId.model_validate(arguments)
                    result = await service.details(detail_args)
                else:
                    raise CatalogError("unknown_tool")
                validate_result(name, TOOLS[name].arguments.model_validate(arguments), result)
                payload = result.model_dump(mode="json")
                text = json.dumps(payload, ensure_ascii=False)
                if len(text.encode()) > 32768:
                    raise CatalogError("invalid_provider_result")
                return types.CallToolResult(
                    content=[types.TextContent(type="text", text=text)],
                    structuredContent=payload,
                )
        except ValidationError:
            error = CatalogError("invalid_arguments")
        except TimeoutError:
            error = CatalogError("provider_timeout", True)
        except CatalogError as failure:
            error = failure
        except Exception:
            # Do not leak provider exceptions, input, bearer tokens or internal configuration.
            error = CatalogError("provider_unavailable", True)
        finally:
            logger.info(
                "tool_completed tool=%s latency_ms=%.1f",
                name if name in ("search_books", "book_details") else "unknown",
                (time.perf_counter() - started) * 1000,
            )
        code = error.code
        payload = {
            "error": {"code": code, "retryable": error.retryable, "retryAfter": error.retry_after}
        }
        return types.CallToolResult(
            isError=True,
            content=[types.TextContent(type="text", text=json.dumps(payload))],
            structuredContent=payload,
        )

    manager = StreamableHTTPSessionManager(
        server,
        stateless=True,
        json_response=True,
        max_request_body_size=16384,
        security_settings=TransportSecuritySettings(
            allowed_hosts=settings.books_allowed_hosts,
            allowed_origins=[],
        ),
    )

    @asynccontextmanager
    async def lifespan(app: Starlette) -> AsyncIterator[None]:
        try:
            if not settings.mcp_token.get_secret_value():
                raise ValueError("MCP_TOKEN is required; no unauthenticated catalog service")
            async with manager.run():
                yield
        finally:
            await http.aclose()
            await redis.aclose()

    async def health(request: Request) -> Response:
        if request.url.path.endswith("ready"):
            if not settings.google_books_api_key.get_secret_value():
                return JSONResponse({"status": "not_configured"}, status_code=503)
            if catalog is None:
                try:
                    await redis.ping()
                except RedisError:
                    return JSONResponse({"status": "storage_unavailable"}, status_code=503)
        return JSONResponse({"status": "ok"})

    return Starlette(
        routes=[
            Route("/health/live", health),
            Route("/health/ready", health),
            Route("/mcp", MCPTransport(manager), methods=["GET", "POST", "DELETE"]),
        ],
        lifespan=lifespan,
        middleware=[Middleware(Guard, token=settings.mcp_token.get_secret_value())],
    )
