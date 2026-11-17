import pytest
from pydantic import ValidationError

from sofia.config import Settings


@pytest.mark.parametrize(
    "changes",
    [
        {"nvidia_base_url": "https://evil.example/v1"},
        {"nvidia_model": "paid-unreviewed-model"},
        {"allowed_origins": ["*"]},
        {"llm_daily_budget": 1001},
        {"max_llm_calls": 0},
    ],
)
def test_configuration_cannot_silently_change_trust_or_budget(changes):
    with pytest.raises(ValidationError):
        Settings(_env_file=None, **changes)


def test_alternative_is_explicit_and_secrets_are_redacted():
    settings = Settings(
        _env_file=None,
        nvidia_model="nvidia/nemotron-3.5-super-vl-120b-a12b",
        nvidia_api_key="synthetic-secret",
    )
    assert "synthetic-secret" not in repr(settings)


def test_public_env_example_covers_every_setting_without_credentials():
    from pathlib import Path

    example = Path(__file__).resolve().parents[2] / ".env.example"
    fields = {
        line.split("=", 1)[0].strip().lower()
        for line in example.read_text().splitlines()
        if "=" in line and not line.lstrip().startswith("#")
    }
    from books.config import BooksSettings
    from movies.config import MoviesSettings

    assert fields == (
        set(Settings.model_fields)
        | set(MoviesSettings.model_fields)
        | set(BooksSettings.model_fields)
        | {"vite_chat_mode"}
    )
    movies = MoviesSettings(_env_file=example)
    assert movies.tmdb_read_token.get_secret_value() == ""
    assert movies.mcp_token.get_secret_value() == ""
    books = BooksSettings(_env_file=example)
    assert books.google_books_api_key.get_secret_value() == ""
    assert books.mcp_token.get_secret_value() == ""
    settings = Settings(_env_file=example)
    assert settings.nvidia_api_key.get_secret_value() == ""
    assert settings.mcp_token.get_secret_value() == ""
