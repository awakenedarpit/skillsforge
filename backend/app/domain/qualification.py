"""Effective qualification. No database access."""

from datetime import date

from app.core.rules import qualified_min_level


def effective_level(level: int, certified_until: date | None, on_date: date) -> int:
    """Stored level, or 0 when a certificate date is set and is earlier than on_date."""
    if certified_until is not None and certified_until < on_date:
        return 0
    return level


def is_qualified(
    operator_active: bool,
    level: int,
    certified_until: date | None,
    on_date: date,
    min_level: int | None = None,
) -> bool:
    if not operator_active:
        return False
    threshold = qualified_min_level() if min_level is None else min_level
    return effective_level(level, certified_until, on_date) >= threshold


def days_to_expiry(certified_until: date | None, on_date: date) -> int | None:
    if certified_until is None:
        return None
    return (certified_until - on_date).days
