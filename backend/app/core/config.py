from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Load configuration from environment (.env supported)."""

    model_config = SettingsConfigDict(
        # Load `.env` first, then `.env.local` (common IDE convention); later file overrides.
        env_file=(".env", ".env.local"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    supabase_url: str = ""
    supabase_key: str = ""
    database_url: str | None = None
    frontend_origin: str = "http://localhost:3000"

    # Local model server (e.g. Ollama) — no external APIs; see README.
    local_ai_base_url: str = "http://127.0.0.1:11434"
    local_ai_model: str = "phi4-mini"
    local_ai_timeout_seconds: int = 60


settings = Settings()
