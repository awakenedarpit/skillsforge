"""The only place the application reads the current date."""

from datetime import date, datetime
from zoneinfo import ZoneInfo

from app.core.config import get_settings


def today() -> date:
    """Return APP_TODAY when set, otherwise the current date in APP_TIMEZONE."""
    settings = get_settings()
    if settings.app_today:
        return date.fromisoformat(settings.app_today)
    return datetime.now(ZoneInfo(settings.app_timezone)).date()


def utcnow() -> datetime:
    return datetime.now(ZoneInfo("UTC"))
