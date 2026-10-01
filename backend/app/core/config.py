"""Environment-backed settings. The repository-root `.env` is optional."""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/app/core/config.py -> repository root is parents[3]
ROOT_DIR = Path(__file__).resolve().parents[3]
BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(ROOT_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = "sqlite:///./skillmatrix.db"
    port: int = 8000
    app_timezone: str = "Asia/Kolkata"
    app_today: str | None = None
    job_secret: str = "dev-job-secret"
    expiry_job_cron: str = "0 6 * * *"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    auto_seed: bool = True
    app_version: str = "1.0.0"

    # Domain rules, overridable (section 2).
    qualified_min_level: int = 2
    min_coverage: int = 2
    expiry_window_days: int = 30


@lru_cache
def get_settings() -> Settings:
    return Settings()
