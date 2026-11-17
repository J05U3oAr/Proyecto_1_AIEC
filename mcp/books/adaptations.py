"""Evidence-backed work matching. Provider descriptions never authorize confirmations."""

import unicodedata
from datetime import date
from pathlib import Path
from typing import Annotated, Literal, Protocol

from pydantic import Field, StringConstraints, model_validator

from sofia.models import Adaptation, Book, Evidence, Model, MovieId, SearchBooks, Text, ToolResult
from sofia.tools import validate_result

COLLECTION_PATH = Path(__file__).with_name("adaptations.json")
LIMITS = [
    "Se verificó la relación entre las obras, no una lectura íntegra ni diferencias de escenas.",
    "La búsqueda de ediciones es acotada; puede haber otras ediciones de la misma obra.",
]


class ReviewedAdaptation(Model):
    movieId: int = Field(gt=0)
    originalTitle: Text
    movieYear: int = Field(ge=1800, le=2200)
    bookTitle: Text
    originalBookYear: int = Field(ge=1000, le=2200)
    titles: list[Text] = Field(min_length=1, max_length=20)
    authors: list[Text] = Field(min_length=1, max_length=20)
    evidence: Evidence
    comparisonEvidence: list[Evidence] = Field(default_factory=list, max_length=2)

    @model_validator(mode="after")
    def chronology(self) -> "ReviewedAdaptation":
        if self.originalBookYear > self.movieYear:
            raise ValueError("Source novel cannot postdate the movie")
        seen: set[str] = set()
        for fact in self.comparisonEvidence:
            side = fact.statement.split(":", 1)[0]
            expected = {
                "Premisa del libro": {"google_books"},
                "Premisa de la película": {"imdb", "tmdb"},
            }
            if (
                side not in expected
                or side in seen
                or fact.source.provider not in expected[side]
                or len(fact.statement) > 600
            ):
                raise ValueError("Invalid or duplicate comparison premise")
            seen.add(side)
        return self


class Collection(Model):
    version: Literal[1]
    reviewedAt: Annotated[str, StringConstraints(pattern=r"^\d{4}-\d{2}-\d{2}$")]
    entries: list[ReviewedAdaptation] = Field(max_length=100)

    @model_validator(mode="after")
    def unique_movies(self) -> "Collection":
        date.fromisoformat(self.reviewedAt)
        ids = [entry.movieId for entry in self.entries]
        if len(ids) != len(set(ids)):
            raise ValueError("Duplicate movie ID in evidence collection")
        return self


def load_collection(path: Path = COLLECTION_PATH) -> Collection:
    # Trusted, versioned local resource. No paths or URLs supplied by the model/user.
    return Collection.model_validate_json(path.read_text(encoding="utf-8-sig"))


def normalized(value: str) -> str:
    return "".join(
        char for char in unicodedata.normalize("NFKD", value.casefold()) if char.isalnum()
    )


def matches_work(book: Book, entry: ReviewedAdaptation) -> bool:
    authors = {normalized(author) for author in entry.authors}
    return (
        normalized(book.title) in {normalized(title) for title in entry.titles}
        and bool(book.authors)
        and all(normalized(author) in authors for author in book.authors)
        and (book.year is None or book.year >= entry.originalBookYear)
    )


class BookSearch(Protocol):
    async def search(self, args: SearchBooks) -> ToolResult: ...


class AdaptationResolver:
    def __init__(self, catalog: BookSearch, collection: Collection | None = None) -> None:
        self.catalog = catalog
        reviewed = collection if collection is not None else load_collection()
        self.entries = {entry.movieId: entry for entry in reviewed.entries}

    async def evidence(self, args: MovieId) -> ToolResult:
        entry = self.entries.get(args.movieId)
        if entry is None:
            return ToolResult(
                adaptation=Adaptation(
                    movieId=args.movieId,
                    status="not_found",
                    limitations=[
                        "No hay evidencia revisada para esta película en la colección disponible.",
                        "Esto no demuestra que la película no tenga libro; "
                        "requiere investigación adicional.",
                    ],
                )
            )
        search = SearchBooks(
            query=f'intitle:"{entry.bookTitle}" inauthor:"{entry.authors[0]}"',
            limit=5,
        )
        # A failed request propagates as an MCP error, never as uncertain/not_found.
        result = await self.catalog.search(search)
        validate_result("search_books", search, result)
        candidates = [book for book in result.books if matches_work(book, entry)]
        if not candidates:
            return ToolResult(
                adaptation=Adaptation(
                    movieId=args.movieId,
                    status="uncertain",
                    evidence=[entry.evidence],
                    limitations=[
                        "Hay evidencia del vínculo, pero no se verificó una edición compatible "
                        "por título, autor y fecha.",
                        "Los homónimos, guías, novelizaciones y estuches "
                        "no sustituyen a la obra original.",
                        *LIMITS,
                    ],
                )
            )
        # Reprints after release are valid. Select deterministically across provider orderings.
        book = min(candidates, key=lambda b: (b.year is None, b.year or 9999, b.id))
        limitations = [
            *LIMITS,
            f"La obra original es de {entry.originalBookYear}; "
            "el año del libro devuelto corresponde a su edición.",
        ]
        if book.year is None:
            limitations.append("Google Books no informa la fecha de esta edición.")
        return ToolResult(
            adaptation=Adaptation(
                movieId=args.movieId,
                status="confirmed",
                book=book,
                evidence=[entry.evidence, *entry.comparisonEvidence],
                limitations=limitations,
            )
        )
