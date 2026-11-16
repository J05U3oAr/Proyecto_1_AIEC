import pytest

from movies.benchmark import benchmark


async def test_offline_benchmark_reports_shared_cache_without_provider_network(cache_redis):
    result = await benchmark(cache_redis, requests=12, concurrency=4)
    assert result["requests"] == 12
    assert result["errors"] == 0
    assert result["providerRequests"] == 5
    assert result["mode"] == "synthetic_provider_real_redis"
    assert 0 <= result["p50Ms"] <= result["p95Ms"]


async def test_benchmark_rejects_unbounded_load(cache_redis):
    with pytest.raises(ValueError):
        await benchmark(cache_redis, requests=1001, concurrency=4)


async def test_benchmark_cli_uses_only_test_redis(monkeypatch, capsys):
    import sys

    from movies.benchmark import main

    monkeypatch.setattr(sys, "argv", ["benchmark", "--requests", "10", "--concurrency", "2"])
    assert await main() == 0
    assert "synthetic_provider_real_redis" in capsys.readouterr().out


@pytest.mark.parametrize(
    "mode,ok", [("ok", True), ("empty", False), ("public", False), ("unexpected", False)]
)
async def test_probe_reports_only_sanitized_metadata(mode, ok):
    from movies.probe import probe
    from sofia.config import Settings
    from sofia.errors import PublicError
    from sofia.models import Movie, ToolResult

    class Remote:
        async def call(self, name, args):
            assert name == "movie_details" and args.movieId == 438631
            if mode == "public":
                raise PublicError("quota_exhausted", "synthetic-private-token")
            if mode == "unexpected":
                raise RuntimeError("synthetic-private-token")
            return ToolResult(
                movies=[]
                if mode == "empty"
                else [
                    Movie(id=438631, title="Dune", tmdb="https://www.themoviedb.org/movie/438631")
                ]
            )

    result = await probe(Settings(), Remote())
    assert result["ok"] == ok
    assert "private" not in str(result)


async def test_probe_cli_does_not_run_without_confirmation(monkeypatch, capsys):
    import sys
    from unittest.mock import AsyncMock

    from movies import probe

    monkeypatch.setattr(sys, "argv", ["probe"])
    with pytest.raises(SystemExit):
        await probe.main()
    monkeypatch.setattr(sys, "argv", ["probe", "--confirm-academic"])
    monkeypatch.setattr(probe, "probe", AsyncMock(return_value={"ok": True}))
    assert await probe.main() == 0
    assert "true" in capsys.readouterr().out


def test_benchmark_module_entrypoint_is_bounded_and_offline(monkeypatch, capsys):
    import runpy
    import sys
    from pathlib import Path

    path = Path(__file__).resolve().parents[1] / "movies" / "benchmark.py"
    monkeypatch.setattr(sys, "argv", ["benchmark", "--requests", "2", "--concurrency", "1"])
    with pytest.raises(SystemExit) as stopped:
        runpy.run_path(str(path), run_name="__main__")
    assert stopped.value.code == 0
    assert "synthetic_provider_real_redis" in capsys.readouterr().out


def test_probe_module_entrypoint_refuses_unconfirmed_live_access(monkeypatch):
    import runpy
    import sys
    from pathlib import Path

    path = Path(__file__).resolve().parents[1] / "movies" / "probe.py"
    monkeypatch.setattr(sys, "argv", ["probe"])
    with pytest.raises(SystemExit) as stopped:
        runpy.run_path(str(path), run_name="__main__")
    assert stopped.value.code == 2
