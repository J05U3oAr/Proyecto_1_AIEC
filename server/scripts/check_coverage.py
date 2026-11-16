"""Enforce four coverage metrics per production module, without hiding weak files."""

import ast
import json
from pathlib import Path
from typing import TypedDict, cast


class Summary(TypedDict):
    covered_lines: int
    num_statements: int
    covered_branches: int
    num_branches: int


class FileCoverage(TypedDict):
    executed_lines: list[int]
    summary: Summary


class Report(TypedDict):
    files: dict[str, FileCoverage]


def percent(covered: int, total: int) -> float:
    return 100 * covered / total if total else 100.0


def metrics(path: Path, result: FileCoverage) -> dict[str, float]:
    summary = result["summary"]
    executed = set(result["executed_lines"])
    entries = []
    for node in ast.walk(ast.parse(path.read_text())):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            body = [
                statement
                for statement in node.body
                if not (
                    isinstance(statement, ast.Expr)
                    and isinstance(statement.value, ast.Constant)
                    and isinstance(statement.value.value, str)
                )
            ]
            if body and not (
                len(body) == 1
                and isinstance(body[0], ast.Expr)
                and isinstance(body[0].value, ast.Constant)
                and body[0].value.value is Ellipsis
            ):
                entries.append(body[0].lineno)
    statements = percent(summary["covered_lines"], summary["num_statements"])
    return {
        # coverage.py measures executable statements by source line; these two coincide in Python.
        "lines": statements,
        "statements": statements,
        "branches": percent(summary["covered_branches"], summary["num_branches"]),
        "functions": percent(sum(line in executed for line in entries), len(entries)),
    }


def check(report: Path = Path("coverage.json")) -> bool:
    data = cast(Report, json.loads(report.read_text()))
    success = True
    for filename, result in data["files"].items():
        values = metrics(Path(filename), result)
        print(filename + " " + " ".join(f"{name}={value:.2f}%" for name, value in values.items()))
        success = success and all(value >= 80 for value in values.values())
    return success


if __name__ == "__main__":
    raise SystemExit(0 if check() else 1)
