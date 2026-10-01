"""Alert severity and the expiry-job reconcile plan. Pure."""

from dataclasses import dataclass
from datetime import date, timedelta

from app.core.rules import expiry_window_days


def severity_for(days_remaining: int) -> str:
    if days_remaining < 0:
        return "expired"
    if days_remaining <= 7:
        return "critical"
    if days_remaining <= 14:
        return "warning"
    return "notice"


@dataclass
class AlertView:
    operator_id: int
    skill_id: int
    certified_until: date
    severity: str
    days_remaining: int
    status: str


@dataclass
class RecordView:
    operator_id: int
    skill_id: int
    level: int
    certified_until: date | None


@dataclass
class PlannedAlert:
    operator_id: int
    skill_id: int
    certified_until: date
    severity: str
    days_remaining: int


@dataclass
class PlannedResolve:
    operator_id: int
    skill_id: int
    certified_until: date
    resolved_reason: str


def reconcile(
    existing_alerts: list[AlertView],
    records: list[RecordView],
    operators_active: dict[int, bool],
    as_of: date,
) -> dict:
    """Return alerts to create, update, and resolve.

    An open alert resolves when the certificate moves out of the window,
    the level becomes 0, the record is gone, or the operator is inactive.
    """
    window_end = as_of + timedelta(days=expiry_window_days())
    desired: dict[tuple[int, int, date], int] = {}
    records_by_pair: dict[tuple[int, int], RecordView] = {}
    for record in records:
        records_by_pair[(record.operator_id, record.skill_id)] = record
        if not operators_active.get(record.operator_id, False):
            continue
        if record.level < 1 or record.certified_until is None:
            continue
        if record.certified_until <= window_end:
            key = (record.operator_id, record.skill_id, record.certified_until)
            desired[key] = (record.certified_until - as_of).days

    existing_by_key = {
        (alert.operator_id, alert.skill_id, alert.certified_until): alert for alert in existing_alerts
    }
    to_create: list[PlannedAlert] = []
    to_update: list[PlannedAlert] = []
    to_resolve: list[PlannedResolve] = []

    for key, days in desired.items():
        severity = severity_for(days)
        planned = PlannedAlert(key[0], key[1], key[2], severity, days)
        current = existing_by_key.get(key)
        if current is None or current.status != "open":
            to_create.append(planned)
        else:
            to_update.append(planned)

    for alert in existing_alerts:
        if alert.status != "open":
            continue
        key = (alert.operator_id, alert.skill_id, alert.certified_until)
        if key in desired:
            continue
        to_resolve.append(
            PlannedResolve(
                alert.operator_id,
                alert.skill_id,
                alert.certified_until,
                _reason(alert, records_by_pair, operators_active, as_of, window_end),
            )
        )
    return {"create": to_create, "update": to_update, "resolve": to_resolve}


def _reason(
    alert: AlertView,
    records_by_pair: dict[tuple[int, int], RecordView],
    operators_active: dict[int, bool],
    as_of: date,
    window_end: date,
) -> str:
    if not operators_active.get(alert.operator_id, False):
        return "operator_inactive"
    record = records_by_pair.get((alert.operator_id, alert.skill_id))
    if record is None:
        return "record_removed"
    if record.level <= 0:
        return "level_lowered"
    if record.certified_until is None or record.certified_until > window_end or record.certified_until != alert.certified_until:
        return "renewed"
    return "renewed"
