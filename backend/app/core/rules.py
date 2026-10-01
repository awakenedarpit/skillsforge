"""Named domain constants. Live values come from settings so env vars win."""

from app.core.config import get_settings

# Defaults. Call the functions below at use time so tests and env overrides apply.
QUALIFIED_MIN_LEVEL = 2
MIN_COVERAGE = 2
EXPIRY_WINDOW_DAYS = 30

LEVELS: dict[int, str] = {
    0: "None",
    1: "Learning (supervised only)",
    2: "Can operate independently",
    3: "Proficient",
    4: "Can train others",
}

CRITICALITY_WEIGHT: dict[int, float] = {1: 1.0, 2: 1.15, 3: 1.3}


def qualified_min_level() -> int:
    return get_settings().qualified_min_level


def min_coverage() -> int:
    return get_settings().min_coverage


def expiry_window_days() -> int:
    return get_settings().expiry_window_days


def public_rules() -> dict:
    return {
        "QUALIFIED_MIN_LEVEL": qualified_min_level(),
        "MIN_COVERAGE": min_coverage(),
        "EXPIRY_WINDOW_DAYS": expiry_window_days(),
        "levels": [{"level": k, "label": v} for k, v in LEVELS.items()],
        "criticality_weight": CRITICALITY_WEIGHT,
        "coverage_status": {
            "RED": f"fewer than {min_coverage()} qualified operators",
            "AMBER": f"exactly {min_coverage()} qualified operators (thin)",
            "GREEN": f"more than {min_coverage()} qualified operators",
        },
        "alert_severity": {
            "expired": "days remaining < 0",
            "critical": "0 to 7 days",
            "warning": "8 to 14 days",
            "notice": "15 to 30 days",
        },
    }
