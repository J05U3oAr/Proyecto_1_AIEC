from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class BooksSettings(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore")
    google_books_api_key: SecretStr = SecretStr("")
    mcp_token: SecretStr = SecretStr("")
    redis_url: SecretStr = SecretStr("redis://localhost:6379/0")
    google_books_daily_budget: int = Field(default=1000, ge=1, le=1000)
    catalog_cache_ttl: int = Field(default=3600, ge=1, le=86400)
    google_books_timeout: float = Field(default=5, ge=0.1, le=10)
    google_books_retries: int = Field(default=1, ge=0, le=1)
    books_allowed_hosts: list[str] = [
        "localhost",
        "localhost:*",
        "127.0.0.1",
        "127.0.0.1:*",
        "books:8002",
    ]

    @field_validator("books_allowed_hosts")
    @classmethod
    def explicit_hosts(cls, value: list[str]) -> list[str]:
        if not value or any("*" in host.removesuffix(":*") for host in value):
            raise ValueError("Explicit MCP hosts required")
        return value
