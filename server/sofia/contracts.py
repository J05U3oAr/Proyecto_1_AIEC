"""Publish neutral schemas from the same validators used at runtime."""

import argparse
import json
from pathlib import Path

from sofia.models import (
    Action,
    Adaptation,
    Book,
    ChatRequest,
    ChatResponse,
    ErrorBody,
    Model,
    Movie,
    ToolResult,
)
from sofia.tools import TOOLS

ROOT = Path(__file__).resolve().parents[2] / "shared" / "contracts"


def schemas() -> dict[str, dict[str, object]]:
    models: dict[str, type[Model]] = {
        "chat-request": ChatRequest,
        "chat-response": ChatResponse,
        "error": ErrorBody,
        "movie": Movie,
        "book": Book,
        "adaptation": Adaptation,
        "action": Action,
        "tool-result": ToolResult,
        **{f"tools/{name}": tool.arguments for name, tool in TOOLS.items()},
    }
    return {
        name: {
            "$schema": "https://json-schema.org/draft/2020-12/schema",
            **model.model_json_schema(),
        }
        for name, model in models.items()
    }


def publish(check: bool = False) -> bool:
    valid = True
    for name, schema in schemas().items():
        target = ROOT / "v1" / f"{name}.schema.json"
        content = json.dumps(schema, ensure_ascii=False, indent=2) + "\n"
        if check:
            valid = valid and target.is_file() and target.read_text() == content
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(content)
    return valid


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    raise SystemExit(0 if publish(parser.parse_args().check) else 1)
