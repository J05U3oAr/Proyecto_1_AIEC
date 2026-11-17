"""Explicit live smoke check: two cache misses, up to four attempts with one retry."""

import argparse
import asyncio
import json
from pathlib import Path

from sofia.adapters import MCP, RemoteMCP
from sofia.config import Settings
from sofia.errors import PublicError
from sofia.models import BookId, SearchBooks

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


async def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--confirm-no-billing", action="store_true", required=True)
    parser.parse_args()
    result = await probe(Settings(_env_file=ENV_PATH))
    print(json.dumps(result))
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
