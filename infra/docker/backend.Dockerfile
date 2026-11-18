FROM python:3.12-slim
WORKDIR /app/server
COPY --from=ghcr.io/astral-sh/uv:0.13.1 /uv /usr/local/bin/uv
COPY server/pyproject.toml server/uv.lock ./
RUN uv sync --frozen --no-dev
COPY server/sofia ./sofia
COPY server/scripts/probe_comparison.py ./scripts/probe_comparison.py
COPY shared /app/shared
USER 10001:10001
EXPOSE 8000
CMD [".venv/bin/uvicorn", "sofia.main:app", "--host", "0.0.0.0", "--port", "8000", "--no-access-log"]
