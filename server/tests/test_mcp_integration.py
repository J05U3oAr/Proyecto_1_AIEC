import asyncio
import sys
from pathlib import Path

import httpx
import pytest
from mcp import ClientSession
from mcp.client.streamable_http import streamable_http_client

from sofia.adapters import RemoteMCP
from sofia.errors import PublicError
from sofia.tools import TOOLS


@pytest.fixture
async def mcp_endpoint():
    process = await asyncio.create_subprocess_exec(
        sys.executable,
        str(Path(__file__).with_name("mcp_fixture.py")),
        stdout=asyncio.subprocess.DEVNULL,
        stderr=asyncio.subprocess.DEVNULL,
    )
    try:
        async with httpx.AsyncClient(trust_env=False, timeout=0.2) as http:
            for _ in range(100):
                if process.returncode is not None:
                    pytest.fail("Synthetic MCP server could not start")
                try:
                    await http.get("http://127.0.0.1:18081/mcp")
                    break
                except httpx.HTTPError:
                    await asyncio.sleep(0.05)
            else:
                pytest.fail("Synthetic MCP server did not become ready")
        yield "http://127.0.0.1:18081/mcp"
    finally:
        process.terminate()
        await asyncio.wait_for(process.wait(), timeout=5)


async def test_independent_client_lists_and_calls_real_mcp_transport(mcp_endpoint, settings):
    async with streamable_http_client(mcp_endpoint) as (read, write, _):
        async with ClientSession(read, write) as client:
            await client.initialize()
            tools = await client.list_tools()
            assert [tool.name for tool in tools.tools] == ["search_movies"]
            result = await client.call_tool("search_movies", {"query": "fixture"})
            assert not result.isError
            assert result.structuredContent == {"movies": []}
    settings.movies_mcp_url = mcp_endpoint
    args = TOOLS["search_movies"].arguments.model_validate({"query": "fixture"})
    assert (await RemoteMCP(settings).call("search_movies", args)).movies == []
    args = TOOLS["search_movies"].arguments.model_validate({"query": "error"})
    with pytest.raises(PublicError) as failure:
        await RemoteMCP(settings).call("search_movies", args)
    assert "synthetic-provider-secret" not in failure.value.message
