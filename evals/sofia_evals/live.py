"""Observe the production RemoteMCP adapter without changing its results."""

from time import perf_counter

from sofia.adapters import MCP
from sofia.errors import PublicError
from sofia.models import Model, ToolResult
from sofia.tools import validate_result


class ObservedMCP:
    def __init__(self, inner: MCP) -> None:
        self.inner = inner
        self.events: list[dict[str, object]] = []

    async def call(self, name: str, arguments: Model) -> ToolResult:
        event: dict[str, object] = {
            "tool": name,
            "arguments": {
                key: value
                for key, value in arguments.model_dump().items()
                if key in {"movieId", "bookId", "limit"}
            },
            "status": "pending",
            "transport": "production_MCP",
        }
        self.events.append(event)
        start = perf_counter()
        try:
            result = await self.inner.call(name, arguments)
            validate_result(name, arguments, result)
            event.update(
                status="ok",
                result={
                    "movies": len(result.movies),
                    "books": len(result.books),
                    "movieIds": [movie.id for movie in result.movies],
                    "bookIds": [book.id for book in result.books],
                    "adaptation": result.adaptation.status if result.adaptation else None,
                },
            )
            return result
        except PublicError as error:
            event.update(status="failed", code=error.code)
            raise
        finally:
            event["latencyMs"] = round((perf_counter() - start) * 1000, 2)
