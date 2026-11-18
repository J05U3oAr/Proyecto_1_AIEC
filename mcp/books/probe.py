"""Explicit live smoke check: two cache misses, up to four attempts with one retry."""

import argparse
import asyncio
import json
from pathlib import Path

from sofia.adapters import MCP, RemoteMCP
from sofia.config import Settings
from sofia.errors import PublicError
from sofia.models import BookId, MovieId, SearchBooks

ENV_PATH = Path(__file__).resolve().parents[2] / ".env"


async def probe(settings: Settings, remote: MCP | None = None) -> dict[str, object]:
    client = remote or RemoteMCP(settings)
    try:
        found = await client.call(
            "search_books", SearchBooks(query="intitle:Dune inauthor:Herbert", limit=1)
        )
        if not found.books:
            return {"ok": False, "errorCode": "book_not_found"}
        book = found.books[0]
        result = await client.call("book_details", BookId(bookId=book.id))
        return {"ok": bool(result.books), "mode": "live_mcp_google_books", "bookId": book.id}
    except Exception as error:
        return {
            "ok": False,
            "errorCode": error.code if isinstance(error, PublicError) else "probe_failed",
        }


async def adaptation_probe(
    settings: Settings,
    movie_id: int,
    remote: MCP | None = None,
) -> dict[str, object]:
    try:
        result = await (remote or RemoteMCP(settings)).call(
            "adaptation_evidence",
            MovieId(movieId=movie_id),
        )
        adaptation = result.adaptation
        if adaptation is None:
            return {"ok": False, "errorCode": "adaptation_missing"}
        return {
            "ok": True,
            "mode": "live_mcp_adaptation",
            "movieId": movie_id,
            "status": adaptation.status,
            "bookId": adaptation.book.id if adaptation.book else None,
            "bookTitle": adaptation.book.title if adaptation.book else None,
            "sources": [evidence.source.url for evidence in adaptation.evidence],
            "limitations": adaptation.limitations,
        }
    except Exception as error:
        return {
            "ok": False,
            "errorCode": error.code if isinstance(error, PublicError) else "probe_failed",
        }


async def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--confirm-no-billing", action="store_true", required=True)
    parser.add_argument("--movie-id", type=int, help="Comprobar vínculo de adaptación por ID TMDB")
    args = parser.parse_args()
    if args.movie_id is not None and args.movie_id <= 0:
        parser.error("--movie-id debe ser positivo")
    settings = Settings(_env_file=ENV_PATH)
    result = (
        await adaptation_probe(settings, args.movie_id)
        if args.movie_id is not None
        else await probe(settings)
    )
    print(json.dumps(result))
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
