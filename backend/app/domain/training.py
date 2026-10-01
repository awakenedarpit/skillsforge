"""Cross-training suggestions for red coverage cells. Pure."""

from datetime import date

from app.core.rules import expiry_window_days
from app.domain.coverage import Coverage, OperatorView, SkillRecord, SkillView, ShiftView
from app.domain.qualification import days_to_expiry, is_qualified
from app.domain.risk import risk_score
from app.domain.verdict import WorkloadStats


def recommend_cross_training(
    operators: list[OperatorView],
    skills: list[SkillView],
    shifts: list[ShiftView],
    records: list[SkillRecord],
    coverage: Coverage,
    on_date: date,
    workload_stats: WorkloadStats,
    limit: int = 12,
) -> list[dict]:
    skill_by = {skill.id: skill for skill in skills}
    shift_by = {shift.id: shift for shift in shifts}
    cells_by_skill: dict[int, list] = {}
    for cell in coverage.cells:
        cells_by_skill.setdefault(cell.skill_id, []).append(cell)

    red_cells = [cell for cell in coverage.cells if cell.status == "RED"]
    scored_cells = []
    for cell in red_cells:
        skill = skill_by[cell.skill_id]
        risk = risk_score(skill.criticality, cells_by_skill[cell.skill_id])
        scored_cells.append((-(risk["score"]), skill.code, cell.shift_id, cell, risk))
    scored_cells.sort(key=lambda item: (item[0], item[1], item[2]))

    by_pair = {(record.operator_id, record.skill_id): record for record in records}
    window = expiry_window_days()
    suggestions: list[dict] = []

    for _neg, _code, _shift, cell, risk in scored_cells:
        skill = skill_by[cell.skill_id]
        shift = shift_by[cell.shift_id]
        trainer = _trainer_name(coverage, skill.id)
        candidates = []
        for op in operators:
            if op.shift_id != shift.id or not op.is_active:
                continue
            record = by_pair.get((op.id, skill.id))
            level = record.level if record else 0
            until = record.certified_until if record else None
            if is_qualified(op.is_active, level, until, on_date):
                continue
            score = 0
            factors: list[str] = []
            if level == 1:
                score += 40
                factors.append("already Level 1 on this machine")
            if _same_line_proficient(op, skill, skills, records, on_date):
                score += 30
                factors.append(f"qualified at level 3+ on another {skill.line} machine")
            load = workload_stats.counts.get(op.id, 0)
            if load <= workload_stats.median:
                score += 20
                factors.append("low recent workload")
            if not _any_cert_expiring(op.id, records, on_date, window):
                score += 10
                factors.append("no certificate expiring within 30 days")
            candidates.append((score, op, factors, level))
        candidates.sort(key=lambda item: (-item[0], item[1].name))
        for score, op, factors, level in candidates[:2]:
            trainer_bit = f"{trainer} can train" if trainer else "no level-4 trainer is on this machine yet"
            factor_text = "; ".join(factors) if factors else "available on this shift"
            reason = (
                f"Train {op.name} on {skill.name} ({skill.code}) for shift {shift.name}: "
                f"fixes a red cell; {factor_text}; {trainer_bit}."
            )
            suggestions.append(
                {
                    "skill_id": skill.id,
                    "skill_code": skill.code,
                    "skill_name": skill.name,
                    "shift_id": shift.id,
                    "shift_name": shift.name,
                    "operator_id": op.id,
                    "operator_name": op.name,
                    "current_level": level,
                    "score": score,
                    "trainer_name": trainer,
                    "reason": reason,
                    "factors": factors,
                    "risk_score": risk["score"],
                }
            )
        if len(suggestions) >= limit:
            break
    return suggestions[:limit]


def _trainer_name(coverage: Coverage, skill_id: int) -> str | None:
    for cell in coverage.cells:
        if cell.skill_id != skill_id:
            continue
        for person in cell.qualified_operators:
            if person.level >= 4:
                return person.name
    return None


def _same_line_proficient(op, skill: SkillView, skills: list[SkillView], records: list[SkillRecord], on_date: date) -> bool:
    line_ids = {item.id for item in skills if item.line == skill.line and item.id != skill.id}
    by_pair = {(record.operator_id, record.skill_id): record for record in records}
    for other_id in line_ids:
        record = by_pair.get((op.id, other_id))
        if record and record.level >= 3 and is_qualified(op.is_active, record.level, record.certified_until, on_date):
            return True
    return False


def _any_cert_expiring(operator_id: int, records: list[SkillRecord], on_date: date, window: int) -> bool:
    for record in records:
        if record.operator_id != operator_id or record.certified_until is None:
            continue
        remaining = days_to_expiry(record.certified_until, on_date)
        if remaining is not None and 0 <= remaining <= window and record.level >= 2:
            return True
    return False
