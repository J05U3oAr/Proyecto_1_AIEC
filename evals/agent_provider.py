"""Promptfoo adapter: shares the canonical runner, never starts another agent implementation."""

import json

from sofia.config import Settings
from sofia_evals.runner import load_dataset, run_case


async def call_api(
    prompt: str, options: dict[str, object], context: dict[str, object]
) -> dict[str, object]:
    dataset, _ = load_dataset()
    case = next(case for case in dataset.cases if case.id == prompt.strip())
    result = await run_case(case, Settings(_env_file=None))
    return {"output": json.dumps(result, ensure_ascii=False)}
