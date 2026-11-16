import ast
import json

import pytest

from scripts import check_coverage, probe_nvidia
from sofia.errors import PublicError


def test_coverage_gate_detects_missing_functions_and_branches(tmp_path, capsys):
    source = tmp_path / "sample.py"
    source.write_text(
        'def covered():\n    "Docstring"\n    return 1\n\ndef missed():\n    return 2\n'
    )
    result = {
        "executed_lines": [1, 3, 5],
        "summary": {
            "covered_lines": 3,
            "num_statements": 4,
            "covered_branches": 1,
            "num_branches": 2,
        },
    }
    measured = check_coverage.metrics(source, result)
    assert measured == {"lines": 75, "statements": 75, "branches": 50, "functions": 50}
    report = tmp_path / "coverage.json"
    report.write_text(json.dumps({"files": {str(source): result}}))
    assert not check_coverage.check(report)
    assert "functions=50.00%" in capsys.readouterr().out
    result["executed_lines"].append(6)
    result["summary"].update(covered_lines=4, covered_branches=2)
    report.write_text(json.dumps({"files": {str(source): result}}))
    assert check_coverage.check(report)
    assert check_coverage.percent(0, 0) == 100
    ast.parse(source.read_text())


@pytest.mark.parametrize(
    "mode",
    [
        "ok",
        "wrong_tool",
        "no_final",
        "provider_error",
        "unknown_error",
        "bad_message",
        "bad_calls",
    ],
)
async def test_probe_never_prints_credentials_or_model_content(monkeypatch, settings, capsys, mode):
    monkeypatch.setattr(probe_nvidia, "Settings", lambda **kwargs: settings)

    class Redis:
        @classmethod
        def from_url(cls, *args, **kwargs):
            return cls()

        async def aclose(self):
            return None

    class Budget:
        def __init__(self, *args):
            pass

        async def take(self):
            return None

    class LLM:
        def __init__(self, *args):
            self.count = 0

        async def complete(self, messages, *, allow_tools=True):
            self.count += 1
            if mode == "provider_error":
                raise PublicError("provider_unavailable", "synthetic-secret")
            if mode == "unknown_error":
                raise RuntimeError("synthetic-secret")
            if mode == "bad_message":
                return {"message": "wrong"}
            if mode == "bad_calls":
                return {"message": {"tool_calls": "wrong"}}
            if self.count == 1:
                return {
                    "message": {
                        "tool_calls": [
                            {
                                "id": "x",
                                "function": {
                                    "name": "shell" if mode == "wrong_tool" else "search_movies",
                                    "arguments": '{"query":"fiction"}',
                                },
                            }
                        ]
                    }
                }
            assert not allow_tools
            return {"message": {"content": None if mode == "no_final" else "synthetic-secret"}}

    monkeypatch.setattr(probe_nvidia, "Redis", Redis)
    monkeypatch.setattr(probe_nvidia, "NvidiaLLM", LLM)
    monkeypatch.setattr("sofia.storage.Budget", Budget)
    code = await probe_nvidia.probe()
    output = capsys.readouterr().out
    assert "synthetic-secret" not in output
    assert code == (0 if mode == "ok" else 1)
    assert json.loads(output)["requests"] <= 2
