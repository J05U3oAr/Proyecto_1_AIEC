import asyncio
import os
import socket
import sys
from pathlib import Path

import httpx
import pytest
from mcp import ClientSession
from mcp.client.streamable_http import streamable_http_client

from sofia.adapters import RemoteMCP
from sofia.config import Settings
from sofia.models import MovieId

SERVER_DIR = str(Path(__file__).resolve().parents[2] / "server")


@pytest.fixture
async def movies_endpoint():
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        port = sock.getsockname()[1]
    process = await asyncio.create_subprocess_exec(
        sys.executable,
        "-m",
        "uvicorn",
        "movies_fixture:app",
        "--host",
        "127.0.0.1",
        "--port",
        str(port),
        "--no-access-log",
        env={**os.environ, "PYTHONPATH": "../mcp:../mcp/tests:.", "MCP_TEST_PORT": str(port)},
        cwd=SERVER_DIR,
        stdout=asyncio.subprocess.DEVNULL,
        stderr=asyncio.subprocess.DEVNULL,
    )
    try:
        async with httpx.AsyncClient(trust_env=False, timeout=0.2) as client:
            for _ in range(100):
                if process.returncode is not None:
                    pytest.fail("Movies test server exited")
                try:
                    await client.get(f"http://127.0.0.1:{port}/health/live")
                    break
                except httpx.HTTPError:
                    await asyncio.sleep(0.05)
            else:
                pytest.fail("Movies test server not ready")
        yield f"http://127.0.0.1:{port}/mcp"
    finally:
        process.terminate()
        await asyncio.wait_for(process.wait(), 5)


async def test_independent_client_and_m1_consumer(movies_endpoint):
    headers = {"Authorization": "Bearer synthetic-mcp-token"}
    async with httpx.AsyncClient(headers=headers, trust_env=False) as http:
        async with streamable_http_client(movies_endpoint, http_client=http) as (read, write, _):
            async with ClientSession(read, write) as client:
                await client.initialize()
                tools = (await client.list_tools()).tools
                assert {t.name for t in tools} == {"search_movies", "movie_details"}
                for tool in tools:
                    assert tool.inputSchema["additionalProperties"] is False
                good = await client.call_tool("search_movies", {"query": "Dune"})
                assert not good.isError
                assert good.structuredContent["movies"][0]["id"] == 438631
                bad = await client.call_tool("movie_details", {"movieId": True})
                assert bad.isError
                for args in [{"movieId": 0}, {"movieId": 1, "url": "https://evil.test"}]:
                    assert (await client.call_tool("movie_details", args)).isError
    settings = Settings(movies_mcp_url=movies_endpoint, mcp_token="synthetic-mcp-token")
    result = await RemoteMCP(settings).call("movie_details", MovieId(movieId=438631))
    assert result.movies[0].title == "Dune"


async def test_auth_origin_body_limit_and_health(movies_endpoint):
    async with httpx.AsyncClient(trust_env=False) as client:
        assert (await client.post(movies_endpoint, json={})).status_code == 401
        assert (
            await client.post(movies_endpoint, headers={"Authorization": "Bearer wrong"})
        ).status_code == 401
        h = {"Authorization": "Bearer synthetic-mcp-token"}
        bad = await client.post(
            movies_endpoint, headers={**h, "Origin": "https://evil.test"}, json={}
        )
        assert bad.status_code == 403
        assert (
            await client.post(movies_endpoint, headers=h, content="x" * 17000)
        ).status_code == 413
        assert (
            await client.get(movies_endpoint.replace("/mcp", "/health/ready"))
        ).status_code == 200


async def test_in_process_transport_covers_lifecycle_and_errors(monkeypatch):
    from catalog_fixture import FixtureCatalog

    from movies.config import MoviesSettings
    from movies.main import app as factory
    from movies.server import create_app

    settings = MoviesSettings(mcp_token="synthetic-mcp-token", tmdb_read_token="synthetic")
    app = create_app(settings, catalog=FixtureCatalog())
    async with app.router.lifespan_context(app):
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app),
            base_url="http://localhost",
            headers={"Authorization": "Bearer synthetic-mcp-token"},
        ) as http:
            async with streamable_http_client("http://localhost/mcp", http_client=http) as (
                read,
                write,
                _,
            ):
                async with ClientSession(read, write) as client:
                    await client.initialize()
                    assert len((await client.list_tools()).tools) == 2
                    assert not (await client.call_tool("search_movies", {"query": "Dune"})).isError
                    assert not (
                        await client.call_tool("movie_details", {"movieId": 438631})
                    ).isError
                    assert (await client.call_tool("movie_details", {"movieId": False})).isError
                    assert (await client.call_tool("shell", {})).isError
            assert (await http.get("/health/ready")).status_code == 200
    monkeypatch.setenv("MCP_TOKEN", "synthetic-mcp-token")
    monkeypatch.delenv("TMDB_READ_TOKEN", raising=False)
    app = factory()
    async with app.router.lifespan_context(app):
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app), base_url="http://localhost"
        ) as http:
            assert (await http.get("/health/live")).status_code == 200
            assert (await http.get("/health/ready")).status_code == 503


def test_config_limits_and_host_allowlist():
    from pydantic import ValidationError

    from movies.config import MoviesSettings

    for values in [
        {"tmdb_daily_budget": 1001},
        {"catalog_cache_ttl": 0},
        {"movies_allowed_hosts": ["*"]},
    ]:
        with pytest.raises(ValidationError):
            MoviesSettings(**values)


@pytest.mark.parametrize(
    "mode,expected",
    [
        ("quota", "quota_exhausted"),
        ("unexpected", "provider_unavailable"),
        ("large", "invalid_provider_result"),
        ("timeout", "provider_timeout"),
    ],
)
async def test_tool_errors_are_structured_sanitized_and_bounded(mode, expected, monkeypatch):
    from catalog_fixture import FixtureCatalog

    from catalog_common.cache import CatalogError
    from movies.config import MoviesSettings
    from movies.server import create_app
    from sofia.models import Movie, ToolResult

    class BrokenCatalog(FixtureCatalog):
        async def details(self, args):
            if mode == "quota":
                raise CatalogError("quota_exhausted", True, 60)
            if mode == "unexpected":
                raise RuntimeError("synthetic-private-token")
            if mode == "timeout":
                raise TimeoutError
            return ToolResult(
                movies=[
                    Movie(
                        id=i,
                        title="large",
                        overview="🎞" * 4000,
                        tmdb=f"https://www.themoviedb.org/movie/{i}",
                    )
                    for i in range(1, 6)
                ]
            )

    # Large result uses search: details enforces exactly one resource in M1's policy.
    class LargeCatalog(BrokenCatalog):
        async def search(self, args):
            return await self.details(args)

    app = create_app(
        MoviesSettings(mcp_token="synthetic-mcp-token", tmdb_read_token="synthetic"),
        catalog=LargeCatalog(),
    )
    async with app.router.lifespan_context(app):
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app),
            base_url="http://localhost",
            headers={"Authorization": "Bearer synthetic-mcp-token"},
        ) as http:
            async with streamable_http_client("http://localhost/mcp", http_client=http) as (
                r,
                w,
                _,
            ):
                async with ClientSession(r, w) as client:
                    await client.initialize()
                    result = await client.call_tool("search_movies", {"query": "x", "limit": 5})
                    assert result.isError
                    assert result.structuredContent["error"]["code"] == expected
                    assert "private" not in str(result)
            assert (await http.post("/mcp", headers={"Authorization": "wrong"})).status_code == 401
            assert (
                await http.post("/mcp", headers={"Origin": "https://evil.test"})
            ).status_code == 403


async def test_missing_token_and_readiness_storage_failure():
    from movies.config import MoviesSettings
    from movies.server import create_app

    app = create_app(MoviesSettings(mcp_token=""))
    with pytest.raises(ValueError, match="MCP_TOKEN"):
        async with app.router.lifespan_context(app):
            pass
    app = create_app(
        MoviesSettings(
            mcp_token="synthetic-mcp-token",
            tmdb_read_token="synthetic",
            redis_url="redis://127.0.0.1:1/0",
        )
    )
    async with app.router.lifespan_context(app):
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app), base_url="http://localhost"
        ) as http:
            assert (await http.get("/health/ready")).status_code == 503
