import json
import uuid
from datetime import UTC, datetime, timedelta
from email.utils import format_datetime

import httpx
import pytest
from mcp import ClientSession
from mcp.client.streamable_http import streamable_http_client
from pydantic import ValidationError

from books.config import BooksSettings
from books.google_books import GoogleBooks, normalize_book, retry_seconds
from books.main import app as factory
from books.server import create_app
from catalog_common.cache import CatalogCache, CatalogError
from sofia.models import BookId, SearchBooks, ToolResult

RAW = {
    "id": "dune_1",
    "volumeInfo": {
        "title": "Dune",
        "authors": ["Frank Herbert"],
        "publishedDate": "1965-08",
        "description": "<p>Una novela &amp; su mundo.</p>",
        "infoLink": "https://evil.test/ignored",
    },
}


@pytest.fixture
async def build_books(cache_redis):
    clients = []

    def build(handler, retries=0, limit=1000, key="synthetic-books-key"):
        client = httpx.AsyncClient(transport=httpx.MockTransport(handler), trust_env=False)
        clients.append(client)
        cache = CatalogCache(cache_redis, "test-books-" + uuid.uuid4().hex, limit)
        return GoogleBooks(client, cache, key, retries=retries)

    yield build
    for client in clients:
        await client.aclose()


async def test_search_details_normalization_cache_and_secret(build_books, cache_redis):
    requests = []

    def handler(request):
        requests.append(request)
        assert request.url.host == "www.googleapis.com"
        assert request.headers["X-Goog-Api-Key"] == "synthetic-books-key"
        assert "synthetic-books-key" not in str(request.url)
        if request.url.path.endswith("/volumes"):
            assert request.url.params["maxResults"] == "3"
            assert request.url.params["q"] == "intitle:Dune inauthor:Herbert"
            return httpx.Response(200, json={"items": [RAW, RAW], "totalItems": 2})
        return httpx.Response(200, json=RAW)

    catalog = build_books(handler)
    args = SearchBooks(query="intitle:Dune inauthor:Herbert")
    result = await catalog.search(args)
    assert len(result.books) == 1
    book = result.books[0]
    assert book.year == 1965
    assert book.authors == ["Frank Herbert"]
    assert book.description == "Una novela & su mundo."
    assert book.url == "https://books.google.com/books?id=dune_1"
    assert (await catalog.details(BookId(bookId=book.id))).books == [book]
    assert await catalog.search(args) == result
    assert len(requests) == 2
    async for key in cache_redis.scan_iter(match="sofia:catalog:*"):
        assert "synthetic-books-key" not in key
        if await cache_redis.type(key) == "string":
            assert "synthetic-books-key" not in (await cache_redis.get(key) or "")


@pytest.mark.parametrize("payload", [{"totalItems": 0}, {"items": [], "totalItems": 0}])
async def test_empty_search(build_books, payload):
    catalog = build_books(lambda r: httpx.Response(200, json=payload))
    assert not (await catalog.search(SearchBooks(query="absent"))).books


async def test_detail_not_found_and_missing_optional_fields(build_books):
    catalog = build_books(lambda r: httpx.Response(404))
    assert not (await catalog.details(BookId(bookId="absent"))).books
    book = normalize_book({"id": "x", "volumeInfo": {"title": "Minimal"}})
    assert book.year is None and book.description == "" and book.authors == []


@pytest.mark.parametrize(
    "payload",
    [
        [],
        {},
        {"error": {}},
        {"items": "bad"},
        {"items": [RAW] * 6},
        {"items": [{}]},
        {"items": [{"id": "../evil", "volumeInfo": {"title": "X"}}]},
        {"items": [{"id": "x", "volumeInfo": {"title": "X", "authors": "wrong"}}]},
        {"items": [{"id": "x", "volumeInfo": {"title": "X", "description": None}}]},
        {"items": [{"id": "x", "volumeInfo": {"title": "X", "publishedDate": True}}]},
    ],
)
async def test_malformed_provider_is_not_absence(build_books, payload):
    catalog = build_books(lambda r: httpx.Response(200, json=payload))
    for _ in range(2):
        with pytest.raises(CatalogError, match="invalid_provider_result"):
            await catalog.search(SearchBooks(query="x"))


async def test_mismatched_detail_id(build_books):
    catalog = build_books(lambda r: httpx.Response(200, json=RAW))
    with pytest.raises(CatalogError, match="invalid_provider_result"):
        await catalog.details(BookId(bookId="different"))


@pytest.mark.parametrize(
    "status,code",
    [
        (401, "provider_not_configured"),
        (403, "provider_not_configured"),
        (429, "provider_rate_limited"),
        (500, "provider_unavailable"),
        (302, "provider_unavailable"),
        (404, "provider_unavailable"),
    ],
)
async def test_http_errors(build_books, status, code):
    calls = []

    def handler(request):
        calls.append(request)
        return httpx.Response(
            status, headers={"Retry-After": "30", "Location": "https://evil.test"}
        )

    catalog = build_books(handler)
    with pytest.raises(CatalogError, match=code):
        await catalog.search(SearchBooks(query="x"))
    assert len(calls) == 1


@pytest.mark.parametrize("failure", ["timeout", "transport", "503"])
async def test_retry_is_counted_and_bounded(build_books, failure):
    calls = []

    def handler(request):
        calls.append(request)
        if len(calls) == 1:
            if failure == "timeout":
                raise httpx.ReadTimeout("synthetic-private-url")
            if failure == "transport":
                raise httpx.ConnectError("synthetic-private-url")
            return httpx.Response(503)
        return httpx.Response(200, json={"items": [RAW]})

    catalog = build_books(handler, retries=1, limit=2)
    assert (await catalog.search(SearchBooks(query="x"))).books
    with pytest.raises(CatalogError, match="quota_exhausted"):
        await catalog.search(SearchBooks(query="new"))
    assert len(calls) == 2
    assert (await catalog.search(SearchBooks(query="x"))).books


async def test_timeout_missing_key_and_oversize(build_books):
    def timeout(request):
        raise httpx.ReadTimeout("secret")

    with pytest.raises(CatalogError, match="provider_timeout"):
        await build_books(timeout).search(SearchBooks(query="x"))
    with pytest.raises(CatalogError, match="provider_not_configured"):
        await build_books(timeout, key="").search(SearchBooks(query="x"))
    for body in [b"not-json", b"x" * 1048577]:
        with pytest.raises(CatalogError, match="invalid_provider_result"):
            await build_books(lambda r, body=body: httpx.Response(200, content=body)).search(
                SearchBooks(query="x")
            )


def test_limits_dates_and_settings(monkeypatch):
    assert retry_seconds("invalid") == 60
    assert retry_seconds("9999999") == 86400
    assert 1 <= retry_seconds(format_datetime(datetime.now(UTC) + timedelta(seconds=60))) <= 60
    with pytest.raises(ValueError):
        GoogleBooks(None, None, "", retries=2)
    for values in [
        {"google_books_daily_budget": 1001},
        {"books_allowed_hosts": ["*"]},
        {"books_allowed_hosts": []},
        {"google_books_retries": 2},
    ]:
        with pytest.raises(ValidationError):
            BooksSettings(**values)
    monkeypatch.setenv("GOOGLE_BOOKS_API_KEY", "synthetic-secret")
    assert "synthetic-secret" not in repr(BooksSettings())
    assert factory() is not None


class FixtureBooks:
    async def search(self, args):
        return ToolResult(books=[normalize_book(RAW)])

    async def details(self, args):
        return ToolResult(books=[normalize_book({**RAW, "id": args.bookId})])


async def test_independent_mcp_client_and_guards():
    app = create_app(
        BooksSettings(mcp_token="synthetic", google_books_api_key="synthetic"), FixtureBooks()
    )
    async with app.router.lifespan_context(app):
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app),
            base_url="http://localhost",
            headers={"Authorization": "Bearer synthetic"},
        ) as http:
            async with streamable_http_client("http://localhost/mcp", http_client=http) as (
                r,
                w,
                _,
            ):
                async with ClientSession(r, w) as client:
                    await client.initialize()
                    assert {t.name for t in (await client.list_tools()).tools} == {
                        "search_books",
                        "book_details",
                    }
                    for name, args in [
                        ("search_books", {"query": "Dune"}),
                        ("book_details", {"bookId": "dune_1"}),
                    ]:
                        result = await client.call_tool(name, args)
                        assert not result.isError
                        assert result.structuredContent["books"][0]["id"] == "dune_1"
                    for name, args in [
                        ("shell", {}),
                        ("book_details", {"bookId": "https://evil.test"}),
                        ("search_books", {"query": "x", "limit": True}),
                    ]:
                        assert (await client.call_tool(name, args)).isError
            assert (await http.get("/health/ready")).status_code == 200
            assert (await http.post("/mcp", headers={"Authorization": "bad"})).status_code == 401
            assert (
                await http.post("/mcp", headers={"Origin": "https://evil.test"})
            ).status_code == 403
            assert (await http.post("/mcp", content="x" * 17000)).status_code == 413


@pytest.mark.parametrize(
    "mode,code",
    [
        ("quota", "quota_exhausted"),
        ("timeout", "provider_timeout"),
        ("unexpected", "provider_unavailable"),
        ("large", "invalid_provider_result"),
    ],
)
async def test_mcp_error_envelopes(mode, code):
    class BrokenBooks(FixtureBooks):
        async def search(self, args):
            if mode == "quota":
                raise CatalogError("quota_exhausted", True, 60)
            if mode == "timeout":
                raise TimeoutError
            if mode == "unexpected":
                raise RuntimeError("synthetic-private-key")
            return ToolResult(
                books=[
                    normalize_book(
                        {"id": str(i), "volumeInfo": {"title": "X", "description": "📖" * 4000}}
                    )
                    for i in range(5)
                ]
            )

    app = create_app(BooksSettings(mcp_token="synthetic"), BrokenBooks())
    async with app.router.lifespan_context(app):
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app),
            base_url="http://localhost",
            headers={"Authorization": "Bearer synthetic"},
        ) as http:
            async with streamable_http_client("http://localhost/mcp", http_client=http) as (
                r,
                w,
                _,
            ):
                async with ClientSession(r, w) as client:
                    await client.initialize()
                    result = await client.call_tool("search_books", {"query": "x", "limit": 5})
                    assert result.isError
                    assert result.structuredContent["error"]["code"] == code
                    assert "private" not in json.dumps(result.structuredContent)


async def test_readiness_and_missing_mcp_token():
    with pytest.raises(ValueError, match="MCP_TOKEN"):
        app = create_app(BooksSettings(mcp_token=""))
        async with app.router.lifespan_context(app):
            pass
    for key in ["", "synthetic"]:
        app = create_app(
            BooksSettings(
                mcp_token="synthetic", google_books_api_key=key, redis_url="redis://127.0.0.1:1/0"
            )
        )
        async with app.router.lifespan_context(app):
            async with httpx.AsyncClient(
                transport=httpx.ASGITransport(app=app), base_url="http://localhost"
            ) as http:
                assert (await http.get("/health/live")).status_code == 200
                assert (await http.get("/health/ready")).status_code == 503


@pytest.mark.parametrize("reason", ["dailyLimitExceeded", "rateLimitExceeded", "forbidden"])
async def test_google_403_quota_reason(build_books, reason):
    catalog = build_books(
        lambda r: httpx.Response(403, json={"error": {"errors": [{"reason": reason}]}})
    )
    code = "provider_not_configured" if reason == "forbidden" else "provider_rate_limited"
    with pytest.raises(CatalogError, match=code):
        await catalog.search(SearchBooks(query="x"))


@pytest.mark.parametrize("mode", ["ok", "empty", "public", "unexpected"])
async def test_books_probe_sanitizes_and_checks_both_tools(mode):
    from books.probe import probe
    from sofia.config import Settings
    from sofia.errors import PublicError

    class Remote:
        async def call(self, name, args):
            if mode == "public":
                raise PublicError("quota_exhausted", "synthetic-private-key")
            if mode == "unexpected":
                raise RuntimeError("synthetic-private-key")
            assert name in {"search_books", "book_details"}
            return ToolResult(books=[] if mode == "empty" else [normalize_book(RAW)])

    result = await probe(Settings(_env_file=None), Remote())
    assert result["ok"] == (mode == "ok")
    assert "private" not in str(result)


async def test_books_probe_cli_requires_confirmation(monkeypatch, capsys):
    import sys
    from unittest.mock import AsyncMock

    from books import probe

    monkeypatch.setattr(sys, "argv", ["probe"])
    with pytest.raises(SystemExit):
        await probe.main()
    monkeypatch.setattr(sys, "argv", ["probe", "--confirm-no-billing"])
    monkeypatch.setattr(probe, "Settings", lambda **kwargs: None)
    monkeypatch.setattr(probe, "probe", AsyncMock(return_value={"ok": True}))
    assert await probe.main() == 0
    assert "true" in capsys.readouterr().out


def test_books_probe_entrypoint_refuses_unconfirmed_access(monkeypatch):
    import runpy
    import sys
    from pathlib import Path

    path = Path(__file__).resolve().parents[1] / "books" / "probe.py"
    monkeypatch.setattr(sys, "argv", ["probe"])
    with pytest.raises(SystemExit) as stopped:
        runpy.run_path(str(path), run_name="__main__")
    assert stopped.value.code == 2
