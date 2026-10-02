import {
  QUALIFIED_MIN_LEVEL,
  EXPIRY_WINDOW_DAYS,
  LEVELS,
  formatDateStr,
  parseDate,
  diffDays,
} from "./rules";
import { effectiveLevel, isQualified, daysToExpiry } from "./qualification";
import { OperatorDomainView, SkillDomainView, SkillRecordDomain } from "./coverage";

export interface ReasonItem {
  code: string;
  message: string;
  params?: Record<string, string | number>;
}

export interface AlternativeItem {
  operatorId: string;
  name: string;
  shiftId: string;
  shiftCode: string;
  level: number;
  certifiedUntil: string | null;
  daysToExpiry: number | null;
  workloadCount: number;
  why: string;
}

export interface VerdictPayload {
  verdict: "green" | "red";
  blocking: ReasonItem[];
  warnings: ReasonItem[];
  alternatives: AlternativeItem[];
  operator: { id: string; name: string; shiftId: string };
  skill: { id: string; name: string; code: string };
}

export interface WorkloadMap {
  counts: Record<string, number>;
  median: number;
}

export function checkAssignment(
  operator: OperatorDomainView,
  skill: SkillDomainView,
  record: SkillRecordDomain | null | undefined,
  assignmentDate: string,
  targetShiftId: string,
  workload: WorkloadMap = { counts: {}, median: 0 },
  shiftsByCode: Record<string, string> = {},
  alternatives: AlternativeItem[] = []
): VerdictPayload {
  const blocking: ReasonItem[] = [];
  const warnings: ReasonItem[] = [];
  const assignDateStr = formatDateStr(parseDate(assignmentDate))!;

  if (!operator.isActive) {
    blocking.push({
      code: "OPERATOR_INACTIVE",
      message: `${operator.name} is inactive and cannot be assigned.`,
      params: { name: operator.name },
    });
  }

  if (!record) {
    blocking.push({
      code: "NO_SKILL_RECORD",
      message: `No skill record for ${operator.name} on ${skill.name}.`,
      params: { name: operator.name, skill: skill.name },
    });
  } else {
    if (record.level < QUALIFIED_MIN_LEVEL) {
      blocking.push({
        code: "LEVEL_TOO_LOW",
        message: `Level ${record.level} on ${skill.name}; needs at least ${QUALIFIED_MIN_LEVEL} (${LEVELS[QUALIFIED_MIN_LEVEL]}).`,
        params: {
          level: record.level,
          required: QUALIFIED_MIN_LEVEL,
          skill: skill.name,
        },
      });
    }

    const untilStr = record.certifiedUntil ? formatDateStr(parseDate(record.certifiedUntil)) : null;

    if (untilStr && untilStr < assignDateStr) {
      const daysAgo = diffDays(assignDateStr, untilStr);
      blocking.push({
        code: "CERT_EXPIRED",
        message: `Certification expired ${daysAgo} days ago (on ${untilStr}).`,
        params: { days: daysAgo, date: untilStr },
      });
    } else if (record.level >= QUALIFIED_MIN_LEVEL && !untilStr) {
      warnings.push({
        code: "CERT_DATE_MISSING",
        message: `No certification expiry recorded for ${operator.name} on ${skill.name}.`,
        params: { name: operator.name, skill: skill.name },
      });
    } else if (untilStr && record.level >= QUALIFIED_MIN_LEVEL) {
      const remaining = daysToExpiry(untilStr, assignDateStr);
      if (remaining !== null && remaining >= 0 && remaining <= EXPIRY_WINDOW_DAYS) {
        warnings.push({
          code: "CERT_EXPIRING_SOON",
          message: `Certification expires in ${remaining} days (on ${untilStr}).`,
          params: { days: remaining, date: untilStr },
        });
      }
    }
  }

  if (targetShiftId && operator.shiftId !== targetShiftId) {
    const opShiftName = shiftsByCode[operator.shiftId] || operator.shiftId;
    const tgtShiftName = shiftsByCode[targetShiftId] || targetShiftId;
    warnings.push({
      code: "WRONG_SHIFT",
      message: `${operator.name} is on shift ${opShiftName}, not shift ${tgtShiftName}.`,
      params: { name: operator.name, operatorShift: opShiftName, assignmentShift: tgtShiftName },
    });
  }

  const opLoad = workload.counts[operator.id] ?? 0;
  if (workload.median > 0 && opLoad > 1.5 * workload.median && opLoad >= 3) {
    warnings.push({
      code: "OVERLOADED",
      message: `${operator.name} has ${opLoad} assignments in the last 14 days, above 1.5× the median (${workload.median}).`,
      params: { name: operator.name, count: opLoad, median: workload.median },
    });
  }

  const verdict: "green" | "red" = blocking.length === 0 ? "green" : "red";

  return {
    verdict,
    blocking,
    warnings,
    alternatives,
    operator: { id: operator.id, name: operator.name, shiftId: operator.shiftId },
    skill: { id: skill.id, name: skill.name, code: skill.code },
  };
}

/**
 * Rank top 3 alternatives when assignment fails or alternative is sought.
 */
export function rankAlternatives(
  operators: OperatorDomainView[],
  skill: SkillDomainView,
  records: SkillRecordDomain[],
  assignmentDate: string,
  targetShiftId: string,
  workload: WorkloadMap,
  excludeOperatorId: string,
  shiftCodes: Record<string, string> = {}
): AlternativeItem[] {
  const assignDateStr = formatDateStr(parseDate(assignmentDate))!;
  const recordMap = new Map<string, SkillRecordDomain>();
  for (const r of records) {
    recordMap.set(`${r.operatorId}_${r.skillId}`, r);
  }

  interface Candidate {
    operator: OperatorDomainView;
    level: number;
    certifiedUntil: string | null;
    daysRemaining: number | null;
    load: number;
    sameShift: boolean;
  }

  const candidates: Candidate[] = [];

  for (const op of operators) {
    if (op.id === excludeOperatorId || !op.isActive) continue;
    const rec = recordMap.get(`${op.id}_${skill.id}`);
    if (!rec) continue;

    const until = rec.certifiedUntil ? formatDateStr(parseDate(rec.certifiedUntil)) : null;
    if (!isQualified(op.isActive, rec.level, until, assignDateStr)) continue;

    const days = daysToExpiry(until, assignDateStr);
    const load = workload.counts[op.id] ?? 0;
    const sameShift = op.shiftId === targetShiftId;

    candidates.push({
      operator: op,
      level: rec.level,
      certifiedUntil: until,
      daysRemaining: days,
      load,
      sameShift,
    });
  }

  // Sorting rules:
  // 1. Same shift first (sameShift true > false)
  // 2. Lowest trailing-14-day assignments
  // 3. No cert expiring within 30 days (expiring soon > 30 days or null)
  // 4. Higher level (descending)
  // 5. Name alphabetically
  candidates.sort((a, b) => {
    if (a.sameShift !== b.sameShift) return a.sameShift ? -1 : 1;
    if (a.load !== b.load) return a.load - b.load;

    const aExpiringSoon = a.daysRemaining !== null && a.daysRemaining <= EXPIRY_WINDOW_DAYS ? 1 : 0;
    const bExpiringSoon = b.daysRemaining !== null && b.daysRemaining <= EXPIRY_WINDOW_DAYS ? 1 : 0;
    if (aExpiringSoon !== bExpiringSoon) return aExpiringSoon - bExpiringSoon;

    if (a.level !== b.level) return b.level - a.level;
    return a.operator.name.localeCompare(b.operator.name);
  });

  return candidates.slice(0, 3).map((c) => {
    const shiftCode = shiftCodes[c.operator.shiftId] || c.operator.shiftId;
    const whyParts: string[] = [
      c.sameShift ? "same shift" : `shift ${shiftCode}`,
      `${c.load} assignments in 14 days`,
      c.daysRemaining !== null && c.daysRemaining <= EXPIRY_WINDOW_DAYS
        ? `cert expires in ${c.daysRemaining} days`
        : "valid certification",
      `level ${c.level}`,
    ];

    return {
      operatorId: c.operator.id,
      name: c.operator.name,
      shiftId: c.operator.shiftId,
      shiftCode,
      level: c.level,
      certifiedUntil: c.certifiedUntil,
      daysToExpiry: c.daysRemaining,
      workloadCount: c.load,
      why: whyParts.join(", ") + ".",
    };
  });
}
