import { differenceInDays, startOfDay } from 'date-fns';
import { QUALIFIED_MIN_LEVEL, EXPIRY_WINDOW_DAYS, effectiveLevel, isQualified, daysToExpiry } from './qualification';
import { OperatorView, SkillRecord, SkillView } from './coverage';

export const LEVELS: Record<number, string> = {
  0: 'none',
  1: 'learning',
  2: 'can operate',
  3: 'proficient',
  4: 'can train'
};

export interface WorkloadStats {
  counts: Record<string, number>;
  median: number;
}

export interface Reason {
  code: string;
  message: string;
}

export interface Alternative {
  operatorId: string;
  name: string;
  shiftId: string;
  shiftName: string;
  level: number;
  certifiedUntil: string | null;
  daysToExpiry: number | null;
  workloadCount: number;
  why: string;
}

export interface VerdictResult {
  verdict: 'green' | 'red';
  blocking: Reason[];
  warnings: Reason[];
  alternatives: Alternative[];
}

function reason(code: string, message: string): Reason {
  return { code, message };
}

export function checkAssignment(
  operator: OperatorView,
  skill: SkillView,
  record: SkillRecord | null,
  assignmentDate: Date,
  shiftId: string,
  workloadStats: WorkloadStats,
  shiftsById: Record<string, string> = {},
  alternatives: Alternative[] = []
): VerdictResult {
  const blocking: Reason[] = [];
  const warnings: Reason[] = [];
  const threshold = QUALIFIED_MIN_LEVEL;
  const level = record ? record.level : 0;
  const until = record ? record.certifiedUntil : null;
  const remaining = daysToExpiry(until, assignmentDate);

  if (!operator.isActive) {
    blocking.push(reason('OPERATOR_INACTIVE', `${operator.name} is inactive and cannot be assigned.`));
  }

  if (!record) {
    blocking.push(reason('NO_SKILL_RECORD', `No skill record for ${operator.name} on ${skill.name}.`));
  } else {
    if (level < threshold) {
      const label = LEVELS[threshold] ?? 'can operate';
      blocking.push(reason('LEVEL_TOO_LOW', `Level ${level} on ${skill.name}; needs at least ${threshold} (${label}).`));
    }
    
    if (until !== null && startOfDay(until) < startOfDay(assignmentDate)) {
      const daysAgo = differenceInDays(startOfDay(assignmentDate), startOfDay(until));
      blocking.push(reason('CERT_EXPIRED', `Certification expired ${daysAgo} days ago (on ${until.toISOString().split('T')[0]}).`));
    } else if (level >= threshold && until === null) {
      warnings.push(reason('CERT_DATE_MISSING', `No certification expiry recorded for ${operator.name} on ${skill.name}.`));
    } else if (
      remaining !== null &&
      remaining >= 0 && remaining <= EXPIRY_WINDOW_DAYS &&
      effectiveLevel(level, until, assignmentDate) >= threshold
    ) {
      warnings.push(reason('CERT_EXPIRING_SOON', `Certification expires in ${remaining} days (on ${until!.toISOString().split('T')[0]}).`));
    }
  }

  if (shiftId !== operator.shiftId) {
    const opShift = shiftsById[operator.shiftId] ?? operator.shiftId;
    const asked = shiftsById[shiftId] ?? shiftId;
    warnings.push(reason('WRONG_SHIFT', `${operator.name} is on shift ${opShift}, not shift ${asked}.`));
  }

  const count = workloadStats.counts[operator.id] ?? 0;
  const limit = 1.5 * workloadStats.median;
  if (workloadStats.median > 0 && count > limit) {
    warnings.push(reason('OVERLOADED', `${operator.name} has ${count} assignments in the last 14 days, above 1.5× the median (${workloadStats.median}).`));
  }

  const verdict = blocking.length === 0 ? 'green' : 'red';
  return {
    verdict,
    blocking,
    warnings,
    alternatives
  };
}

export function rankAlternatives(
  operators: OperatorView[],
  skill: SkillView,
  records: SkillRecord[],
  assignmentDate: Date,
  shiftId: string,
  workloadStats: WorkloadStats,
  excludeOperatorId: string,
  shiftsById: Record<string, string> = {}
): Alternative[] {
  const byPair = new Map<string, SkillRecord>();
  for (const r of records) {
    byPair.set(`${r.operatorId}_${r.skillId}`, r);
  }
  
  const window = EXPIRY_WINDOW_DAYS;
  const ranked: { sortKey: [number, number, number, number, string], item: Alternative }[] = [];
  
  for (const op of operators) {
    if (op.id === excludeOperatorId) continue;
    const record = byPair.get(`${op.id}_${skill.id}`);
    const level = record ? record.level : 0;
    const until = record ? record.certifiedUntil : null;
    
    if (!isQualified(op.isActive, level, until, assignmentDate)) continue;
    
    const remaining = daysToExpiry(until, assignmentDate);
    const expiring = remaining !== null && remaining >= 0 && remaining <= window;
    const load = workloadStats.counts[op.id] ?? 0;
    const same = op.shiftId === shiftId;
    
    const shiftName = shiftsById[op.shiftId] ?? op.shiftId;
    const whyBits = [
      same ? 'same shift' : `shift ${shiftName}`,
      `${load} assignments in 14 days`,
      !expiring ? 'cert not expiring soon' : `cert expires in ${remaining} days`,
      `level ${level}`
    ];
    
    ranked.push({
      sortKey: [same ? 0 : 1, load, !expiring ? 0 : 1, -level, op.name],
      item: {
        operatorId: op.id,
        name: op.name,
        shiftId: op.shiftId,
        shiftName,
        level,
        certifiedUntil: until ? until.toISOString().split('T')[0] : null,
        daysToExpiry: remaining,
        workloadCount: load,
        why: whyBits.join(', ') + '.'
      }
    });
  }
  
  ranked.sort((a, b) => {
    for (let i = 0; i < 4; i++) {
      if (a.sortKey[i] !== b.sortKey[i]) {
        return (a.sortKey[i] as number) - (b.sortKey[i] as number);
      }
    }
    return (a.sortKey[4] as string).localeCompare(b.sortKey[4] as string);
  });
  
  return ranked.slice(0, 3).map(r => r.item);
}
