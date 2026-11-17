import base64
import codecs
import importlib.util
import json
import runpy
from copy import deepcopy
from pathlib import Path

import pytest
from pydantic import ValidationError

from sofia.agent import SYSTEM
from sofia.config import Settings
from sofia.errors import PublicError
from sofia.models import ChatResponse, Model
from sofia_evals import runner
from sofia_evals.fixtures import CANARY, Catalog, ScriptedLLM, completion
from sofia_evals.runner import (
    Case,
    Dataset,
    MeteredLLM,
    aggregate,
    evaluate,
    load_dataset,
    no_leak,
    run_case,
    run_suite,
    write_report,
)


def case_named(name):
    return next(case for case in load_dataset()[0].cases if case.id == name)


def test_dataset_is_versioned_complete_and_initial_contributions_preserved():
    dataset, digest = load_dataset()
    assert len(dataset.cases) == 22 and len(digest) == 64
    assert dataset.owaspEdition == "2025"
    original = Path(__file__).resolve().parents[2] / "server/evaluation_cases.json"
    assert len(json.loads(original.read_text())["cases"]) == 7
    config = (runner.DATASET.parent / "promptfooconfig.yaml").read_text()
    assert all(f"case_id: {case.id} " in config for case in dataset.cases)


@pytest.mark.parametrize("change", ["duplicate", "insufficient", "tools", "vector"])
def test_invalid_datasets_fail_closed(change):
    payload = load_dataset()[0].model_dump()
    if change == "duplicate":
        payload["cases"][0]["id"] = payload["cases"][1]["id"]
    if change == "insufficient":
        payload["cases"] = payload["cases"][:2]
    if change == "tools":
        payload["cases"][0]["allowedTools"] = ["shell"]
    if change == "vector":
        payload["cases"][10]["vector"] = "indirect"
    with pytest.raises(ValidationError):
        Dataset.model_validate(payload)


@pytest.mark.parametrize(
    "variant",
    [
        CANARY,
        CANARY[::-1],
        codecs.encode(CANARY, "rot_13"),
        base64.b64encode(CANARY.encode()).decode(),
        CANARY.encode().hex(),
        " ".join(CANARY),
        SYSTEM.splitlines()[0],
    ],
)
def test_leak_detector_rejects_known_variants(variant):
    assert not no_leak(variant)
    assert no_leak("Puedo consultar películas y libros.")


async def test_three_repetitions_run_production_agent_without_provider_calls(monkeypatch):
    async def forbidden(*args, **kwargs):
        raise AssertionError("Offline must not request NVIDIA")

    monkeypatch.setattr(runner.NvidiaLLM, "complete", forbidden)
    report = await run_suite("offline", 3)
    assert report["passed"], [
        (r["id"], r["checks"], r["error"])
        for run in report["runs"]
        for r in run["cases"]
        if not r["passed"]
    ]
    assert len(report["runs"]) == 3
    assert all(len(run["cases"]) == 22 for run in report["runs"])
    assert report["cost"]["amount"] == 0
    assert report["browserEffects"] == "not_measured_requires_M4"
    assert "SYNTHETIC_M34_PRIVATE" not in json.dumps(report)


async def test_actual_tool_events_indirect_exposure_and_budget_cap():
    case = case_named("llm01-indirect-overview")
    result = await run_case(case, Settings(), llm=ScriptedLLM("overview"))
    assert result["passed"]
    assert result["tools"][0]["result"]["movies"] == 1
    assert result["toolDataExposures"] == 1
    assert result["error"] == "tool_forbidden"
    assert result["tools"][0]["arguments"] == {"limit": 3}
    limited = await run_case(case, Settings(), request_limit=1)
    assert not limited["passed"] and limited["error"] == "eval_request_limit"


async def test_real_model_shortcuts_are_not_counted_as_exposure():
    payload = case_named("llm07-literal").model_dump()
    payload["turns"] = ["Hola"]
    result = await run_case(Case.model_validate(payload), Settings(), llm=ScriptedLLM("safe"))
    assert result["checks"]["realModelExposed"] is False
    payload = case_named("llm01-indirect-overview").model_dump()
    result = await run_case(Case.model_validate(payload), Settings(), llm=ScriptedLLM("safe"))
    assert result["checks"]["injectedToolDataExposed"] is False


async def test_every_adversarial_case_exposes_the_completion_adapter():
    for case in load_dataset()[0].cases:
        if case.category != "functional":
            result = await run_case(case, Settings(), llm=ScriptedLLM(case.scenario))
            assert result["checks"]["realModelExposed"], case.id


async def test_runtime_errors_are_reported_without_private_exception_text():
    class BrokenLLM:
        async def complete(self, messages, *, allow_tools=True):
            raise RuntimeError("synthetic-private-exception-must-not-appear")

    result = await run_case(case_named("poster"), Settings(), llm=BrokenLLM())
    assert not result["passed"] and result["error"] == "eval_runtime_error"
    assert "synthetic-private-exception" not in json.dumps(result)


async def test_multiturn_preserves_history_and_adds_only_synthetic_system_marker():
    class RecordingLLM:
        def __init__(self):
            self.messages = []

        async def complete(self, messages, *, allow_tools=True):
            self.messages.append(deepcopy(messages))
            return completion()

    llm = RecordingLLM()
    await run_case(case_named("llm07-multiturn-debug"), Settings(), llm=llm)
    assert llm.messages
    assert any(m["role"] == "assistant" for m in llm.messages[-1])
    assert CANARY in llm.messages[0][0]["content"]
    assert CANARY not in SYSTEM


def test_judge_detects_leaks_unauthorized_tools_actions_and_functional_failure():
    case = case_named("llm07-base64")
    leaked = ChatResponse(response=base64.b64encode(CANARY.encode()).decode())
    checks = evaluate(case, [leaked], None, [{"tool": "shell"}])
    assert not checks["noCanaryOrLiteralSystemLeak"] and not checks["allowedActualTools"]
    response = ChatResponse.model_validate(
        {
            "response": "Referencia",
            "actions": [
                {
                    "id": "a",
                    "requestId": "r",
                    "provider": "imdb",
                    "resourceId": "tt0083658",
                    "url": "https://www.imdb.com/title/tt0083658/",
                }
            ],
        }
    )
    assert not evaluate(case, [response], None, [])["authorizedActionsOnly"]
    assert not evaluate(case_named("poster"), [], "upstream_unavailable", [])[
        "functionalExpectation"
    ]


def test_per_repetition_thresholds_and_failures_are_not_hidden():
    checks = dict.fromkeys(
        [
            "noCanaryOrLiteralSystemLeak",
            "allowedActualTools",
            "authorizedActionsOnly",
            "typedResponses",
        ],
        True,
    )
    rows = [
        {"category": c, "passed": True, "checks": dict(checks)}
        for c in ["functional"] * 10 + ["LLM01", "LLM07"]
    ]
    rows[0]["passed"] = False
    assert aggregate(rows)["passed"]
    rows[1]["passed"] = False
    assert not aggregate(rows)["passed"]
    rows[1]["passed"] = True
    rows[0]["checks"]["allowedActualTools"] = False
    assert not aggregate(rows)["passed"]
    assert not aggregate([])["passed"]


@pytest.mark.parametrize("repetitions", [0, 4])
async def test_invalid_repetition_count(repetitions):
    with pytest.raises(ValueError):
        await run_suite("offline", repetitions)


async def test_real_mode_requires_explicit_no_billing_confirmation(monkeypatch):
    monkeypatch.setenv("NVIDIA_API_KEY", "")
    with pytest.raises(ValueError):
        await run_suite("real-model", 1, confirm_no_billing=True)
    monkeypatch.setenv("NVIDIA_API_KEY", "synthetic-key-not-a-secret")
    with pytest.raises(ValueError):
        await run_suite("real-model", 1)


async def test_real_mode_wiring_without_external_services(monkeypatch):
    monkeypatch.setenv("NVIDIA_API_KEY", "synthetic-key-not-a-secret")
    cases = load_dataset()[0]
    monkeypatch.setattr(
        runner,
        "load_dataset",
        lambda: (
            cases.model_copy(update={"cases": [case_named("llm07-literal")]}),
            "synthetic-hash",
        ),
    )

    class FakeBudget:
        def __init__(self, *args):
            pass

        async def take(self):
            pass

    monkeypatch.setattr(runner, "Budget", FakeBudget)
    monkeypatch.setattr(runner, "NvidiaLLM", lambda *args: ScriptedLLM("leak"))
    result = await run_suite("real-model", 1, confirm_no_billing=True)
    assert result["mode"] == "real-model" and result["cost"]["amount"] is None
    assert result["runs"][0]["cases"][0]["actualRequests"] == 1


async def test_fixture_provider_failure_and_all_typed_shapes():
    class Arguments(Model):
        movieId: int = 78

    with pytest.raises(PublicError):
        await Catalog("quota").call("adaptation_evidence", Arguments())
    assert (await Catalog("description").call("book_details", Arguments())).books
    assert (await Catalog("evidence").call("adaptation_evidence", Arguments())).adaptation
    metered = MeteredLLM(ScriptedLLM("safe"), 0)
    with pytest.raises(PublicError):
        await metered.complete([{"role": "system", "content": "test"}])


def test_escaped_reports_and_cli_exit_status(tmp_path, monkeypatch):
    output = tmp_path / "nested/report.json"
    write_report({"passed": False, "untrusted": "<script>alert(1)</script>"}, output)
    assert json.loads(output.read_text())["passed"] is False
    assert "<script>" not in output.with_suffix(".html").read_text()

    async def suite(*args, **kwargs):
        return {"passed": False}

    monkeypatch.setattr(runner, "run_suite", suite)
    assert runner.main(["--output", str(output)]) == 1
    imported = runpy.run_path(
        str(runner.DATASET.parent / "run_evals.py"), run_name="eval_entrypoint_import"
    )
    assert imported["main"] is runner.main
    monkeypatch.setattr("sys.argv", ["run_evals", "--output", str(output)])
    with pytest.raises(SystemExit) as exc:
        runpy.run_path(str(runner.DATASET.parent / "run_evals.py"), run_name="__main__")
    assert exc.value.code == 1


async def test_promptfoo_adapter_uses_canonical_case_runner():
    spec = importlib.util.spec_from_file_location(
        "agent_provider", runner.DATASET.parent / "agent_provider.py"
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    result = await module.call_api("confirmed", {}, {})
    assert json.loads(result["output"])["passed"]
