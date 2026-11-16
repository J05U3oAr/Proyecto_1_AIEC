"""Real MCP HTTP with injected synthetic catalog; never evidence of TMDB access."""

import os

from catalog_fixture import FixtureCatalog

from movies.config import MoviesSettings
from movies.server import create_app

app = create_app(
    MoviesSettings(
        mcp_token="synthetic-mcp-token",
        tmdb_read_token="synthetic-tmdb-token",
        movies_allowed_hosts=[f"127.0.0.1:{os.environ['MCP_TEST_PORT']}"],
        redis_url="redis://localhost:16379/14",
    ),
    catalog=FixtureCatalog(),
)
