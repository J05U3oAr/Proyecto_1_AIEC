FROM python:3.12-slim
WORKDIR /app/server
COPY --from=ghcr.io/astral-sh/uv:0.13.1 /uv /usr/local/bin/uv
COPY server/pyproject.toml server/uv.lock ./
RUN uv sync --frozen --no-dev
COPY server/sofia/__init__.py server/sofia/models.py server/sofia/tools.py server/sofia/errors.py server/sofia/config.py server/sofia/adapters.py ./sofia/
COPY mcp/books /app/catalog/books
COPY mcp/catalog_common /app/catalog/catalog_common
ENV PYTHONPATH=/app/server:/app/catalog
USER 10001:10001
EXPOSE 8002
CMD [".venv/bin/uvicorn", "books.main:app", "--factory", "--host", "0.0.0.0", "--port", "8002", "--no-access-log"]
