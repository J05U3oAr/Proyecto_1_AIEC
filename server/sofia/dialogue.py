"""Conservative conversational routing; catalog facts still require verified tool results."""

import re
import unicodedata
from dataclasses import dataclass
from typing import Literal

from sofia.models import Movie

CAPABILITY = "Puedo comparar películas con sus libros cuando exista evidencia de adaptación."
CAPABILITIES = (
    "Soy Sofía, tu asistente de IA de cine y libros. Puedo recomendarte películas según "
    "tus gustos, buscar sus fichas y mostrarte referencias verificadas. "
    + CAPABILITY
    + " ¿Qué te gustaría ver?"
)
OUT_OF_SCOPE = (
    "Me especializo en películas y comparaciones con sus libros; no puedo resolver esa solicitud. "
    "Puedo ayudarte a elegir una película o buscar una adaptación."
)
BLOCKED = (
    "No genero ni ejecuto código, ni comparto instrucciones internas o credenciales. "
    "Puedo ayudarte con películas y sus adaptaciones literarias."
)


def normalized(text: str) -> str:
    return "".join(
        char
        for char in unicodedata.normalize("NFKD", text.casefold())
        if unicodedata.category(char) not in {"Mn", "Cf"}
    ).strip()


def words(text: str) -> str:
    return " ".join(re.sub(r"[^\w\s]", " ", normalized(text)).split())


@dataclass(frozen=True)
class Intent:
    kind: Literal[
        "greeting",
        "capabilities",
        "social",
        "out_of_scope",
        "blocked",
        "book_based_recommendation",
        "catalog",
        "lookup",
        "metadata",
    ]
    reply: str | None = None
    query: str | None = None


def route(prompt: str) -> Intent:
    text = words(prompt)
    # A salutation or a film name cannot authorize a second, unrelated task.
    if re.search(
        r"\b(?:ignora\w*|olvida\w*|ignore|disregard)\b.{0,80}"
        r"\b(?:reglas|instrucciones|politicas|instructions|rules)\b|"
        r"\b(?:prompt del sistema|system prompt|instrucciones internas|"
        r"credenciales|api key|api_key|chain of thought)\b|"
        r"\b(?:escrib\w*|genera\w*|hazme|dame|crea\w*|explica\w*|depura\w*|"
        r"implementa\w*|darme|muestrame|write|generate|debug)\s+(?:(?:un|una|el|la|me|ejemplo de|"
        r"fragmento de|a|an|the)\s+){0,3}(?:codigo|code|script|funcion|programa|sql|python|"
        r"javascript|typescript|html|css|app|aplicacion|pagina web|sitio web)\b|"
        r"\b(?:actua como|act as)\s+(?:un\s+)?(?:programador|developer)\b",
        text,
    ):
        return Intent("blocked", BLOCKED)
    without_hello = re.sub(
        r"^(?:(?:hola|hey|hi|hello|buenas|buenos dias|buenas tardes|buenas noches)\s+)+",
        "",
        text + " ",
    ).strip()
    if re.fullmatch(
        r"(?:sofia\s+)?(?:que puedes hacer|que sabes hacer|quien eres|cuales son tus capacidades|"
        r"como funcionas|como te uso|como te llamas|en que puedes ayudarme|como puedes ayudarme|"
        r"que puedo preguntarte|ayuda|help|tus capacidades|capacidades)",
        without_hello,
    ):
        return Intent("capabilities", CAPABILITIES)
    if re.fullmatch(
        r"(?:(?:hola|hey|hi|hello|buenas|buenos dias|buenas tardes|buenas noches)\s*)+"
        r"(?:(?:sofia|asistente)\s*)?(?:como estas|que tal(?: estas)?)?",
        text,
    ) or text in {"como estas", "que tal", "que tal estas", "todo bien"}:
        return Intent("greeting", "¡Hola! " + CAPABILITIES)
    if re.fullmatch(
        r"(?:muchas )?gracias(?: sofia| por tu ayuda)?|adios|hasta luego|nos vemos|"
        r"mucho gusto|encantad[ao]|bien gracias|estoy bien|todo bien",
        text,
    ):
        return Intent("social", "¡Con gusto! Aquí estaré si quieres buscar otra película.")
    if re.search(
        r"\b(?:puntuacion(?:es)?|calificacion(?:es)?|ratings?|generos?|duracion|"
        r"cuanto (?:tiempo )?dura)\b",
        text,
    ) and not re.search(r"\b(?:recomiend\w*|compara\w*|busca\w*)\b", text):
        target = re.search(
            r"(?:puntuacion(?:es)?|calificacion(?:es)?|ratings?|generos?|duracion)"
            r"(?: en (?:tmdb|imdb))? (?:de|del|tiene|es) (.+)$|"
            r"cuanto (?:tiempo )?dura (.+)$|"
            r"^(.+?) (?:que (?:puntuacion|calificacion|generos?) tiene|cuanto dura)$",
            text,
        )
        query = next((part for part in target.groups() if part), "") if target else ""
        query = re.sub(r" en (?:tmdb|imdb)$", "", query)
        if query in {"esa", "esa pelicula", "la pelicula", "esta", "tiene"}:
            query = ""
        return Intent("metadata", query=query or None)
    if re.search(
        r"\b(?:basad[oa]s? en (?:un )?(?:libro|novela)|"
        r"adaptad[oa]s? de (?:un )?(?:libro|novela))\b",
        text,
    ):
        genres = {
            "ciencia ficcion": "Ciencia ficción",
            "ficcion cientifica": "Ciencia ficción",
            "accion": "Acción",
            "comedia": "Comedia",
            "drama": "Drama",
            "terror": "Terror",
        }
        genre = next(
            (value for term, value in genres.items() if re.search(rf"\b{re.escape(term)}\b", text)),
            None,
        )
        if genre:
            return Intent("book_based_recommendation", query=genre)
    if re.search(
        r"\b(?:peliculas?|pelis?|cine|films?|movies?|libros?|novelas?|adaptaci\w*|"
        r"tmdb|imdb|books|sinopsis|guion|generos?|duracion|recomiend\w*|recomendar|"
        r"recomendacion|busca|buscar|busco|compara\w*|ciencia ficcion|terror|"
        r"comedia|drama|accion|vale la pena|verla|opinion|recomendarias)\b",
        text,
    ):
        return Intent("catalog")
    # Bare titles and selections are requests for catalog data, never open-ended chat.
    first = text.split()[0] if text else ""
    if (
        0 < len(text.split()) <= 8
        and len(text) <= 120
        and first
        not in {
            "que",
            "quien",
            "cuanto",
            "como",
            "donde",
            "cuando",
            "cual",
            "dame",
            "haz",
            "escribe",
            "explica",
            "resuelve",
            "calcula",
            "me",
            "puedes",
            "necesito",
            "quiero",
            "ayudame",
        }
        and not re.fullmatch(
            r"(?:explic|ayud|calcul|resuelv|program|gener|escrib|crea|haz|cuent|habl|ensen|"
            r"teach|debug|implement|write|solve)\w*",
            first,
        )
        and not any(c in prompt for c in "\n;{}=<>`+")
    ):
        query = re.sub(r"\s+1$", "", prompt.strip())
        return Intent("lookup", query=query)
    return Intent("out_of_scope", OUT_OF_SCOPE)


def select_candidates(prompt: str, movies: list[Movie]) -> list[Movie] | None:
    """None means not a selection; [] means a selection without a matching candidate."""
    text = words(prompt)
    ordinal = re.fullmatch(r"(?:la |opcion )?(primera|segunda|tercera|cuarta|quinta|[1-5])", text)
    if ordinal and movies:
        value = ordinal[1]
        index = (
            int(value) - 1
            if value.isdigit()
            else ["primera", "segunda", "tercera", "cuarta", "quinta"].index(value)
        )
        return movies[index : index + 1]
    year = re.fullmatch(r"(?:(?:la )?(?:de|del) )?(\d{4})", text)
    if year:
        return [movie for movie in movies if movie.year == int(year[1])]
    exact_title = [movie for movie in movies if words(movie.title) == text]
    if exact_title:
        return exact_title
    if text in {"esa", "esa pelicula", "esa version", "la misma", "esa misma"} and movies:
        return movies
    title_year = re.fullmatch(r"(.+?)(?:\s+(?:de|del|from))?\s+(\d{4})", text)
    title = title_year[1] if title_year else text
    matching = [
        movie
        for movie in movies
        if words(movie.title) == title and (not title_year or movie.year == int(title_year[2]))
    ]
    return matching or None


def plain_catalog_text(value: str) -> str:
    value = re.sub(r"https?://\S+", "[referencia omitida]", value)
    return re.sub(r"([\\`*_{}\[\]<>()#!|])", r"\\\1", value)


def movie_metadata(movie: Movie) -> str:
    genres = ", ".join(plain_catalog_text(genre) for genre in movie.genres) or "no disponibles"
    runtime = f"{movie.runtime} min" if movie.runtime is not None else "no disponible"
    rating = (
        f"{movie.tmdbRating:.1f}/10 ({movie.voteCount} votos)"
        if movie.tmdbRating is not None and movie.voteCount
        else "no disponible (sin votos verificados)"
    )
    return f"Géneros: {genres}\n\nDuración: {runtime}\n\nPuntuación TMDB: {rating}"


def movie_text(movies: list[Movie]) -> str:
    if not movies:
        return "No encontré una película con esos datos. Prueba con el título y el año de estreno."
    labels = [f"{plain_catalog_text(m.title)} ({m.year or 'año desconocido'})" for m in movies]
    if len(movies) > 1:
        return (
            "Encontré varias opciones: "
            + "; ".join(labels)
            + ". ¿Cuál prefieres? Indica título o año."
        )
    text = f"**{labels[0]}**\n\n" + movie_metadata(movies[0])
    if movies[0].overview:
        text += "\n\nSinopsis de TMDB: " + plain_catalog_text(movies[0].overview[:1600])
    return text


def unsupported_output(text: str) -> bool:
    # Ratings in model prose are replaced by the deterministic verified metadata renderer.
    return bool(
        re.search(
            r"\b\d{1,2}(?:[.,]\d+)?\s*(?:/\s*10|sobre\s*10|de\s*10|out of\s*10)\b|"
            r"\b(?:puntuacion(?:es)?|ratings?|calificacion(?:es)?|scores?|estrellas|stars)\b|"
            r"\bimdb\b|\b\d{1,2}(?:[.,]\d+)?\s+puntos\b|\bnota (?:de|es)\b|"
            r"\b(?:imdb|tmdb)\b.{0,80}\bpuntos\b|\b\d{1,3}\s*%",
            normalized(text),
            re.S,
        )
    )
