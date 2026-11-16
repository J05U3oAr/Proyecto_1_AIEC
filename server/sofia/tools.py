from dataclasses import dataclass

from sofia.errors import PublicError
from sofia.models import BookId, Model, MovieId, SearchBooks, SearchMovies, ToolResult


@dataclass(frozen=True)
class Tool:
    server: str
    description: str
    arguments: type[Model]


TOOLS = {
    "search_movies": Tool("movies", "Buscar películas por preferencias o título.", SearchMovies),
    "movie_details": Tool("movies", "Obtener película, póster e IMDb por ID TMDB.", MovieId),
    "search_books": Tool(
        "books", "Buscar candidatos de libros; no confirma adaptación.", SearchBooks
    ),
    "book_details": Tool("books", "Obtener metadatos y URL de un libro.", BookId),
    "adaptation_evidence": Tool("books", "Consultar vínculo y evidencia película/libro.", MovieId),
}


def definitions() -> list[dict[str, object]]:
    return [
        {
            "type": "function",
            "function": {
                "name": name,
                "description": tool.description,
                "parameters": tool.arguments.model_json_schema(),
            },
        }
        for name, tool in TOOLS.items()
    ]


def validate_result(name: str, args: Model, result: ToolResult) -> None:
    if name in {"search_movies", "movie_details"}:
        valid = not result.books and result.adaptation is None
        if isinstance(args, MovieId):
            valid = (
                valid
                and len(result.movies) <= 1
                and all(movie.id == args.movieId for movie in result.movies)
            )
        if isinstance(args, SearchMovies):
            valid = valid and len(result.movies) <= args.limit
    elif name == "adaptation_evidence":
        valid = (
            isinstance(args, MovieId)
            and result.adaptation is not None
            and result.adaptation.movieId == args.movieId
            and not result.movies
            and not result.books
        )
    else:
        valid = not result.movies and result.adaptation is None
        if isinstance(args, BookId):
            valid = (
                valid
                and len(result.books) <= 1
                and all(book.id == args.bookId for book in result.books)
            )
        if isinstance(args, SearchBooks):
            valid = valid and len(result.books) <= args.limit
    if not valid:
        raise PublicError("invalid_tool_result", "El catálogo devolvió datos incompatibles.")
