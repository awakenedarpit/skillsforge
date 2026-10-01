"""Assignment verdict. Binary green/red, with every applicable reason."""

from dataclasses import dataclass, field
from datetime import date

from app.core.rules import LEVELS, expiry_window_days, qualified_min_level
from app.domain.coverage import OperatorView, SkillRecord, SkillView
from app.domain.qualification import days_to_expiry, effective_level, is_qualified


@dataclass
class WorkloadStats:
    counts: dict[int, int] = field(default_factory=dict)
    median: float = 0


def _reason(code: str, message: str) -> dict:
    return {"code": code, "message": message}


def check_assignment(
    operator: OperatorView,
    skill: SkillView,
    record: SkillRecord | None,
    assignment_date: date,
    shift_id: int,
    workload_stats: WorkloadStats,
    shifts_by_id: dict[int, str] | None = None,
    alternatives: list[dict] | None = None,
) -> dict:
    """Return verdict, blocking reasons, warnings, and ranked alternatives.

    `alternatives` is supplied by the caller (already ranked) so this function
    stays free of database access. Pass an empty list when none exist.
    """
    blocking: list[dict] = []
    warnings: list[dict] = []
    threshold = qualified_min_level()
    level = record.level if record else 0
    until = record.certified_until if record else None
    remaining = days_to_expiry(until, assignment_date)
    names = shifts_by_id or {}

    if not operator.is_active:
        blocking.append(_reason("OPERATOR_INACTIVE", f"{operator.name} is inactive and cannot be assigned."))

    if record is None:
        blocking.append(_reason("NO_SKILL_RECORD", f"No skill record for {operator.name} on {skill.name}."))
    else:
        if level < threshold:
            label = LEVELS.get(threshold, "can operate")
            blocking.append(
                _reason(
                    "LEVEL_TOO_LOW",
                    f"Level {level} on {skill.name}; needs at least {threshold} ({label}).",
                )
            )
        if until is not None and until < assignment_date:
            days_ago = assignment_date.toordinal() - until.toordinal()
            blocking.append(
                _reason(
                    "CERT_EXPIRED",
                    f"Certification expired {days_ago} days ago (on {until.isoformat()}).",
                )
            )
        elif level >= threshold and until is None:
            warnings.append(
                _reason(
                    "CERT_DATE_MISSING",
                    f"No certification expiry recorded for {operator.name} on {skill.name}.",
                )
            )
        elif (
            remaining is not None
            and 0 <= remaining <= expiry_window_days()
            and effective_level(level, until, assignment_date) >= threshold
        ):
            warnings.append(
                _reason(
                    "CERT_EXPIRING_SOON",
                    f"Certification expires in {remaining} days (on {until.isoformat()}).",
                )
            )

    if shift_id != operator.shift_id:
        op_shift = names.get(operator.shift_id, str(operator.shift_id))
        asked = names.get(shift_id, str(shift_id))
        warnings.append(
            _reason("WRONG_SHIFT", f"{operator.name} is on shift {op_shift}, not shift {asked}.")
        )

    count = workload_stats.counts.get(operator.id, 0)
    limit = 1.5 * workload_stats.median
    if workload_stats.median > 0 and count > limit:
        warnings.append(
            _reason(
                "OVERLOADED",
                f"{operator.name} has {count} assignments in the last 14 days, above 1.5× the median ({workload_stats.median:g}).",
            )
        )

    verdict = "green" if not blocking else "red"
    return {
        "verdict": verdict,
        "blocking": blocking,
        "warnings": warnings,
        "alternatives": alternatives or [],
    }


def rank_alternatives(
    operators: list[OperatorView],
    skill: SkillView,
    records: list[SkillRecord],
    assignment_date: date,
    shift_id: int,
    workload_stats: WorkloadStats,
    exclude_operator_id: int,
    shifts_by_id: dict[int, str] | None = None,
) -> list[dict]:
    """Up to three qualified operators. Same shift, then lighter workload, then stable cert, then higher level."""
    by_pair = {(r.operator_id, r.skill_id): r for r in records}
    names = shifts_by_id or {}
    window = expiry_window_days()
    ranked: list[tuple] = []
    for op in operators:
        if op.id == exclude_operator_id:
            continue
        record = by_pair.get((op.id, skill.id))
        level = record.level if record else 0
        until = record.certified_until if record else None
        if not is_qualified(op.is_active, level, until, assignment_date):
            continue
        remaining = days_to_expiry(until, assignment_date)
        expiring = remaining is not None and 0 <= remaining <= window
        load = workload_stats.counts.get(op.id, 0)
        same = op.shift_id == shift_id
        why_bits = [
            "same shift" if same else f"shift {names.get(op.shift_id, op.shift_id)}",
            f"{load} assignments in 14 days",
            "cert not expiring soon" if not expiring else f"cert expires in {remaining} days",
            f"level {level}",
        ]
        ranked.append(
            (
                (0 if same else 1, load, 0 if not expiring else 1, -level, op.name),
                {
                    "operator_id": op.id,
                    "name": op.name,
                    "shift_id": op.shift_id,
                    "shift_name": names.get(op.shift_id, str(op.shift_id)),
                    "level": level,
                    "certified_until": until.isoformat() if until else None,
                    "days_to_expiry": remaining,
                    "workload_count": load,
                    "why": ", ".join(why_bits) + ".",
                },
            )
        )
    ranked.sort(key=lambda item: item[0])
    return [item[1] for item in ranked[:3]]
