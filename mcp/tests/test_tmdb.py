import uuid

import httpx
import pytest

from catalog_common.cache import CatalogCache, CatalogError
from movies.tmdb import TMDB
from sofia.models import MovieId, SearchMovies

RAW = {
    "id": 438631,
    "title": "Dune",
    "release_date": "2021-09-15",
    "overview": "Adaptación de ciencia ficción.",
    "poster_path": "/dune.jpg",
    "genre_ids": [878],
    "runtime": 155,
    "imdb_id": "tt1160419",
}


@pytest.fixture
def make_catalog(cache_redis):
    def build(handler, limit=1000, retries=1):
        client = httpx.AsyncClient(transport=httpx.MockTransport(handler), trust_env=False)
        cache = CatalogCache(cache_redis, "test-" + uuid.uuid4().hex, daily_limit=limit)
        return TMDB(client, cache, "synthetic-token", retries=retries)

    return build


async def test_title_search_details_poster_imdb_and_cache(make_catalog):
    calls = []

    def handler(request):
        calls.append(request)
        assert request.url.host == "api.themoviedb.org"
        assert request.headers["Authorization"] == "Bearer synthetic-token"
        assert "synthetic-token" not in str(request.url)
        if request.url.path.endswith("/configuration"):
            return httpx.Response(
                200,
                json={
                    "images": {
                        "secure_base_url": "https://image.tmdb.org/t/p/",
                        "poster_sizes": ["w500"],
                    }
                },
            )
        return httpx.Response(
            200, json={"results": [RAW]} if "/search/" in request.url.path else RAW
        )

    catalog = make_catalog(handler)
    result = await catalog.search(SearchMovies(query="Dune"))
    movie = result.movies[0]
    assert movie.poster == "https://image.tmdb.org/t/p/w500/dune.jpg"
    assert movie.imdb == "https://www.imdb.com/title/tt1160419/"
    assert movie.year == 2021
    assert (await catalog.details(MovieId(movieId=438631))).movies == [movie]
    assert (await catalog.search(SearchMovies(query="Dune"))).movies == [movie]
    assert len(calls) == 3


async def test_discovery_filters_are_enforced(make_catalog):
    def handler(request):
        if "/genre/" in request.url.path:
            return httpx.Response(200, json={"genres": [{"id": 878, "name": "Ciencia ficción"}]})
        if "/discover/" in request.url.path:
            assert request.url.params["with_genres"] == "878"
            assert request.url.params["with_runtime.lte"] == "160"
            return httpx.Response(200, json={"results": [RAW, {**RAW, "id": 10}]})
        if "/configuration" in request.url.path:
            return httpx.Response(
                200,
                json={
                    "images": {
                        "secure_base_url": "https://image.tmdb.org/t/p/",
                        "poster_sizes": ["w500"],
                    }
                },
            )
        return httpx.Response(
            200,
            json={**RAW, "id": 10, "runtime": 170} if request.url.path.endswith("/10") else RAW,
        )

    result = await make_catalog(handler).search(
        SearchMovies(query="recomendaciones", genre="ciencia ficción", maxRuntime=160, limit=2)
    )
    assert [m.id for m in result.movies] == [438631]


@pytest.mark.parametrize(
    "status,code",
    [
        (401, "provider_not_configured"),
        (429, "provider_rate_limited"),
        (500, "provider_unavailable"),
        (302, "provider_unavailable"),
    ],
)
async def test_http_failures_are_sanitized_and_do_not_cache(make_catalog, status, code):
    calls = []

    def handler(request):
        calls.append(request)
        return httpx.Response(
            status,
            headers={"Retry-After": "3", "Location": "https://evil.test"},
            text="private-provider-token",
        )

    catalog = make_catalog(handler, retries=0)
    with pytest.raises(CatalogError, match=code) as err:
        await catalog.details(MovieId(movieId=1))
    assert "private" not in str(err.value)
    assert len(calls) == 1


async def test_not_found_and_missing_optional_data(make_catalog):
    def handler(request):
        if request.url.path.endswith("/9"):
            return httpx.Response(404)
        return httpx.Response(
            200, json={**RAW, "poster_path": None, "imdb_id": None, "release_date": ""}
        )

    catalog = make_catalog(handler)
    assert (await catalog.details(MovieId(movieId=9))).movies == []
    movie = (await catalog.details(MovieId(movieId=438631))).movies[0]
    assert movie.poster is None and movie.imdb is None and movie.year is None


@pytest.mark.parametrize(
    "payload",
    [
        {**RAW, "poster_path": "https://evil.test/a.jpg"},
        {**RAW, "imdb_id": "tt123/../../evil"},
        {**RAW, "id": "438631"},
        {**RAW, "release_date": "not-a-date"},
        {**RAW, "title": ""},
        {**RAW, "id": 1},
        {"untrusted": "not a movie"},
    ],
)
async def test_malformed_upstream_is_rejected(make_catalog, payload):
    catalog = make_catalog(lambda r: httpx.Response(200, json=payload))
    with pytest.raises(CatalogError, match="invalid_provider_result"):
        await catalog.details(MovieId(movieId=438631))


async def test_retry_counts_every_attempt_and_stops_at_budget(make_catalog):
    calls = 0

    def handler(request):
        nonlocal calls
        calls += 1
        return httpx.Response(503)

    catalog = make_catalog(handler, limit=1)
    with pytest.raises(CatalogError, match="quota_exhausted"):
        await catalog.details(MovieId(movieId=1))
    assert calls == 1


@pytest.mark.parametrize(
    "payload",
    [
        [],
        {"results": "bad"},
        {"results": [RAW] * 21},
    ],
)
async def test_invalid_listing_shape(make_catalog, payload):
    catalog = make_catalog(lambda _: httpx.Response(200, json=payload))
    with pytest.raises(CatalogError, match="invalid_provider_result"):
        await catalog.search(SearchMovies(query="Dune"))


@pytest.mark.parametrize(
    "payload",
    [
        {"genres": "bad"},
        {"genres": [{"id": "878", "name": "Bad"}]},
    ],
)
async def test_invalid_genres(make_catalog, payload):
    catalog = make_catalog(lambda _: httpx.Response(200, json=payload))
    with pytest.raises(CatalogError, match="invalid_provider_result"):
        await catalog.search(SearchMovies(query="comedia"))


@pytest.mark.parametrize(
    "images",
    [
        {"secure_base_url": "https://evil.test/", "poster_sizes": ["w500"]},
        {"secure_base_url": "https://image.tmdb.org/t/p/", "poster_sizes": ["original"]},
    ],
)
async def test_poster_configuration_is_not_an_arbitrary_url(make_catalog, images):
    def handler(request):
        return httpx.Response(
            200, json={"images": images} if "/configuration" in request.url.path else RAW
        )

    with pytest.raises(CatalogError, match="invalid_provider_result"):
        await make_catalog(handler).details(MovieId(movieId=438631))


async def test_empty_adult_unknown_genre_and_fixed_paths(make_catalog):
    catalog = make_catalog(lambda _: httpx.Response(200, json={"results": []}))
    assert (await catalog.search(SearchMovies(query="no-match"))).movies == []
    adult = make_catalog(lambda _: httpx.Response(200, json={**RAW, "adult": True}))
    assert (await adult.details(MovieId(movieId=438631))).movies == []
    genres = make_catalog(lambda _: httpx.Response(200, json={"genres": []}))
    with pytest.raises(CatalogError, match="unsupported_genre"):
        await genres.search(SearchMovies(query="x", genre="unsupported"))
    with pytest.raises(CatalogError, match="invalid_arguments"):
        await catalog._get("https://evil.test")


async def test_transport_retries_are_bounded_and_counted(make_catalog):
    calls = []

    def fail(request):
        calls.append(request)
        raise httpx.ReadTimeout("private-transport-error")

    catalog = make_catalog(fail)
    with pytest.raises(CatalogError, match="provider_timeout"):
        await catalog.details(MovieId(movieId=1))
    assert len(calls) == 2
    catalog.token = ""
    with pytest.raises(CatalogError, match="provider_not_configured"):
        await catalog.details(MovieId(movieId=1))


async def test_transient_response_retries_and_invalid_json_size(make_catalog):
    calls = []

    def handler(request):
        calls.append(request)
        return (
            httpx.Response(503)
            if len(calls) == 1
            else httpx.Response(200, json={**RAW, "poster_path": None})
        )

    catalog = make_catalog(handler)
    assert (await catalog.details(MovieId(movieId=438631))).movies
    assert len(calls) == 2
    for content in [b"not-json", b"x" * 1048577]:
        catalog = make_catalog(lambda _, content=content: httpx.Response(200, content=content))
        with pytest.raises(CatalogError, match="invalid_provider_result"):
            await catalog.details(MovieId(movieId=1))


def test_retry_after_and_settings():
    from datetime import UTC, datetime, timedelta
    from email.utils import format_datetime

    from movies.tmdb import retry_seconds

    assert retry_seconds("bad") == 60
    assert retry_seconds("999999") == 86400
    assert 1 <= retry_seconds(format_datetime(datetime.now(UTC) + timedelta(seconds=30))) <= 30
    with pytest.raises(ValueError):
        TMDB(None, None, "", retries=2)


async def test_rejected_genres_do_not_consume_detail_candidate_budget(make_catalog):
    queried = []

    def handler(request):
        path = request.url.path
        if "/genre/" in path:
            return httpx.Response(200, json={"genres": [{"id": 878, "name": "Ciencia ficción"}]})
        if "/search/" in path:
            return httpx.Response(
                200,
                json={
                    "results": [*[{**RAW, "id": i, "genre_ids": [18]} for i in range(1, 6)], RAW]
                },
            )
        if "/configuration" in path:
            return httpx.Response(
                200,
                json={
                    "images": {
                        "secure_base_url": "https://image.tmdb.org/t/p/",
                        "poster_sizes": ["w500"],
                    }
                },
            )
        queried.append(path)
        return httpx.Response(200, json=RAW)

    result = await make_catalog(handler).search(SearchMovies(query="Dune", genre="Ciencia ficción"))
    assert [m.id for m in result.movies] == [438631]
    assert queried == ["/3/movie/438631"]
