import { addDays, differenceInDays, startOfDay } from 'date-fns';
import { EXPIRY_WINDOW_DAYS } from './qualification';

export function severityFor(daysRemaining: number): 'expired' | 'critical' | 'warning' | 'notice' {
  if (daysRemaining < 0) return 'expired';
  if (daysRemaining <= 7) return 'critical';
  if (daysRemaining <= 14) return 'warning';
  return 'notice';
}

export interface AlertView {
  operatorId: string;
  skillId: string;
  certifiedUntil: Date;
  severity: string;
  daysRemaining: number;
  status: string;
}

export interface RecordView {
  operatorId: string;
  skillId: string;
  level: number;
  certifiedUntil: Date | null;
}

export interface PlannedAlert {
  operatorId: string;
  skillId: string;
  certifiedUntil: Date;
  severity: string;
  daysRemaining: number;
}

export interface PlannedResolve {
  operatorId: string;
  skillId: string;
  certifiedUntil: Date;
  resolvedReason: string;
}

export function reconcile(
  existingAlerts: AlertView[],
  records: RecordView[],
  operatorsActive: Record<string, boolean>,
  asOf: Date
) {
  const windowEnd = startOfDay(addDays(asOf, EXPIRY_WINDOW_DAYS));
  const asOfDay = startOfDay(asOf);
  
  const desired = new Map<string, number>();
  const recordsByPair = new Map<string, RecordView>();
  
  for (const record of records) {
    recordsByPair.set(`${record.operatorId}_${record.skillId}`, record);
    if (!operatorsActive[record.operatorId]) continue;
    if (record.level < 1 || !record.certifiedUntil) continue;
    
    const certDay = startOfDay(record.certifiedUntil);
    if (certDay <= windowEnd) {
      const key = `${record.operatorId}_${record.skillId}_${certDay.toISOString()}`;
      desired.set(key, differenceInDays(certDay, asOfDay));
    }
  }

  const existingByKey = new Map<string, AlertView>();
  for (const alert of existingAlerts) {
    const certDay = startOfDay(alert.certifiedUntil);
    existingByKey.set(`${alert.operatorId}_${alert.skillId}_${certDay.toISOString()}`, alert);
  }

  const toCreate: PlannedAlert[] = [];
  const toUpdate: PlannedAlert[] = [];
  const toResolve: PlannedResolve[] = [];

  for (const [keyStr, days] of desired.entries()) {
    const [opId, skillId, dateStr] = keyStr.split('_');
    const certifiedUntil = new Date(dateStr);
    const severity = severityFor(days);
    const planned: PlannedAlert = { operatorId: opId, skillId, certifiedUntil, severity, daysRemaining: days };
    
    const current = existingByKey.get(keyStr);
    if (!current || current.status !== 'open') {
      toCreate.push(planned);
    } else {
      toUpdate.push(planned);
    }
  }

  for (const alert of existingAlerts) {
    if (alert.status !== 'open') continue;
    const certDay = startOfDay(alert.certifiedUntil);
    const keyStr = `${alert.operatorId}_${alert.skillId}_${certDay.toISOString()}`;
    if (desired.has(keyStr)) continue;
    
    toResolve.push({
      operatorId: alert.operatorId,
      skillId: alert.skillId,
      certifiedUntil: alert.certifiedUntil,
      resolvedReason: getReason(alert, recordsByPair, operatorsActive, asOf, windowEnd)
    });
  }

  return { create: toCreate, update: toUpdate, resolve: toResolve };
}

function getReason(
  alert: AlertView,
  recordsByPair: Map<string, RecordView>,
  operatorsActive: Record<string, boolean>,
  asOf: Date,
  windowEnd: Date
): string {
  if (!operatorsActive[alert.operatorId]) return 'operator_inactive';
  
  const record = recordsByPair.get(`${alert.operatorId}_${alert.skillId}`);
  if (!record) return 'record_removed';
  if (record.level <= 0) return 'level_lowered';
  
  if (
    !record.certifiedUntil ||
    startOfDay(record.certifiedUntil) > startOfDay(windowEnd) ||
    startOfDay(record.certifiedUntil).getTime() !== startOfDay(alert.certifiedUntil).getTime()
  ) {
    return 'renewed';
  }
  
  return 'renewed';
}
