from starlette.applications import Starlette

from books.config import BooksSettings
from books.server import create_app


def app() -> Starlette:
    return create_app(BooksSettings())
