from typing import List
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Supabase config
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_ROLE_KEY: str

    # Postgres config (Alembic + direct DB access)
    DATABASE_URL: str

    # Gemini config
    GEMINI_API_KEY: str | None = None
    GEMINI_MODEL: str = "gemini-2.5-flash"  # Default model, can be overridden

    # Telegram configuration
    TELEGRAM_BOT_TOKEN: str

    # Server / CORS config
    PORT: int = 8000
    ALLOWED_ORIGINS: str = "http://localhost:5173"

    @property
    def cors_origins(self) -> List[str]:
        """Parses the comma-separated ALLOWED_ORIGINS string into a list of origins."""
        return [
            origin.strip()
            for origin in self.ALLOWED_ORIGINS.split(",")
            if origin.strip()
        ]

    @field_validator(
        "SUPABASE_URL",
        "SUPABASE_ANON_KEY",
        "SUPABASE_SERVICE_ROLE_KEY",
        "DATABASE_URL",
        "TELEGRAM_BOT_TOKEN",
    )
    @classmethod
    def validate_non_empty(cls, v: str) -> str:
        """Ensure critical environment variables are not empty strings."""
        if not v or not v.strip():
            raise ValueError("Variable cannot be empty")
        return v.strip()


# Instantiate settings. This will load from environment variables and/or the .env file.
# Pydantic Settings will raise a ValidationError on startup if any required fields are missing
# or fail to validate, ensuring the application fails fast.
settings = Settings()
