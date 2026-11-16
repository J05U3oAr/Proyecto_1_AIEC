from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class MoviesSettings(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore")
    tmdb_read_token: SecretStr = SecretStr("")
    mcp_token: SecretStr = SecretStr("")
    redis_url: SecretStr = SecretStr("redis://localhost:6379/0")
    tmdb_daily_budget: int = Field(default=1000, ge=1, le=1000)
    catalog_cache_ttl: int = Field(default=3600, ge=1, le=86400)
    tmdb_timeout: float = Field(default=5, ge=0.1, le=10)
    tmdb_retries: int = Field(default=1, ge=0, le=1)
    movies_allowed_hosts: list[str] = [
        "localhost",
        "localhost:*",
        "127.0.0.1",
        "127.0.0.1:*",
        "movies:8001",
    ]

    @field_validator("movies_allowed_hosts")
    @classmethod
    def explicit_hosts(cls, value: list[str]) -> list[str]:
        if not value or any("*" in host.removesuffix(":*") for host in value):
            raise ValueError("Explicit MCP hosts required")
        return value
