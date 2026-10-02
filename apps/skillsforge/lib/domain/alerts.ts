import {
  EXPIRY_WINDOW_DAYS,
  formatDateStr,
  parseDate,
  addDaysToStr,
  diffDays,
} from "./rules";
import { severityFor, AlertSeverity } from "./qualification";

export interface AlertDomainView {
  id?: string;
  operatorId: string;
  skillId: string;
  certifiedUntil: string | Date;
  severity: string;
  daysRemaining: number;
  status: string;
}

export interface OperatorAlertCheckView {
  id: string;
  isActive: boolean;
}

export interface RecordAlertCheckView {
  operatorId: string;
  skillId: string;
  level: number;
  certifiedUntil: string | Date | null | undefined;
}

export interface DesiredAlert {
  operatorId: string;
  skillId: string;
  certifiedUntil: string;
  severity: AlertSeverity;
  daysRemaining: number;
}

export interface AlertResolution {
  operatorId: string;
  skillId: string;
  certifiedUntil: string;
  resolvedReason: "renewed" | "level_lowered" | "record_removed" | "operator_inactive";
}

export function reconcileAlerts(
  existingAlerts: AlertDomainView[],
  records: RecordAlertCheckView[],
  operators: OperatorAlertCheckView[],
  asOf: string
) {
  const asOfDateStr = formatDateStr(parseDate(asOf))!;
  const windowEndStr = addDaysToStr(asOfDateStr, EXPIRY_WINDOW_DAYS);

  const activeOpMap = new Map<string, boolean>();
  for (const op of operators) {
    activeOpMap.set(op.id, op.isActive);
  }

  const recordMap = new Map<string, RecordAlertCheckView>();
  const desiredMap = new Map<string, DesiredAlert>();

  for (const r of records) {
    recordMap.set(`${r.operatorId}_${r.skillId}`, r);
    const opActive = activeOpMap.get(r.operatorId) ?? false;
    if (!opActive || r.level < 1 || !r.certifiedUntil) continue;

    const certDateStr = formatDateStr(parseDate(r.certifiedUntil));
    if (!certDateStr) continue;

    // Check if within window (including already overdue: certDateStr <= windowEndStr)
    if (certDateStr <= windowEndStr) {
      const remaining = diffDays(certDateStr, asOfDateStr);
      const severity = severityFor(remaining);
      const key = `${r.operatorId}_${r.skillId}_${certDateStr}`;
      desiredMap.set(key, {
        operatorId: r.operatorId,
        skillId: r.skillId,
        certifiedUntil: certDateStr,
        severity,
        daysRemaining: remaining,
      });
    }
  }

  const toCreate: DesiredAlert[] = [];
  const toUpdate: DesiredAlert[] = [];
  const toResolve: AlertResolution[] = [];

  const existingMap = new Map<string, AlertDomainView>();
  for (const alert of existingAlerts) {
    const certStr = formatDateStr(parseDate(alert.certifiedUntil))!;
    const key = `${alert.operatorId}_${alert.skillId}_${certStr}`;
    existingMap.set(key, alert);
  }

  for (const [key, desired] of desiredMap.entries()) {
    const existing = existingMap.get(key);
    if (!existing || existing.status === "resolved") {
      toCreate.push(desired);
    } else {
      toUpdate.push(desired);
    }
  }

  for (const alert of existingAlerts) {
    if (alert.status !== "open") continue;
    const certStr = formatDateStr(parseDate(alert.certifiedUntil))!;
    const key = `${alert.operatorId}_${alert.skillId}_${certStr}`;

    if (!desiredMap.has(key)) {
      let reason: AlertResolution["resolvedReason"] = "renewed";
      const opActive = activeOpMap.get(alert.operatorId) ?? false;
      const rec = recordMap.get(`${alert.operatorId}_${alert.skillId}`);

      if (!opActive) {
        reason = "operator_inactive";
      } else if (!rec) {
        reason = "record_removed";
      } else if (rec.level <= 0) {
        reason = "level_lowered";
      } else {
        reason = "renewed";
      }

      toResolve.push({
        operatorId: alert.operatorId,
        skillId: alert.skillId,
        certifiedUntil: certStr,
        resolvedReason: reason,
      });
    }
  }

  return { toCreate, toUpdate, toResolve };
}
