import json

import httpx
import pytest
from test_comparison import MOVIE, adaptation

from scripts.probe_comparison import probe
from sofia.comparison import build_comparison
from sofia.models import ChatResponse


@pytest.mark.parametrize(
    "mode",
    [
        "ok",
        "missing_movie",
        "missing_token",
        "first_http",
        "second_http",
        "invalid_json",
        "missing_comparison",
        "transport",
        "cleanup_http",
        "cleanup_transport",
    ],
)
async def test_http_probe_uses_own_session_and_never_exports_token(mode):
    calls = []

    def handler(request):
        calls.append(request)
        if mode == "transport":
            raise httpx.ConnectError("synthetic-private-token")
        if request.method == "DELETE":
            assert request.url.path == "/api/session/fixture_session"
            assert request.headers["X-Session-Token"] == "synthetic-private-token"
            if mode == "cleanup_transport":
                raise httpx.ConnectError("synthetic-private-token")
            return httpx.Response(503 if mode == "cleanup_http" else 204)
        body = json.loads(request.content)
        if "sessionId" not in body:
            if mode == "first_http":
                return httpx.Response(503, json={"private": "synthetic-private-token"})
            if mode == "invalid_json":
                return httpx.Response(200, content=b"not JSON")
            response = ChatResponse(
                response="Selected",
                sessionId="fixture_session",
                movies=[] if mode == "missing_movie" else [MOVIE],
            )
            return httpx.Response(
                200,
                json=response.model_dump(),
                headers={}
                if mode == "missing_token"
                else {"X-Session-Token": "synthetic-private-token"},
            )
        assert body["sessionId"] == "fixture_session"
        assert "sin spoilers" in body["prompt"]
        assert request.headers["X-Session-Token"] == "synthetic-private-token"
        if mode == "second_http":
            return httpx.Response(503, json={"private": "synthetic-private-token"})
        response = ChatResponse(
            response="Comparison",
            movies=[MOVIE],
            comparison=None
            if mode == "missing_comparison"
            else build_comparison(MOVIE, adaptation()),
        )
        return httpx.Response(200, json=response.model_dump())

    async with httpx.AsyncClient(
        base_url="http://localhost",
        transport=httpx.MockTransport(handler),
        trust_env=False,
    ) as client:
        result = await probe(client, "Blade Runner 1982", 78)
    assert "synthetic-private-token" not in json.dumps(result)
    assert result["ok"] == (mode in {"ok", "cleanup_http", "cleanup_transport"})
    if mode in {"cleanup_http", "cleanup_transport", "missing_token"}:
        assert result["testSessionDeleted"] is False
    else:
        assert result["testSessionDeleted"] is True
    if mode == "ok":
        assert result["adaptationStatus"] == "confirmed" and len(calls) == 3


async def test_comparison_probe_cli_is_explicit_and_reports_exit_status(monkeypatch, capsys):
    import sys
    from unittest.mock import AsyncMock

    from scripts import probe_comparison

    monkeypatch.setattr(sys, "argv", ["probe"])
    with pytest.raises(SystemExit):
        await probe_comparison.main()
    monkeypatch.setattr(sys, "argv", ["probe", "--confirm-no-billing", "--movie-id", "0"])
    with pytest.raises(SystemExit):
        await probe_comparison.main()
    monkeypatch.setattr(sys, "argv", ["probe", "--confirm-no-billing"])
    monkeypatch.setattr(
        probe_comparison, "probe", AsyncMock(return_value={"ok": True, "testSessionDeleted": True})
    )
    assert await probe_comparison.main() == 0
    assert "true" in capsys.readouterr().out


def test_comparison_probe_entrypoint_requires_confirmation(monkeypatch):
    import runpy
    import sys
    from pathlib import Path

    path = Path(__file__).resolve().parents[1] / "scripts/probe_comparison.py"
    monkeypatch.setattr(sys, "argv", ["probe"])
    with pytest.raises(SystemExit) as stopped:
        runpy.run_path(str(path), run_name="__main__")
    assert stopped.value.code == 2


@pytest.mark.parametrize("failed", [False, True])
async def test_reviewed_mode_exercises_real_agent_without_tmdb_or_llm(failed):
    from test_agent import StubMCP

    from scripts.probe_comparison import NoLLM, reviewed_probe
    from sofia.config import Settings
    from sofia.errors import PublicError

    remote = StubMCP(
        [
            PublicError("provider_timeout", "synthetic-private-token")
            if failed
            else {"adaptation": adaptation().model_dump()},
        ]
    )
    result = await reviewed_probe(Settings(_env_file=None), MOVIE, remote)
    assert result["ok"] == (not failed)
    assert "synthetic-private-token" not in json.dumps(result)
    assert remote.calls == [("adaptation_evidence", {"movieId": 78})]
    if not failed:
        assert result["mode"] == "reviewed_movie_live_books"
        assert result["usage"]["llmRequests"] == 0
    with pytest.raises(PublicError, match="inferencia"):
        await NoLLM().complete([])


async def test_reviewed_probe_cli_validates_identity_and_dispatches(monkeypatch):
    import sys
    from unittest.mock import AsyncMock

    from scripts import probe_comparison

    monkeypatch.setattr(
        sys,
        "argv",
        ["probe", "--confirm-no-billing", "--reviewed-movie", "--title", "Blade Runner"],
    )
    with pytest.raises(SystemExit):
        await probe_comparison.main()
    monkeypatch.setattr(sys, "argv", ["probe", "--confirm-no-billing", "--reviewed-movie"])
    fake = AsyncMock(return_value={"ok": True})
    monkeypatch.setattr(probe_comparison, "reviewed_probe", fake)
    assert await probe_comparison.main() == 0
    assert fake.call_args.args[1].id == 78
