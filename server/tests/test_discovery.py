import json

import pytest
from test_agent import StubBudget, StubLLM, StubMCP, final

from sofia.agent import Agent
from sofia.discovery import Candidate, discover, matches
from sofia.errors import PublicError
from sofia.models import Book, ChatRequest, Movie

MOVIE = Movie(
    id=10830,
    title="Matilda",
    year=1996,
    overview="Una niña afronta dificultades en su escuela.",
    tmdb="https://www.themoviedb.org/movie/10830",
)
BOOK = {
    "id": "live_candidate",
    "title": "Matilda",
    "authors": ["Roald Dahl"],
    "year": 1988,
    "description": "Un resumen que no se copia íntegramente.",
    "url": "https://books.google.com/books?id=live_candidate",
}


async def run(results, replies, usage=None, limit=4):
    mcp, llm = StubMCP(results), StubLLM(replies)
    counts = usage or {"llmRequests": 0, "promptTokens": 0, "completionTokens": 0}
    trace = []
    output = await discover(MOVIE, mcp, llm, StubBudget(), trace, counts, limit)
    return output, mcp, trace, counts


async def test_unknown_movie_searches_books_and_presents_real_candidate(settings):
    mcp = StubMCP([{"adaptation": {"movieId": 10830, "status": "not_found"}}, {"books": [BOOK]}])
    llm = StubLLM([final(json.dumps({"title": "Matilda", "author": "Roald Dahl"}))])
    result = await Agent(settings, llm, mcp, StubBudget()).run(
        ChatRequest(prompt="Compara esa película con su libro sin spoilers"),
        [],
        {"movies": [MOVIE.model_dump()]},
        "request",
    )
    assert [name for name, _ in mcp.calls] == ["adaptation_evidence", "search_books"]
    assert result.response.comparison.adaptation.status == "uncertain"
    assert result.response.comparison.adaptation.book.title == "Matilda"
    assert "Consulté Google Books" in result.response.response
    assert "Roald Dahl" in result.response.response
    assert "Un resumen que" not in result.response.response
    assert result.context["books"][0]["id"] == BOOK["id"]


async def test_alternate_title_is_proposal_not_confirmation():
    book = {**BOOK, "title": "The Snow Queen", "authors": ["Hans Christian Andersen"]}
    (adaptation, books, text), mcp, trace, usage = await run(
        [{"books": []}, {"books": [book]}],
        [final(json.dumps({"title": book["title"], "author": book["authors"][0]}))],
    )
    assert len(mcp.calls) == 2 and "inauthor" in mcp.calls[1][1]["query"]
    assert adaptation.status == "uncertain" and adaptation.book.title == book["title"]
    assert "no verifiqué" in text and books
    assert usage["promptTokens"] == 10
    assert all("query" not in entry.get("arguments", {}) for entry in trace)


@pytest.mark.parametrize(
    "reply",
    [
        final("null"),
        final("invalid json"),
        final(),
        {"message": None},
        {"message": {"content": "x" * 1001}},
        PublicError("upstream_unavailable", "Safe error"),
    ],
)
async def test_model_failure_never_prevents_initial_api_search(reply):
    (adaptation, books, text), mcp, _, _ = await run([{"books": [BOOK]}], [reply])
    assert len(mcp.calls) == 1 and books
    assert adaptation.status == "uncertain" and adaptation.book is None
    assert "Encontré estos libros" in text


async def test_empty_response_is_not_absence_of_book_and_budget_is_bounded():
    (adaptation, _, text), mcp, _, _ = await run(
        [{"books": []}], [], {"llmRequests": 4, "promptTokens": 0, "completionTokens": 0}
    )
    assert adaptation.status == "not_found" and len(mcp.calls) == 1
    assert "no demuestra" in text


async def test_provider_error_propagates_not_fake_absence():
    with pytest.raises(PublicError):
        await run([PublicError("quota_exhausted", "Safe error")], [])


def test_title_alone_does_not_identify_original_work():
    candidate = Candidate(title="Matilda", author="Roald Dahl")
    assert matches(Book.model_validate(BOOK), candidate)
    assert not matches(Book.model_validate({**BOOK, "authors": ["Different author"]}), candidate)
