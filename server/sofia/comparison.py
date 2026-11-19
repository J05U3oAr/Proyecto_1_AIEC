"""Bounded presentation of reviewed premises; never infer scenes from catalog blurbs."""

import re

from sofia.dialogue import plain_catalog_text, words
from sofia.errors import PublicError
from sofia.models import Adaptation, Comparison, Movie, Source

BOOK_PREMISE = "Premisa del libro: "
MOVIE_PREMISE = "Premisa de la película: "


def comparison_followup(prompt: str) -> bool:
    # Named requests use the existing agent/tool selection; never reuse a different movie.
    return bool(
        re.fullmatch(
            r"(?:compara(?:r|la|lo)?(?: (?:esa|esta|la) pelicula)?(?: con (?:su|el) libro)?"
            r"|(?:que diferencias hay|cuales son las diferencias)(?: con (?:su|el) libro)?"
            r"|vale la pena verla (?:comparada con el|frente al) libro"
            r"|(?:(?:esa|esta|la) pelicula |(?:esas|estas|las) peliculas )?"
            r"tienen? (?:un )?libros?(?: original(?:es)?)?"
            r"|(?:(?:esa|esta|la) pelicula )?(?:se basa|esta basada) en (?:un )?(?:libro|novela)"
            r"|en que (?:(?:libro|novela) )?(?:se basa|esta basad[ao])"
            r"(?: (?:esa|esta|la) pelicula)?)"
            r"(?: sin spoilers)?",
            words(prompt),
        )
    )


def comparison_sources(movie: Movie, adaptation: Adaptation) -> list[Source]:
    sources = [Source(provider="tmdb", url=movie.tmdb, label=movie.title)]
    sources.extend(item.source for item in adaptation.evidence)
    if adaptation.book:
        sources.append(
            Source(
                provider="google_books",
                url=adaptation.book.url,
                label=adaptation.book.title,
            )
        )
    return list({source.url: source for source in sources}.values())


def build_comparison(movie: Movie, adaptation: Adaptation) -> Comparison:
    if adaptation.movieId != movie.id:
        raise PublicError("invalid_comparison", "Selecciona la película antes de comparar.")
    movie_label = plain_catalog_text(movie.title[:120])
    lines = [f"Película: {movie_label} ({movie.year or 'año no disponible'})."]
    if adaptation.status != "confirmed":
        lines.append(
            "Hay una referencia al vínculo, pero no pude verificar "
            "una edición compatible del libro."
            if adaptation.status == "uncertain"
            else "No hay evidencia revisada de esta adaptación en la colección disponible. "
            "Esto no demuestra que no exista un libro."
        )
        lines.append("Con estos datos no puedo comparar ni recomendarla frente al libro.")
    else:
        book = adaptation.book
        if book is None:
            raise PublicError("invalid_comparison", "Faltan datos del libro para comparar.")
        authors = ", ".join(plain_catalog_text(author[:60]) for author in book.authors[:2])
        lines.append(
            f"Libro: {plain_catalog_text(book.title[:120])}"
            f"{', de ' + authors if authors else ''}. "
            f"Año de esta edición: {book.year or 'no disponible'}."
        )
        premises: dict[str, str] = {}
        for item in adaptation.evidence:
            prefix = next(
                (p for p in (BOOK_PREMISE, MOVIE_PREMISE) if item.statement.startswith(p)), None
            )
            if prefix is None:
                continue
            # Facts remain attributed data; a mismatched movie reference cannot justify its premise.
            if prefix == BOOK_PREMISE and item.source.provider != "google_books":
                continue
            if prefix == MOVIE_PREMISE and (
                item.source.provider not in {"tmdb", "imdb"}
                or (item.source.provider == "tmdb" and item.source.url != movie.tmdb)
                or (item.source.provider == "imdb" and movie.imdb and item.source.url != movie.imdb)
            ):
                continue
            premises.setdefault(prefix, item.statement[len(prefix) :])
        if premises:
            lines.append("Hechos documentados, sin spoilers de desenlace:")
            for prefix in (BOOK_PREMISE, MOVIE_PREMISE):
                if prefix in premises:
                    lines.append(prefix + plain_catalog_text(premises[prefix][:350]))
        if len(premises) == 2:
            lines.append(
                "Mi valoración subjetiva: sí puede valer la pena verla si te interesa "
                "la premisa de la película, como otra aproximación a la obra. "
                "No puedo afirmar que sea mejor o más fiel al libro con estas fuentes."
            )
        else:
            lines.append(
                "Datos parciales: el vínculo está confirmado, pero faltan premisas "
                "documentadas de ambos medios. No tengo base suficiente para recomendarla "
                "frente al libro."
            )
    lines.append(
        "Alcance: comparación de premisas; no lectura íntegra ni análisis de escenas o finales."
    )
    lines.extend(plain_catalog_text(limit[:150]) for limit in adaptation.limitations[:3])
    return Comparison(adaptation=adaptation, verdict="\n\n".join(lines)[:4000])
