"""Synthetic provider exposed over real MCP HTTP; never evidence of TMDB access."""

import asyncio

from mcp.server.fastmcp import FastMCP

mcp = FastMCP("m1-test-only", host="127.0.0.1", port=18081, stateless_http=True)


@mcp.tool()
async def search_movies(query: str, limit: int = 3) -> dict[str, object]:
    if query == "timeout":
        await asyncio.sleep(2)
    if query == "error":
        raise ValueError("synthetic-provider-secret")
    return {"movies": []}


if __name__ == "__main__":
    mcp.run(transport="streamable-http")
