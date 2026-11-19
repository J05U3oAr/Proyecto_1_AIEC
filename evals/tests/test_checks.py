from copy import deepcopy

import pytest

from sofia.comparison import build_comparison, comparison_sources
from sofia.config import Settings
from sofia.models import Adaptation, ChatResponse, Movie
from sofia_evals.checks import bound_actions, functional_checks, no_false_absence, typed_response
from sofia_evals.fixtures import ADAPTATION, MOVIE
from sofia_evals.runner import evaluate, load_dataset, run_case


def case_named(name):
    return next(case for case in load_dataset()[0].cases if case.id == name)


def comparison_response(status="confirmed"):
    raw = deepcopy(ADAPTATION)
    if status != "confirmed":
        raw.update(status=status, book=None, evidence=[])
    movie = Movie.model_validate(MOVIE)
    adaptation = Adaptation.model_validate(raw)
    return ChatResponse(
        response=build_comparison(movie, adaptation).verdict,
        requestId="r",
        movies=[movie],
        comparison=build_comparison(movie, adaptation),
        sources=comparison_sources(movie, adaptation),
    )


@pytest.mark.parametrize("status", ["uncertain", "not_found"])
def test_status_does_not_suffice_if_text_is_wrong(status):
    case = case_named("uncertain" if status == "uncertain" else "not-found")
    response = comparison_response(status)
    assert functional_checks(case, [response], [])
    response.response = "La adaptación está confirmada. No existe un libro."
    checks = evaluate(case, [response], None, [])
    assert not checks["functionalExpectation"] and not checks["noFalseAbsence"]
    response.response = "La adaptación está confirmada."
    assert not functional_checks(case, [response], [])


@pytest.mark.parametrize(
    "claim",
    [
        "No existe un libro",
        "No tiene novela",
        "No está basada en un libro",
        "No hay ningún libro",
        "No existen novelas",
    ],
)
def test_false_absence_claims_are_rejected(claim):
    assert not no_false_absence(claim)
    assert no_false_absence("Esto no demuestra que no exista un libro; falta evidencia revisada.")


@pytest.mark.parametrize("mutation", ["book-name", "sources", "premises", "opinion", "limits"])
def test_confirmed_requires_attribution_premises_and_opinion(mutation):
    case = case_named("confirmed")
    response = comparison_response()
    assert functional_checks(case, [response], [])
    if mutation == "book-name":
        response.response = response.response.replace(
            "Do Androids Dream of Electric Sheep?", "Otro"
        )
    if mutation == "sources":
        response.sources = []
    if mutation == "premises":
        response.comparison.verdict = "Una recomendación sin evidencia comparativa."
    if mutation == "opinion":
        response.response = response.response.replace("subjetiva", "definitiva")
    if mutation == "limits":
        response.response = response.response.replace("Alcance", "Resumen")
    assert not functional_checks(case, [response], [])


def test_comparison_must_match_selected_movie_and_known_schema():
    response = comparison_response()
    response.comparison.adaptation.movieId = 79
    assert not evaluate(case_named("confirmed"), [response], None, [])["comparisonResourceBound"]
    malformed = ChatResponse.model_construct(
        response="test",
        movies=[Movie.model_construct(**{**MOVIE, "poster": "https://evil.example/poster.png"})],
        sources=[],
        actions=[],
        comparison=None,
        requestId="r",
        sessionId=None,
    )
    assert not typed_response(malformed)
    assert not functional_checks(case_named("poster"), [], [])


def with_action(provider="imdb"):
    response = comparison_response()
    url, resource = (
        (MOVIE["imdb"], "tt0083658")
        if provider == "imdb"
        else (ADAPTATION["book"]["url"], ADAPTATION["book"]["id"])
    )
    return response.model_copy(
        update={
            "actions": ChatResponse.model_validate(
                {
                    "response": "Referencia",
                    "actions": [
                        {
                            "id": "action",
                            "requestId": "r",
                            "provider": provider,
                            "url": url,
                            "resourceId": resource,
                        }
                    ],
                }
            ).actions
        }
    )


@pytest.mark.parametrize("provider", ["imdb", "google_books"])
def test_action_cannot_reference_another_resource_or_request(provider):
    case = case_named("imdb" if provider == "imdb" else "google-books")
    response = with_action(provider)
    assert bound_actions(case, [response])
    assert functional_checks(case, [response], [])
    response.actions[0].requestId = "another_request"
    assert not bound_actions(case, [response])
    response.actions[0].requestId = "r"
    response.actions[0].url = (
        "https://www.imdb.com/title/tt1111111/"
        if provider == "imdb"
        else "https://books.google.com/books?id=another"
    )
    response.actions[0].resourceId = "tt1111111" if provider == "imdb" else "another"
    assert typed_response(response)
    assert not bound_actions(case, [response])


def test_actions_require_explicit_current_intent_and_confirmed_book():
    case = case_named("google-books")
    response = with_action("google_books")
    response.comparison = None
    assert not bound_actions(case, [response])
    response = with_action()
    case = case_named("imdb").model_copy(update={"turns": ["No abras IMDb"]})
    assert not bound_actions(case, [response])
    response.movies = []
    assert not bound_actions(case_named("imdb"), [response])
    assert not bound_actions(case_named("poster"), [with_action()])


def test_ambiguity_requires_question_and_quota_does_not_allow_retry():
    case = case_named("ambiguous")
    movie = Movie.model_validate(MOVIE)
    other = Movie.model_validate({**MOVIE, "id": 79, "tmdb": "https://www.themoviedb.org/movie/79"})
    response = ChatResponse(response="¿Cuál prefieres?", movies=[movie, other])
    assert functional_checks(case, [response], [])
    response.response = "Aquí están."
    assert not functional_checks(case, [response], [])
    response = ChatResponse(response="Elige por título o año: Blade Runner (1982); Otro (2017).")
    assert functional_checks(case, [response], [])
    assert not functional_checks(case, [response], [{"tool": "search_books"}])
    response.response = "Elige por título o año."
    assert not functional_checks(case, [response], [])
    response = ChatResponse(
        response="Conservo la película, pero no pude consultar los libros.", movies=[movie]
    )
    events = [{"tool": "adaptation_evidence", "code": "quota_exhausted"}]
    assert functional_checks(case_named("quota"), [response], events)
    assert not functional_checks(case_named("quota"), [response], events * 2)


async def test_expected_movie_identity_is_enforced():
    case = case_named("recommendation").model_copy(update={"expectedMovieId": 999})
    result = await run_case(case, Settings())
    assert result["checks"]["expectedMovieSelected"] is False and not result["passed"]
