FROM python:3.12-slim
WORKDIR /app/server
COPY --from=ghcr.io/astral-sh/uv:0.13.1 /uv /usr/local/bin/uv
COPY server/pyproject.toml server/uv.lock ./
RUN uv sync --frozen --no-dev
COPY server/sofia ./sofia
COPY evals /app/evals
USER 10001:10001
ENTRYPOINT [".venv/bin/python", "/app/evals/run_evals.py"]
CMD ["--mode", "offline", "--output", "/tmp/eval-report.json"]
