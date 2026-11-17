import json

import pytest
from pydantic import ValidationError

from sofia.config import Settings
from sofia.errors import PublicError
from sofia.models import MovieId, SearchMovies, ToolResult
from sofia_evals import runner
from sofia_evals.fixtures import MOVIE, Catalog, ScriptedLLM
from sofia_evals.live import ObservedMCP
from sofia_evals.runner import FunctionalDataset, load_functional_dataset, run_case, run_suite


async def test_remote_observer_preserves_result_and_sanitizes_arguments():
    observer = ObservedMCP(Catalog("safe"))
    result = await observer.call("search_movies", SearchMovies(query="private query"))
    assert result.movies[0].id == 78
    assert observer.events[0]["result"]["movieIds"] == [78]
    assert observer.events[0]["latencyMs"] >= 0
    assert "private query" not in json.dumps(observer.events)


async def test_remote_errors_and_contract_violations_are_recorded():
    observer = ObservedMCP(Catalog("quota"))
    with pytest.raises(PublicError):
        await observer.call("adaptation_evidence", MovieId(movieId=78))
    assert observer.events[0]["code"] == "quota_exhausted"

    class InvalidRemote:
        async def call(self, name, arguments):
            return ToolResult(movies=[])

    observer = ObservedMCP(InvalidRemote())
    with pytest.raises(PublicError):
        await observer.call("adaptation_evidence", MovieId(movieId=78))
    assert observer.events[0]["code"] == "invalid_tool_result"


@pytest.mark.parametrize("mutation", ["duplicate", "fixture", "attack", "tool", "setup"])
def test_live_manifest_forbids_fixture_setups_and_security_cases(mutation):
    payload = load_functional_dataset()[0].model_dump()
    if mutation == "duplicate":
        payload["cases"][1]["id"] = payload["cases"][0]["id"]
    if mutation == "fixture":
        payload["cases"][0]["scenario"] = "recommend"
    if mutation == "attack":
        payload["cases"][0]["category"] = "LLM01"
    if mutation == "tool":
        payload["cases"][0]["allowedTools"] = ["shell"]
    if mutation == "setup":
        payload["cases"][0]["setup"] = "selected"
    with pytest.raises(ValidationError):
        FunctionalDataset.model_validate(payload)


async def test_live_mode_uses_empty_context_production_adapters_and_no_fixtures(monkeypatch):
    monkeypatch.setenv("NVIDIA_API_KEY", "synthetic-test-key")
    real_cases = load_functional_dataset()[0]
    case = next(case for case in real_cases.cases if case.id == "live-confirmed")
    monkeypatch.setattr(
        runner,
        "load_functional_dataset",
        lambda: (real_cases.model_copy(update={"cases": [case]}), "synthetic-unit-hash"),
    )
    catalog = Catalog("safe")
    monkeypatch.setattr(runner, "RemoteMCP", lambda settings: catalog)
    monkeypatch.setattr(runner, "NvidiaLLM", lambda *args: ScriptedLLM("safe"))

    class NoFixture:
        def __init__(self, *args):
            raise AssertionError("Live mode must not instantiate synthetic Catalog")

    monkeypatch.setattr(runner, "Catalog", NoFixture)

    class Budget:
        def __init__(self, *args):
            pass

        async def take(self):
            pass

    monkeypatch.setattr(runner, "Budget", Budget)
    report = await run_suite("live-services", 1, confirm_no_billing=True)
    assert report["passed"]
    assert report["catalog"] == "production_RemoteMCP_TMDB_Google_Books"
    assert report["scope"] == "functional_only_no_fault_injection_or_OWASP"
    row = report["runs"][0]["cases"][0]
    assert [event["tool"] for event in row["tools"]] == ["search_movies", "adaptation_evidence"]
    assert all(event["transport"] == "production_MCP" for event in row["tools"])
    assert row["observedResponses"][0]["movieIds"] == [78]


async def test_live_mode_does_not_replace_failed_services_with_fixtures():
    class FailedRemote:
        async def call(self, name, arguments):
            raise PublicError("provider_timeout", "Safe error")

    case = next(case for case in load_functional_dataset()[0].cases if case.id == "live-selection")
    result = await run_case(
        case, Settings(), llm=ScriptedLLM("safe"), mcp=ObservedMCP(FailedRemote())
    )
    assert not result["passed"] and result["error"] == "provider_timeout"
    assert result["observedResponses"] == []


async def test_nonmatching_movie_from_live_service_fails():
    class WrongMovie:
        async def call(self, name, arguments):
            return ToolResult.model_validate(
                {"movies": [{**MOVIE, "id": 79, "tmdb": "https://www.themoviedb.org/movie/79"}]}
            )

    case = next(case for case in load_functional_dataset()[0].cases if case.id == "live-selection")
    result = await run_case(case, Settings(), mcp=ObservedMCP(WrongMovie()))
    assert not result["checks"]["expectedMovieSelected"]


async def test_live_mode_requires_confirmation(monkeypatch):
    monkeypatch.setenv("NVIDIA_API_KEY", "synthetic-key")
    with pytest.raises(ValueError):
        await run_suite("live-services", 1)
