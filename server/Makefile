.PHONY: check test contracts

check:
	uv run --frozen ruff check --config pyproject.toml sofia scripts tests ../mcp ../evals
	uv run --frozen ruff format --check --config pyproject.toml sofia scripts tests ../mcp ../evals
	uv run --frozen mypy
	uv run --frozen python -m sofia.contracts --check
	$(MAKE) test

test:
	uv run --frozen python -m pytest --cov --cov-branch --cov-report=term-missing --cov-report=json:coverage.json --cov-report=xml:coverage.xml
	uv run --frozen python -m scripts.check_coverage

contracts:
	uv run --frozen python -m sofia.contracts
