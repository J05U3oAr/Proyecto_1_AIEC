import json

import pytest
from jsonschema import Draft202012Validator
from pydantic import ValidationError

from sofia.contracts import ROOT, publish, schemas
from sofia.models import Action, Adaptation, Book, ChatRequest, Movie, Source, ToolResult, safe_url
from sofia.tools import TOOLS, definitions, validate_result


def fixture(name):
    return json.loads((ROOT / "fixtures" / f"{name}.json").read_text())


def test_published_contracts_and_legacy():
    assert publish(check=True)
    for schema in schemas().values():
        Draft202012Validator.check_schema(schema)
    Draft202012Validator(schemas()["chat-request"]).validate(fixture("legacy-request"))
    Draft202012Validator(schemas()["chat-response"]).validate(fixture("legacy-response"))
    assert ChatRequest.model_validate(fixture("legacy-request")).prompt
    with pytest.raises(ValidationError):
        ChatRequest.model_validate(fixture("invalid-request"))
    with pytest.raises(ValidationError):
        ToolResult.model_validate(fixture("invalid-tool-result"))


@pytest.mark.parametrize(
    "url,kind",
    [
        ("http://www.imdb.com/title/tt1234567/", "imdb"),
        ("https://www.imdb.com.evil.test/title/tt1234567/", "imdb"),
        ("https://user:pass@www.imdb.com/title/tt1234567/", "imdb"),
        ("https://www.imdb.com:444/title/tt1234567/", "imdb"),
        ("https://www.imdb.com/title/tt1234567/#x", "imdb"),
        ("javascript:alert(1)", "imdb"),
        ("https://books.google.com/books?id=x&next=https://evil.test", "google_books"),
        ("https://books.google.com/books?id=x&id=y", "google_books"),
        ("https://image.tmdb.org/t/p/w500/../../x.jpg", "poster"),
        ("https://image.tmdb.org/t/p/w500/x.jpg?redirect=evil", "poster"),
        ("https://www.themoviedb.org/movie/0", "tmdb"),
        ("https://www.imdb.com/title/tt1234567/\n", "imdb"),
        ("https://www.imdb.com/title/tt1234567/", "unknown"),
    ],
)
def test_url_attack_rejected(url, kind):
    with pytest.raises(ValueError):
        safe_url(url, kind)


def test_resources_require_consistent_ids_and_evidence():
    movie = fixture("movie-result")["movies"][0]
    assert Movie.model_validate(movie).id == 329865
    with pytest.raises(ValidationError):
        Movie.model_validate({**movie, "id": 1})
    with pytest.raises(ValidationError):
        Book(id="x", title="Book", url="https://books.google.com/books?id=y")
    book = Book(id="x", title="Book", url="https://books.google.com/books?id=x")
    assert book.id == "x"
    for values in [{}, {"book": book}]:
        with pytest.raises(ValidationError):
            Adaptation(movieId=1, status="confirmed", **values)
    with pytest.raises(ValidationError):
        Action(
            id="a",
            requestId="r",
            provider="imdb",
            resourceId="wrong",
            url="https://www.imdb.com/title/tt1234567/",
        )
    assert Source(provider="imdb", url=movie["imdb"], label="IMDb").provider == "imdb"
    with pytest.raises(ValidationError):
        ToolResult(movies=[Movie.model_validate(movie)] * 2)


def test_tool_contracts():
    assert len(definitions()) == len(TOOLS) == 5
    result = ToolResult.model_validate(fixture("movie-result"))
    args = TOOLS["movie_details"].arguments.model_validate({"movieId": 329865})
    validate_result("movie_details", args, result)
    with pytest.raises(Exception, match="incompatibles"):
        validate_result(
            "movie_details",
            args,
            ToolResult.model_validate(
                {
                    "movies": [
                        {
                            **fixture("movie-result")["movies"][0],
                            "id": 1,
                            "tmdb": "https://www.themoviedb.org/movie/1",
                        }
                    ]
                }
            ),
        )
    with pytest.raises(ValidationError):
        TOOLS["search_movies"].arguments.model_validate({"query": "x", "limit": 99})


@pytest.mark.parametrize("prompt", ["", "   ", "x" * 4001])
def test_prompt_limits(prompt):
    with pytest.raises(ValidationError):
        ChatRequest(prompt=prompt)


def test_contract_publisher_writes_and_detects_drift(tmp_path, monkeypatch):
    monkeypatch.setattr("sofia.contracts.ROOT", tmp_path)
    assert not publish(check=True)
    assert publish()
    assert publish(check=True)
    (tmp_path / "v1" / "book.schema.json").write_text("{}")
    assert not publish(check=True)


def test_book_and_adaptation_tool_shapes():
    from sofia.errors import PublicError
    from sofia.models import Book

    book = Book(id="x", title="Book", url="https://books.google.com/books?id=x")
    for name, values in [
        ("search_books", {"query": "x", "limit": 1}),
        ("book_details", {"bookId": "x"}),
    ]:
        args = TOOLS[name].arguments.model_validate(values)
        validate_result(name, args, ToolResult(books=[book]))
        with pytest.raises(PublicError):
            validate_result(
                name,
                args,
                ToolResult(movies=[Movie.model_validate(fixture("movie-result")["movies"][0])]),
            )
    args = TOOLS["book_details"].arguments.model_validate({"bookId": "other"})
    with pytest.raises(PublicError):
        validate_result("book_details", args, ToolResult(books=[book]))
    args = TOOLS["adaptation_evidence"].arguments.model_validate({"movieId": 1})
    validate_result(
        "adaptation_evidence",
        args,
        ToolResult(adaptation=Adaptation(movieId=1, status="not_found")),
    )
    with pytest.raises(PublicError):
        validate_result("adaptation_evidence", args, ToolResult())
