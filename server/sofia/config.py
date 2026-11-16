from pydantic import Field, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore")

    nvidia_api_key: SecretStr = SecretStr("")
    nvidia_base_url: str = "https://integrate.api.nvidia.com/v1"
    nvidia_model: str = "nvidia/nemotron-3.5-lightning-30b-a3b"
    redis_url: SecretStr = SecretStr("redis://localhost:6379/0")
    movies_mcp_url: str = "http://localhost:8001/mcp"
    books_mcp_url: str = "http://localhost:8002/mcp"
    mcp_token: SecretStr = SecretStr("")
    allowed_origins: list[str] = ["http://localhost:3000"]
    session_ttl: int = Field(default=1800, ge=60, le=86400)
    max_history: int = Field(default=20, ge=2, le=100)
    max_llm_calls: int = Field(default=4, ge=1, le=8)
    max_tool_calls: int = Field(default=6, ge=1, le=12)
    max_output_tokens: int = Field(default=2048, ge=128, le=4096)
    turn_timeout: float = Field(default=60, ge=1, le=120)
    provider_timeout: float = Field(default=15, ge=0.1, le=30)
    llm_daily_budget: int = Field(default=1000, ge=1, le=1000)
    request_body_limit: int = Field(default=16384, ge=1024, le=32768)

    @model_validator(mode="after")
    def cloud_policy(self) -> "Settings":
        # Only the two reviewed free-endpoint candidates; no automatic fallback.
        if self.nvidia_base_url != "https://integrate.api.nvidia.com/v1":
            raise ValueError("Only the reviewed NVIDIA endpoint is allowed")
        if self.nvidia_model not in {
            "nvidia/nemotron-3.5-lightning-30b-a3b",
            "nvidia/nemotron-3.5-super-vl-120b-a12b",
        }:
            raise ValueError("Model must be a reviewed free-endpoint candidate")
        if "*" in self.allowed_origins:
            raise ValueError("Explicit CORS origins are required")
        return self
