"""Read-only live MCP probe; at most one detail + configuration cache miss (with retries)."""

import argparse
import asyncio
import json
from pathlib import Path

from sofia.adapters import MCP, RemoteMCP
from sofia.config import Settings
from sofia.errors import PublicError
from sofia.models import MovieId

ENV_PATH = Path(__file__).resolve().parents[2] / ".env"


async def probe(settings: Settings, remote: MCP | None = None) -> dict[str, object]:
    try:
        result = await (remote or RemoteMCP(settings)).call(
            "movie_details", MovieId(movieId=438631)
        )
        if len(result.movies) != 1:
            return {"ok": False, "errorCode": "movie_not_found"}
        movie = result.movies[0]
        return {
            "mode": "live_mcp_tmdb",
            "ok": True,
            "movieId": movie.id,
            "poster": movie.poster is not None,
            "imdb": movie.imdb is not None,
        }
    except Exception as error:
        return {
            "ok": False,
            "errorCode": error.code if isinstance(error, PublicError) else "probe_failed",
        }


async def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--confirm-academic", action="store_true", required=True)
    parser.parse_args()
    result = await probe(Settings(_env_file=ENV_PATH))
    print(json.dumps(result))
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
