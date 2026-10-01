"""Machine risk score, 0–100, with an explainable breakdown."""

from app.core.rules import CRITICALITY_WEIGHT, expiry_window_days
from app.domain.coverage import CoverageCell


def risk_score(skill_criticality: int, cells: list[CoverageCell]) -> dict:
    counts = [cell.qualified_count for cell in cells] or [0]
    minimum = min(counts)
    if minimum <= 0:
        base = 100
    elif minimum == 1:
        base = 70
    elif minimum == 2:
        base = 30
    else:
        base = 5

    window = expiry_window_days()
    expiring_people = 0
    trainers = 0
    seen: set[int] = set()
    for cell in cells:
        for person in cell.qualified_operators:
            if person.id in seen:
                continue
            seen.add(person.id)
            if person.level >= 4:
                trainers += 1
            if person.days_to_expiry is not None and 0 <= person.days_to_expiry <= window:
                expiring_people += 1
    expiring_points = min(20, expiring_people * 10)
    trainer_points = 0 if trainers else 15
    weight = CRITICALITY_WEIGHT.get(skill_criticality, 1.0)
    raw = base + expiring_points + trainer_points
    weighted = raw * weight
    score = min(100, int(round(weighted)))
    breakdown = [
        {
            "term": "base_coverage",
            "detail": f"Weakest shift has {minimum} qualified operator{'s' if minimum != 1 else ''}",
            "value": base,
        },
        {
            "term": "expiring_certs",
            "detail": f"{expiring_people} qualified operator{'s' if expiring_people != 1 else ''} with a certificate inside {window} days (capped at +20)",
            "value": expiring_points,
        },
        {
            "term": "no_trainer",
            "detail": "No qualified level-4 trainer" if trainer_points else "A qualified level-4 trainer exists",
            "value": trainer_points,
        },
        {
            "term": "criticality",
            "detail": f"Criticality {skill_criticality} applies ×{weight:.2f} to the subtotal {raw}",
            "value": weight,
        },
    ]
    if weighted > 100:
        breakdown.append({"term": "cap", "detail": "Score capped at 100", "value": 100})
    return {"score": score, "breakdown": breakdown, "raw": raw, "weighted": weighted}
