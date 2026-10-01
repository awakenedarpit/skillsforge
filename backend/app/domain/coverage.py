"""Coverage cells, forecast, and resignation simulation. Pure."""

from dataclasses import dataclass, field
from datetime import date, timedelta

from app.core.rules import expiry_window_days, min_coverage
from app.domain.qualification import days_to_expiry, is_qualified


@dataclass
class OperatorView:
    id: int
    name: str
    shift_id: int
    is_active: bool = True


@dataclass
class SkillView:
    id: int
    code: str
    name: str
    line: str
    criticality: int = 2
    is_active: bool = True


@dataclass
class ShiftView:
    id: int
    name: str


@dataclass
class SkillRecord:
    operator_id: int
    skill_id: int
    level: int
    issued_on: date | None = None
    certified_until: date | None = None


@dataclass
class QualifiedOperator:
    id: int
    name: str
    level: int
    certified_until: date | None
    days_to_expiry: int | None


@dataclass
class CoverageCell:
    skill_id: int
    shift_id: int
    qualified_count: int
    status: str
    qualified_operators: list[QualifiedOperator] = field(default_factory=list)
    trainer_count: int = 0
    expiring_soon_count: int = 0


@dataclass
class SkillCoverageTotal:
    skill_id: int
    total_qualified: int


@dataclass
class Coverage:
    cells: list[CoverageCell]
    totals: list[SkillCoverageTotal]


def cell_status(count: int, minimum: int | None = None) -> str:
    threshold = min_coverage() if minimum is None else minimum
    if count < threshold:
        return "RED"
    if count == threshold:
        return "AMBER"
    return "GREEN"


def coverage_cells(
    operators: list[OperatorView],
    skills: list[SkillView],
    shifts: list[ShiftView],
    records: list[SkillRecord],
    on_date: date,
) -> Coverage:
    window = expiry_window_days()
    by_pair: dict[tuple[int, int], SkillRecord] = {(r.operator_id, r.skill_id): r for r in records}
    active_skills = [s for s in skills if s.is_active]
    cells: list[CoverageCell] = []
    totals: list[SkillCoverageTotal] = []

    for skill in active_skills:
        total = 0
        for shift in shifts:
            people: list[QualifiedOperator] = []
            for op in operators:
                if op.shift_id != shift.id:
                    continue
                record = by_pair.get((op.id, skill.id))
                level = record.level if record else 0
                until = record.certified_until if record else None
                if not is_qualified(op.is_active, level, until, on_date):
                    continue
                remaining = days_to_expiry(until, on_date)
                people.append(
                    QualifiedOperator(
                        id=op.id,
                        name=op.name,
                        level=level,
                        certified_until=until,
                        days_to_expiry=remaining,
                    )
                )
            people.sort(key=lambda person: (-person.level, person.name))
            trainers = sum(1 for person in people if person.level >= 4)
            expiring = sum(
                1
                for person in people
                if person.days_to_expiry is not None and 0 <= person.days_to_expiry <= window
            )
            cells.append(
                CoverageCell(
                    skill_id=skill.id,
                    shift_id=shift.id,
                    qualified_count=len(people),
                    status=cell_status(len(people)),
                    qualified_operators=people,
                    trainer_count=trainers,
                    expiring_soon_count=expiring,
                )
            )
            total += len(people)
        totals.append(SkillCoverageTotal(skill_id=skill.id, total_qualified=total))
    return Coverage(cells=cells, totals=totals)


def forecast(
    operators: list[OperatorView],
    skills: list[SkillView],
    shifts: list[ShiftView],
    records: list[SkillRecord],
    on_date: date,
    days_ahead: int,
) -> Coverage:
    return coverage_cells(operators, skills, shifts, records, on_date + timedelta(days=days_ahead))


def _status_rank(status: str) -> int:
    return {"GREEN": 0, "AMBER": 1, "RED": 2}[status]


def simulate_removal(
    operators: list[OperatorView],
    skills: list[SkillView],
    shifts: list[ShiftView],
    records: list[SkillRecord],
    operator_id: int,
    on_date: date,
    skill_id: int | None = None,
) -> dict:
    before = coverage_cells(operators, skills, shifts, records, on_date)
    if skill_id is None:
        next_ops = [
            OperatorView(op.id, op.name, op.shift_id, False) if op.id == operator_id else op
            for op in operators
        ]
        next_records = records
    else:
        next_ops = operators
        next_records = [
            record
            for record in records
            if not (record.operator_id == operator_id and record.skill_id == skill_id)
        ]
    after = coverage_cells(next_ops, skills, shifts, next_records, on_date)

    def key(cell: CoverageCell) -> tuple[int, int]:
        return (cell.skill_id, cell.shift_id)

    after_by = {key(cell): cell for cell in after.cells}
    newly_red = []
    worsened = []
    for cell in before.cells:
        nxt = after_by[key(cell)]
        if cell.status != "RED" and nxt.status == "RED":
            newly_red.append(
                {
                    "skill_id": cell.skill_id,
                    "shift_id": cell.shift_id,
                    "before_count": cell.qualified_count,
                    "after_count": nxt.qualified_count,
                    "before_status": cell.status,
                    "after_status": nxt.status,
                }
            )
        if _status_rank(nxt.status) > _status_rank(cell.status):
            worsened.append(
                {
                    "skill_id": cell.skill_id,
                    "shift_id": cell.shift_id,
                    "before_status": cell.status,
                    "after_status": nxt.status,
                    "before_count": cell.qualified_count,
                    "after_count": nxt.qualified_count,
                }
            )

    def trainer_totals(coverage: Coverage) -> dict[int, int]:
        totals: dict[int, int] = {}
        for cell in coverage.cells:
            totals[cell.skill_id] = totals.get(cell.skill_id, 0) + cell.trainer_count
        return totals

    before_trainers = trainer_totals(before)
    after_trainers = trainer_totals(after)
    lost = [
        skill_id_
        for skill_id_, count in before_trainers.items()
        if count > 0 and after_trainers.get(skill_id_, 0) == 0
    ]
    return {
        "before": before,
        "after": after,
        "newly_red": newly_red,
        "worsened": worsened,
        "lost_all_trainers": lost,
    }
