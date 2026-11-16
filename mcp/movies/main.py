from starlette.applications import Starlette

from movies.config import MoviesSettings
from movies.server import create_app


def app() -> Starlette:
    return create_app(MoviesSettings())
