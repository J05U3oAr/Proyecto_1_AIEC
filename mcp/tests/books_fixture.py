"""Synthetic catalog served over actual HTTP, with no Google calls."""

from books.config import BooksSettings
from books.server import create_app
from sofia.models import Book, BookId, SearchBooks, ToolResult


class Catalog:
    async def search(self, args: SearchBooks) -> ToolResult:
        return await self.details(BookId(bookId="dune_1"))

    async def details(self, args: BookId) -> ToolResult:
        return ToolResult(
            books=[
                Book(
                    id=args.bookId,
                    title="Dune",
                    authors=["Frank Herbert"],
                    year=1965,
                    url=f"https://books.google.com/books?id={args.bookId}",
                )
            ]
        )


app = create_app(
    BooksSettings(mcp_token="synthetic-mcp-token", google_books_api_key="synthetic"), Catalog()
)
