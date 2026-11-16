"""TMDB adapter. Fixed HTTPS origin/routes, no redirects or arbitrary fetch tool."""

import asyncio
import json
import re
import unicodedata
from datetime import UTC, datetime
from email.utils import parsedate_to_datetime
from typing import Annotated, cast

import httpx
from pydantic import BaseModel, ConfigDict, Field, StringConstraints, ValidationError

from catalog_common.cache import CatalogCache, CatalogError
from sofia.models import Movie, MovieId, SearchMovies, ToolResult


class RawGenre(BaseModel):
    model_config = ConfigDict(strict=True)
    id: int = Field(gt=0)
    name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]


class RawMovie(BaseModel):
    model_config = ConfigDict(strict=True)
    id: int = Field(gt=0)
    title: Annotated[str, StringConstraints(min_length=1, max_length=300)]
    release_date: str = ""
    overview: Annotated[str, StringConstraints(max_length=4000)] = ""
    poster_path: str | None = None
    imdb_id: str | None = None
    genre_ids: list[int] = Field(default_factory=list, max_length=30)
    genres: list[RawGenre] = Field(default_factory=list, max_length=30)
    runtime: int | None = Field(default=None, ge=0, le=10000)
    vote_average: float | None = Field(default=None, ge=0, le=10, allow_inf_nan=False)
    vote_count: int | None = Field(default=None, ge=0)
    adult: bool = False

    def year(self) -> int | None:
        if not self.release_date:
            return None
        return datetime.strptime(self.release_date, "%Y-%m-%d").year


def normalize(text: str) -> str:
    return "".join(
        c for c in unicodedata.normalize("NFKD", text.casefold()) if not unicodedata.combining(c)
    ).strip()


def retry_seconds(value: str) -> int:
    try:
        seconds = (
            int(value)
            if value.isdigit()
            else int((parsedate_to_datetime(value) - datetime.now(UTC)).total_seconds())
        )
        return max(1, min(seconds, 86400))
    except (ValueError, TypeError, OverflowError):
        return 60


class TMDB:
    def __init__(
        self,
        client: httpx.AsyncClient,
        cache: CatalogCache,
        token: str,
        retries: int = 1,
        timeout: float = 8,
    ) -> None:
        if retries not in (0, 1) or not 0.1 <= timeout <= 10:
            raise ValueError("Invalid request limits")
        self.client, self.cache, self.token = client, cache, token
        self.retries, self.timeout = retries, timeout

    async def _request(self, path: str, params: dict[str, str]) -> dict[str, object]:
        if not self.token:
            raise CatalogError("provider_not_configured")
        for attempt in range(self.retries + 1):
            await self.cache.take()
            try:
                async with asyncio.timeout(self.timeout):
                    async with self.client.stream(
                        "GET",
                        f"https://api.themoviedb.org/3{path}",
                        params=params,
                        headers={"Authorization": f"Bearer {self.token}"},
                        follow_redirects=False,
                        timeout=self.timeout,
                    ) as response:
                        status = response.status_code
                        if status == 429:
                            delay = retry_seconds(response.headers.get("Retry-After", "60"))
                            await self.cache.cooldown(delay)
                            raise CatalogError("provider_rate_limited", True, delay)
                        if status in (401, 403):
                            raise CatalogError("provider_not_configured")
                        if status == 404 and re.fullmatch(r"/movie/[1-9][0-9]*", path):
                            return {"_not_found": True}
                        if status != 200:
                            if status in (502, 503, 504) and attempt < self.retries:
                                await asyncio.sleep(0.1)
                                continue
                            raise CatalogError("provider_unavailable", status >= 500)
                        body = bytearray()
                        async for chunk in response.aiter_bytes():
                            body.extend(chunk)
                            if len(body) > 1048576:
                                raise CatalogError("invalid_provider_result")
                        return self._validate(path, json.loads(body))
            except (TimeoutError, httpx.TransportError):
                if attempt == self.retries:
                    raise CatalogError("provider_timeout", True) from None
                await asyncio.sleep(0.1)
            except (ValueError, KeyError, TypeError, ValidationError):
                raise CatalogError("invalid_provider_result") from None
        raise CatalogError("provider_unavailable", True)

    def _validate(self, path: str, payload: object) -> dict[str, object]:
        if not isinstance(payload, dict):
            raise ValueError("Expected object")
        if path == "/configuration":
            images = payload["images"]
            if images["secure_base_url"] != "https://image.tmdb.org/t/p/":
                raise ValueError("Invalid poster origin")
            if "w500" not in images["poster_sizes"]:
                raise ValueError("Unsupported poster size")
            return {
                "images": {
                    "secure_base_url": images["secure_base_url"],
                    "poster_sizes": ["w500"],
                }
            }
        if path == "/genre/movie/list":
            genres = payload["genres"]
            if not isinstance(genres, list) or len(genres) > 100:
                raise ValueError("Invalid genres")
            for item in genres:
                if (
                    not isinstance(item, dict)
                    or type(item.get("id")) is not int
                    or not isinstance(item.get("name"), str)
                ):
                    raise ValueError("Invalid genre")
            return {"genres": genres}
        listing = path in {"/search/movie", "/discover/movie"}
        items = payload["results"] if listing else [payload]
        if not isinstance(items, list) or len(items) > 20:
            raise ValueError("Invalid results")
        movies = []
        for item in items:
            raw = RawMovie.model_validate(item)
            self._movie(raw, "https://image.tmdb.org/t/p/w500")
            if not listing and raw.id != int(path.rsplit("/", 1)[1]):
                raise ValueError("ID mismatch")
            movies.append(raw.model_dump())
        return {"results": movies} if listing else movies[0]

    async def _get(self, path: str, params: dict[str, str] | None = None) -> dict[str, object]:
        # Only adapter-owned paths reach this method; user values are query params, not URLs.
        if not re.fullmatch(
            r"/(configuration|genre/movie/list|search/movie|discover/movie|movie/[1-9][0-9]*)",
            path,
        ):
            raise CatalogError("invalid_arguments")
        query = {"language": "es-ES", **(params or {})}
        # Version raw payloads so pre-metadata cache entries cannot hide the new fields.
        key = json.dumps(["movie-metadata-v1", path, query], sort_keys=True)
        return await self.cache.get(key, lambda: self._request(path, query))

    @staticmethod
    def _movie(raw: RawMovie, image_base: str | None) -> Movie:
        # The contract validator enforces exact domains, routes, IDs and file paths.
        return Movie(
            id=raw.id,
            title=raw.title,
            year=raw.year(),
            overview=raw.overview[:2000],
            genres=list(dict.fromkeys(genre.name for genre in raw.genres)),
            runtime=raw.runtime or None,
            tmdbRating=raw.vote_average if raw.vote_count else None,
            voteCount=raw.vote_count,
            poster=(image_base + raw.poster_path) if raw.poster_path and image_base else None,
            tmdb=f"https://www.themoviedb.org/movie/{raw.id}",
            imdb=f"https://www.imdb.com/title/{raw.imdb_id}/" if raw.imdb_id else None,
        )

    async def _image_base(self) -> str:
        await self._get("/configuration")
        return "https://image.tmdb.org/t/p/w500"

    async def details(self, args: MovieId) -> ToolResult:
        raw = await self._get(f"/movie/{args.movieId}")
        if raw.get("_not_found"):
            return ToolResult()
        movie = RawMovie.model_validate(raw)
        if movie.adult:
            return ToolResult()
        base = await self._image_base() if movie.poster_path else None
        return ToolResult(movies=[self._movie(movie, base)])

    async def search(self, args: SearchMovies) -> ToolResult:
        genre_id: int | None = None
        query = normalize(args.query)
        genre = normalize(args.genre) if args.genre else query
        # Genre names come from TMDB, not a hallucinated mapping by the model.
        if args.genre or query in {
            "ciencia ficcion",
            "comedia",
            "drama",
            "terror",
            "accion",
        }:
            genres = await self._get("/genre/movie/list")
            for item in cast(list[dict[str, object]], genres["genres"]):
                if normalize(cast(str, item["name"])) == genre:
                    genre_id = cast(int, item["id"])
            if genre_id is None:
                raise CatalogError("unsupported_genre")
        discovery = genre_id is not None and (
            query == genre or query in {"recomendaciones", "peliculas", "recommendations"}
        )
        params = {"include_adult": "false", "page": "1"}
        if discovery:
            params.update({"with_genres": str(genre_id), "sort_by": "popularity.desc"})
            if args.maxRuntime is not None:
                params["with_runtime.lte"] = str(args.maxRuntime)
        else:
            params["query"] = args.query
        result = await self._get("/discover/movie" if discovery else "/search/movie", params)
        movies = []
        seen: set[int] = set()
        checked = 0
        for item in cast(list[dict[str, object]], result["results"]):
            raw = RawMovie.model_validate(item)
            if raw.id in seen or raw.adult:
                continue
            seen.add(raw.id)
            if genre_id is not None and genre_id not in raw.genre_ids:
                continue
            # Fetch bounded details for runtime and verified IMDb ID (at most 5 candidates).
            if checked >= 5:
                break
            checked += 1
            details = await self._get(f"/movie/{raw.id}")
            if details.get("_not_found"):
                continue
            raw = RawMovie.model_validate(details)
            if raw.adult or (
                args.maxRuntime is not None
                and (raw.runtime is None or raw.runtime == 0 or raw.runtime > args.maxRuntime)
            ):
                continue
            base = await self._image_base() if raw.poster_path else None
            movies.append(self._movie(raw, base))
            if len(movies) == args.limit:
                break
        return ToolResult(movies=movies)
