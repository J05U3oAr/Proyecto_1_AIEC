import re
from typing import Annotated, Literal
from urllib.parse import parse_qs, urlsplit

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    field_validator,
    model_validator,
)

Identifier = Annotated[str, StringConstraints(pattern=r"^[A-Za-z0-9_-]{1,128}$")]
Text = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=4000)]


class Model(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


def safe_url(value: str, kind: str) -> str:
    parts = urlsplit(value)
    if (
        parts.scheme != "https"
        or parts.username
        or parts.password
        or parts.port not in (None, 443)
        or parts.fragment
        or len(value) > 2048
        or any(c in value for c in "\\\r\n\t ")
    ):
        raise ValueError("Invalid reference URL")
    host = parts.hostname
    valid = False
    if kind == "poster":
        valid = (
            host == "image.tmdb.org"
            and bool(
                re.fullmatch(
                    r"/t/p/(w(?:92|154|185|342|500|780)|original)/[A-Za-z0-9]+\.(jpg|png)",
                    parts.path,
                )
            )
            and not parts.query
        )
    elif kind == "tmdb":
        valid = (
            host == "www.themoviedb.org"
            and bool(re.fullmatch(r"/movie/[1-9][0-9]*", parts.path))
            and not parts.query
        )
    elif kind == "imdb":
        valid = (
            host == "www.imdb.com"
            and bool(re.fullmatch(r"/title/tt[0-9]{7,10}/?", parts.path))
            and not parts.query
        )
    elif kind == "google_books":
        query = parse_qs(parts.query, keep_blank_values=True)
        valid = (
            host == "books.google.com"
            and parts.path == "/books"
            and set(query) == {"id"}
            and len(query["id"]) == 1
            and bool(re.fullmatch(r"[A-Za-z0-9_-]{1,128}", query["id"][0]))
        )
    if not valid:
        raise ValueError("URL outside allowed provider routes")
    return value


class Source(Model):
    provider: Literal["tmdb", "imdb", "google_books"]
    url: str
    label: Annotated[str, StringConstraints(min_length=1, max_length=200)]

    @model_validator(mode="after")
    def validate_url(self) -> "Source":
        safe_url(self.url, self.provider)
        return self


class Movie(Model):
    id: int = Field(gt=0)
    title: Annotated[str, StringConstraints(min_length=1, max_length=300)]
    year: int | None = Field(default=None, ge=1800, le=2200)
    overview: Annotated[str, StringConstraints(max_length=4000)] = ""
    poster: str | None = None
    tmdb: str
    imdb: str | None = None
    genres: list[
        Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
    ] = Field(default_factory=list, max_length=30)
    runtime: int | None = Field(default=None, ge=1, le=10000)
    tmdbRating: float | None = Field(default=None, ge=0, le=10, allow_inf_nan=False)
    voteCount: int | None = Field(default=None, ge=0)

    @model_validator(mode="after")
    def validate_urls(self) -> "Movie":
        if self.tmdbRating is not None and not self.voteCount:
            raise ValueError("TMDB rating requires a positive vote count")
        safe_url(self.tmdb, "tmdb")
        if urlsplit(self.tmdb).path != f"/movie/{self.id}":
            raise ValueError("TMDB ID mismatch")
        if self.poster is not None:
            safe_url(self.poster, "poster")
        if self.imdb is not None:
            safe_url(self.imdb, "imdb")
        return self


class Book(Model):
    id: Identifier
    title: Annotated[str, StringConstraints(min_length=1, max_length=300)]
    authors: list[Annotated[str, StringConstraints(min_length=1, max_length=200)]] = Field(
        default_factory=list, max_length=20
    )
    year: int | None = Field(default=None, ge=1000, le=2200)
    description: Annotated[str, StringConstraints(max_length=4000)] = ""
    url: str

    @model_validator(mode="after")
    def validate_url(self) -> "Book":
        safe_url(self.url, "google_books")
        if parse_qs(urlsplit(self.url).query)["id"] != [self.id]:
            raise ValueError("Google Books ID mismatch")
        return self


class Evidence(Model):
    statement: Text
    source: Source


class Adaptation(Model):
    movieId: int = Field(gt=0)
    status: Literal["confirmed", "uncertain", "not_found"]
    book: Book | None = None
    evidence: list[Evidence] = Field(default_factory=list, max_length=10)
    limitations: list[Text] = Field(default_factory=list, max_length=10)

    @model_validator(mode="after")
    def confirmed_evidence(self) -> "Adaptation":
        if self.status == "confirmed" and (self.book is None or not self.evidence):
            raise ValueError("Confirmed adaptation requires book and evidence")
        return self


class NavigationIntent(Model):
    provider: Literal["imdb", "google_books"]


class ChatRequest(Model):
    prompt: Text
    sessionId: Identifier | None = None
    requestId: Identifier | None = None
    navigationIntent: NavigationIntent | None = None


class Action(Model):
    type: Literal["open_reference"] = "open_reference"
    id: Identifier
    requestId: Identifier
    provider: Literal["imdb", "google_books"]
    resourceId: Identifier
    url: str

    @model_validator(mode="after")
    def validate_url(self) -> "Action":
        safe_url(self.url, self.provider)
        resource = (
            urlsplit(self.url).path.strip("/").split("/")[-1]
            if self.provider == "imdb"
            else parse_qs(urlsplit(self.url).query)["id"][0]
        )
        if resource != self.resourceId:
            raise ValueError("Action resource mismatch")
        return self


class Comparison(Model):
    adaptation: Adaptation
    verdict: Text


class ChatResponse(Model):
    response: Annotated[str, StringConstraints(min_length=1, max_length=16000)]
    sessionId: Identifier | None = None
    requestId: Identifier | None = None
    movies: list[Movie] = Field(default_factory=list, max_length=10)
    comparison: Comparison | None = None
    sources: list[Source] = Field(default_factory=list, max_length=30)
    actions: list[Action] = Field(default_factory=list, max_length=1)


class ErrorBody(Model):
    code: str
    message: str
    retryable: bool
    requestId: str


class SearchMovies(Model):
    query: Text
    genre: Annotated[str, StringConstraints(max_length=100)] | None = None
    maxRuntime: int | None = Field(default=None, ge=1, le=600)
    limit: int = Field(default=3, ge=1, le=5)


class MovieId(Model):
    movieId: int = Field(gt=0)


class SearchBooks(Model):
    query: Text
    limit: int = Field(default=3, ge=1, le=5)


class BookId(Model):
    bookId: Identifier


class ToolResult(Model):
    movies: list[Movie] = Field(default_factory=list, max_length=5)
    books: list[Book] = Field(default_factory=list, max_length=5)
    adaptation: Adaptation | None = None

    @field_validator("movies", "books")
    @classmethod
    def unique_ids(cls, value: list[Movie] | list[Book]) -> list[Movie] | list[Book]:
        if len({item.id for item in value}) != len(value):
            raise ValueError("Duplicate resource IDs")
        return value
