"""Two chat turns and cleanup of their own session; no tokens or provider bodies printed."""

import argparse
import asyncio
import json
import re
from uuid import uuid4

import httpx
from pydantic import ValidationError
from redis.asyncio import Redis

from sofia.adapters import MCP, RemoteMCP
from sofia.agent import Agent
from sofia.config import Settings
from sofia.errors import PublicError
from sofia.models import ChatRequest, ChatResponse, Movie
from sofia.storage import Budget


class NoLLM:
    async def complete(
        self,
        messages: list[dict[str, object]],
        *,
        allow_tools: bool = True,
    ) -> dict[str, object]:
        raise PublicError("llm_disabled", "Este probe no permite inferencia LLM.")


async def reviewed_probe(
    settings: Settings,
    movie: Movie,
    remote: MCP | None = None,
) -> dict[str, object]:
    redis = Redis.from_url(settings.redis_url.get_secret_value(), decode_responses=True)
    try:
        agent = Agent(
            settings,
            NoLLM(),
            remote or RemoteMCP(settings),
            Budget(redis, settings.llm_daily_budget),
        )
        turn = await agent.run(
            ChatRequest(prompt="Compara esa película con su libro sin spoilers"),
            [],
            {"movies": [movie.model_dump()]},
            "probe-reviewed-comparison",
        )
        comparison = turn.response.comparison
        if comparison is None:
            return {"ok": False, "errorCode": "comparison_missing", "trace": turn.trace}
        return {
            "ok": True,
            "mode": "reviewed_movie_live_books",
            "movieMetadataOrigin": "operator-reviewed identity; TMDB not called",
            "movieId": movie.id,
            "movieTitle": movie.title,
            "adaptationStatus": comparison.adaptation.status,
            "bookTitle": comparison.adaptation.book.title if comparison.adaptation.book else None,
            "verdict": comparison.verdict,
            "sources": [source.model_dump() for source in turn.response.sources],
            "usage": turn.usage,
            "trace": turn.trace,
        }
    except PublicError as error:
        return {"ok": False, "errorCode": error.code}
    finally:
        await redis.aclose()


async def probe(client: httpx.AsyncClient, title: str, movie_id: int) -> dict[str, object]:
    session_id: str | None = None
    token = ""
    result: dict[str, object]
    try:
        first = await client.post("/api/chat", json={"prompt": title, "requestId": str(uuid4())})
        first.raise_for_status()
        selected = ChatResponse.model_validate(first.json())
        session_id, token = selected.sessionId, first.headers.get("X-Session-Token", "")
        if not session_id or not token:
            raise PublicError("session_not_issued", "No se emitió sesión de prueba.")
        if len(selected.movies) != 1 or selected.movies[0].id != movie_id:
            raise PublicError("movie_not_selected", "No se seleccionó la película esperada.")
        second = await client.post(
            "/api/chat",
            headers={"X-Session-Token": token},
            json={
                "prompt": "Compara esa película con su libro sin spoilers",
                "sessionId": session_id,
                "requestId": str(uuid4()),
            },
        )
        second.raise_for_status()
        response = ChatResponse.model_validate(second.json())
        if response.comparison is None:
            raise PublicError("comparison_missing", "No se recibió comparación.")
        adaptation = response.comparison.adaptation
        result = {
            "ok": True,
            "mode": "live_http_comparison",
            "movieId": movie_id,
            "adaptationStatus": adaptation.status,
            "bookTitle": adaptation.book.title if adaptation.book else None,
            "verdict": response.comparison.verdict,
            "sources": [source.model_dump() for source in response.sources],
        }
    except PublicError as error:
        result = {"ok": False, "errorCode": error.code}
    except httpx.HTTPStatusError as error:
        result = {
            "ok": False,
            "errorCode": "backend_http_error",
            "httpStatus": error.response.status_code,
        }
    except (httpx.HTTPError, ValidationError, ValueError):
        result = {"ok": False, "errorCode": "probe_failed"}
    deleted = session_id is None
    if session_id and token:
        try:
            cleanup = await client.delete(
                f"/api/session/{session_id}",
                headers={"X-Session-Token": token},
            )
            deleted = cleanup.status_code in {204, 401}
        except httpx.HTTPError:
            deleted = False
    result["testSessionDeleted"] = deleted
    return result


async def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--confirm-no-billing", action="store_true", required=True)
    parser.add_argument("--title", default="Blade Runner 1982")
    parser.add_argument("--movie-id", type=int, default=78)
    parser.add_argument(
        "--reviewed-movie",
        action="store_true",
        help="Usar identidad revisada, sin TMDB ni LLM; consulta MCP Books real",
    )
    args = parser.parse_args()
    if args.movie_id <= 0 or not 0 < len(args.title) <= 200:
        parser.error("Indica título e ID válidos")
    if args.reviewed_movie:
        identity = re.fullmatch(r"(.+)\s+(\d{4})", args.title.strip())
        if identity is None or not 1800 <= int(identity[2]) <= 2200:
            parser.error("--reviewed-movie requiere --title con título y año")
        movie = Movie(
            id=args.movie_id,
            title=identity[1],
            year=int(identity[2]),
            tmdb=f"https://www.themoviedb.org/movie/{args.movie_id}",
        )
        result = await reviewed_probe(Settings(), movie)
    else:
        async with httpx.AsyncClient(
            base_url="http://127.0.0.1:8000",
            trust_env=False,
            follow_redirects=False,
            timeout=65,
        ) as client:
            result = await probe(client, args.title, args.movie_id)
    print(json.dumps(result, ensure_ascii=False))
    return 0 if result["ok"] and result.get("testSessionDeleted", True) else 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
