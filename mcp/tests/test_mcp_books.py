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
from sofia.models import BookId

SERVER_DIR = str(Path(__file__).resolve().parents[2] / "server")


@pytest.fixture
async def books_endpoint():
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        port = sock.getsockname()[1]
    process = await asyncio.create_subprocess_exec(
        sys.executable,
        "-m",
        "uvicorn",
        "books_fixture:app",
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
                    pytest.fail("Books test server exited")
                try:
                    await client.get(f"http://127.0.0.1:{port}/health/live")
                    break
                except httpx.HTTPError:
                    await asyncio.sleep(0.05)
            else:
                pytest.fail("Books test server not ready")
        yield f"http://127.0.0.1:{port}/mcp"
    finally:
        process.terminate()
        await asyncio.wait_for(process.wait(), 5)


async def test_independent_client_and_m1_consumer(books_endpoint):
    headers = {"Authorization": "Bearer synthetic-mcp-token"}
    async with httpx.AsyncClient(headers=headers, trust_env=False) as http:
        async with streamable_http_client(books_endpoint, http_client=http) as (read, write, _):
            async with ClientSession(read, write) as client:
                await client.initialize()
                tools = (await client.list_tools()).tools
                assert {t.name for t in tools} == {"search_books", "book_details"}
                for tool in tools:
                    assert tool.inputSchema["additionalProperties"] is False
                good = await client.call_tool("search_books", {"query": "Dune"})
                assert not good.isError
                assert good.structuredContent["books"][0]["id"] == "dune_1"
                bad = await client.call_tool("book_details", {"bookId": True})
                assert bad.isError
                for args in [{"bookId": 0}, {"bookId": 1, "url": "https://evil.test"}]:
                    assert (await client.call_tool("book_details", args)).isError
    settings = Settings(books_mcp_url=books_endpoint, mcp_token="synthetic-mcp-token")
    result = await RemoteMCP(settings).call("book_details", BookId(bookId="dune_1"))
    assert result.books[0].title == "Dune"


async def test_auth_origin_body_limit_and_health(books_endpoint):
    async with httpx.AsyncClient(trust_env=False) as client:
        assert (await client.post(books_endpoint, json={})).status_code == 401
        assert (
            await client.post(books_endpoint, headers={"Authorization": "Bearer wrong"})
        ).status_code == 401
        h = {"Authorization": "Bearer synthetic-mcp-token"}
        bad = await client.post(
            books_endpoint, headers={**h, "Origin": "https://evil.test"}, json={}
        )
        assert bad.status_code == 403
        assert (
            await client.post(books_endpoint, headers=h, content="x" * 17000)
        ).status_code == 413
        assert (
            await client.get(books_endpoint.replace("/mcp", "/health/ready"))
        ).status_code == 200
