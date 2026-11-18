"""Bounded Google Books requests and normalization into the shared contracts."""

import asyncio
import json
import re
from datetime import UTC, datetime
from email.utils import parsedate_to_datetime
from html.parser import HTMLParser

import httpx

from catalog_common.cache import CatalogCache, CatalogError
from sofia.models import Book, BookId, SearchBooks, ToolResult
from sofia.tools import validate_result


class PlainText(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []

    def handle_data(self, data: str) -> None:
        self.parts.append(data)


def normalize_book(value: object) -> Book:
    if not isinstance(value, dict) or not isinstance(value.get("volumeInfo"), dict):
        raise ValueError("Invalid volume")
    info = value["volumeInfo"]
    description = info.get("description", "")
    date = info.get("publishedDate", "")
    if not isinstance(description, str) or not isinstance(date, str):
        raise ValueError("Invalid metadata")
    parser = PlainText()
    parser.feed(description)
    year = int(date[:4]) if re.fullmatch(r"\d{4}(?:-\d{2}(?:-\d{2})?)?", date) else None
    # Ignore provider URLs: build the single permitted destination from a validated ID.
    return Book.model_validate(
        {
            "id": value.get("id"),
            "title": info.get("title"),
            "authors": info.get("authors", []),
            "year": year,
            "description": " ".join(parser.parts)[:4000],
            "url": f"https://books.google.com/books?id={value.get('id')}",
        }
    )


def retry_seconds(value: str) -> int:
    try:
        seconds = (
            int(value)
            if value.isdigit()
            else int((parsedate_to_datetime(value) - datetime.now(UTC)).total_seconds())
        )
        return max(1, min(seconds, 86400))
    except (ValueError, TypeError, OverflowError):
        return 60


class GoogleBooks:
    def __init__(
        self,
        client: httpx.AsyncClient,
        cache: CatalogCache,
        key: str,
        retries: int = 1,
        timeout: float = 5,
    ) -> None:
        if retries not in (0, 1) or not 0.1 <= timeout <= 10:
            raise ValueError("Invalid request limits")
        self.client, self.cache, self.key = client, cache, key
        self.retries, self.timeout = retries, timeout

    async def _fetch(
        self,
        name: str,
        args: SearchBooks | BookId,
        path: str,
        params: dict[str, str],
    ) -> dict[str, object]:
        if not self.key:
            raise CatalogError("provider_not_configured")
        for attempt in range(self.retries + 1):
            await self.cache.take()
            try:
                async with asyncio.timeout(self.timeout):
                    async with self.client.stream(
                        "GET",
                        "https://www.googleapis.com/books/v1/volumes" + path,
                        params=params,
                        headers={"X-Goog-Api-Key": self.key},
                        follow_redirects=False,
                        timeout=self.timeout,
                    ) as response:
                        status = response.status_code
                        body = bytearray()
                        async for chunk in response.aiter_bytes():
                            body.extend(chunk)
                            if len(body) > 1048576:
                                raise ValueError("Response too large")
                        if status == 429:
                            delay = retry_seconds(response.headers.get("Retry-After", "60"))
                            await self.cache.cooldown(delay)
                            raise CatalogError("provider_rate_limited", True, delay)
                        if status == 403 and body:
                            failure = json.loads(body)
                            reasons = {
                                item.get("reason")
                                for item in failure.get("error", {}).get("errors", [])
                                if isinstance(item, dict)
                            }
                            if reasons & {
                                "dailyLimitExceeded",
                                "quotaExceeded",
                                "rateLimitExceeded",
                                "userRateLimitExceeded",
                            }:
                                delay = 3600 if "dailyLimitExceeded" in reasons else 60
                                await self.cache.cooldown(delay)
                                raise CatalogError("provider_rate_limited", True, delay)
                        if status in (401, 403):
                            raise CatalogError("provider_not_configured")
                        if status == 404 and isinstance(args, BookId):
                            return ToolResult().model_dump(mode="json")
                        if status != 200:
                            if status in (502, 503, 504) and attempt < self.retries:
                                await asyncio.sleep(0.1)
                                continue
                            raise CatalogError("provider_unavailable", status >= 500)
                        payload = json.loads(body)
                        if not isinstance(payload, dict) or "error" in payload:
                            raise ValueError("Invalid response")
                        if isinstance(args, SearchBooks):
                            items = payload.get("items", [])
                            if "items" not in payload and payload.get("totalItems") != 0:
                                raise ValueError("Missing search results")
                            if not isinstance(items, list) or len(items) > args.limit:
                                raise ValueError("Invalid search results")
                        else:
                            items = [payload]
                        books = [normalize_book(item) for item in items]
                        result = ToolResult(books=list({b.id: b for b in books}.values()))
                        validate_result(name, args, result)
                        if len(result.model_dump_json().encode()) > 32768:
                            raise ValueError("Result too large")
                        return result.model_dump(mode="json")
            except (TimeoutError, httpx.TransportError):
                if attempt == self.retries:
                    raise CatalogError("provider_timeout", True) from None
                await asyncio.sleep(0.1)
            except CatalogError:
                raise
            except Exception:
                # Never expose provider bodies, headers or exception text.
                raise CatalogError("invalid_provider_result") from None
        raise CatalogError("provider_unavailable", True)

    async def _get(self, name: str, args: SearchBooks | BookId) -> ToolResult:
        if isinstance(args, SearchBooks):
            path = ""
            params = {"q": args.query, "maxResults": str(args.limit), "printType": "books"}
        else:
            path, params = "/" + args.bookId, {}
        key = json.dumps(["books-v1", name, params, path], sort_keys=True)
        value = await self.cache.get(key, lambda: self._fetch(name, args, path, params))
        try:
            result = ToolResult.model_validate(value)
            validate_result(name, args, result)
            return result
        except Exception:
            raise CatalogError("invalid_provider_result") from None

    async def search(self, args: SearchBooks) -> ToolResult:
        return await self._get("search_books", args)

    async def details(self, args: BookId) -> ToolResult:
        return await self._get("book_details", args)
