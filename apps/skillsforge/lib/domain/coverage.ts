import {
  MIN_COVERAGE,
  EXPIRY_WINDOW_DAYS,
  formatDateStr,
  parseDate,
  addDaysToStr,
  diffDays,
} from "./rules";
import { isQualified, daysToExpiry } from "./qualification";

export interface OperatorDomainView {
  id: string;
  name: string;
  shiftId: string;
  isActive: boolean;
}

export interface SkillDomainView {
  id: string;
  code: string;
  name: string;
  nameHi?: string | null;
  lineKey: string;
  criticality: number;
  isActive: boolean;
}

export interface ShiftDomainView {
  id: string;
  code: string;
  startTime: string;
  endTime: string;
}

export interface SkillRecordDomain {
  operatorId: string;
  skillId: string;
  level: number;
  issuedOn?: string | Date | null;
  certifiedUntil?: string | Date | null;
}

export interface QualifiedOperatorView {
  id: string;
  name: string;
  level: number;
  certifiedUntil: string | null;
  daysToExpiry: number | null;
}

export interface CoverageCellView {
  skillId: string;
  shiftId: string;
  qualifiedCount: number;
  status: "RED" | "AMBER" | "GREEN";
  trainerCount: number;
  expiringSoonCount: number;
  turnsRedOn: string | null;
  operators: QualifiedOperatorView[];
}

export interface SkillCoverageTotalView {
  skillId: string;
  totalQualified: number;
  trainerCount: number;
  expiringSoonCount: number;
  isSpof: boolean;
}

export interface CoveragePayload {
  asOf: string;
  shifts: ShiftDomainView[];
  skills: SkillDomainView[];
  cells: CoverageCellView[];
  totals: SkillCoverageTotalView[];
}

export function cellStatus(count: number, minimum: number = MIN_COVERAGE): "RED" | "AMBER" | "GREEN" {
  if (count < minimum) return "RED";
  if (count === minimum) return "AMBER";
  return "GREEN";
}

/**
 * Finds the earliest future date (within maxDays) where a currently non-red cell turns red.
 */
export function findTurnsRedOn(
  operators: OperatorDomainView[],
  skillId: string,
  shiftId: string,
  records: SkillRecordDomain[],
  asOf: string,
  maxDays: number = 90
): string | null {
  const asOfDateStr = formatDateStr(parseDate(asOf))!;
  
  // Find all qualified operators on this shift for this skill
  const shiftOps = operators.filter((op) => op.shiftId === shiftId && op.isActive);
  const relevantRecords = records.filter(
    (r) => r.skillId === skillId && shiftOps.some((op) => op.id === r.operatorId)
  );

  // If already RED, it didn't "turn red in the future"
  let currentCount = 0;
  for (const op of shiftOps) {
    const rec = relevantRecords.find((r) => r.operatorId === op.id);
    if (rec && isQualified(op.isActive, rec.level, rec.certifiedUntil, asOfDateStr)) {
      currentCount++;
    }
  }

  if (currentCount < MIN_COVERAGE) {
    return null;
  }

  // Check future dates where a certificate expires
  const expiryDates = relevantRecords
    .map((r) => formatDateStr(parseDate(r.certifiedUntil)))
    .filter((d): d is string => d !== null && d > asOfDateStr && diffDays(d, asOfDateStr) <= maxDays)
    .sort();

  for (const expDate of expiryDates) {
    let futureCount = 0;
    for (const op of shiftOps) {
      const rec = relevantRecords.find((r) => r.operatorId === op.id);
      if (rec && isQualified(op.isActive, rec.level, rec.certifiedUntil, expDate)) {
        futureCount++;
      }
    }
    if (futureCount < MIN_COVERAGE) {
      return expDate;
    }
  }

  return null;
}

/**
 * Builds the complete coverage heatmap pivot.
 */
export function buildCoverage(
  operators: OperatorDomainView[],
  skills: SkillDomainView[],
  shifts: ShiftDomainView[],
  records: SkillRecordDomain[],
  asOf: string
): CoveragePayload {
  const asOfDateStr = formatDateStr(parseDate(asOf))!;
  const recordMap = new Map<string, SkillRecordDomain>();
  for (const r of records) {
    recordMap.set(`${r.operatorId}_${r.skillId}`, r);
  }

  const activeSkills = skills.filter((s) => s.isActive);
  const cells: CoverageCellView[] = [];
  const totals: SkillCoverageTotalView[] = [];

  for (const skill of activeSkills) {
    let totalQualified = 0;

    for (const shift of shifts) {
      const qualifiedPeople: QualifiedOperatorView[] = [];

      for (const op of operators) {
        if (op.shiftId !== shift.id) continue;
        const rec = recordMap.get(`${op.id}_${skill.id}`);
        const level = rec ? rec.level : 0;
        const until = rec?.certifiedUntil ? formatDateStr(parseDate(rec.certifiedUntil)) : null;

        if (isQualified(op.isActive, level, until, asOfDateStr)) {
          const daysLeft = daysToExpiry(until, asOfDateStr);
          qualifiedPeople.push({
            id: op.id,
            name: op.name,
            level,
            certifiedUntil: until,
            daysToExpiry: daysLeft,
          });
        }
      }

      // Sort by level desc, then name
      qualifiedPeople.sort((a, b) => {
        if (a.level !== b.level) return b.level - a.level;
        return a.name.localeCompare(b.name);
      });

      const trainerCount = qualifiedPeople.filter((p) => p.level >= 4).length;
      const expiringSoonCount = qualifiedPeople.filter(
        (p) => p.daysToExpiry !== null && p.daysToExpiry >= 0 && p.daysToExpiry <= EXPIRY_WINDOW_DAYS
      ).length;

      const turnsRedOn = findTurnsRedOn(operators, skill.id, shift.id, records, asOfDateStr, 90);

      cells.push({
        skillId: skill.id,
        shiftId: shift.id,
        qualifiedCount: qualifiedPeople.length,
        status: cellStatus(qualifiedPeople.length),
        trainerCount,
        expiringSoonCount,
        turnsRedOn,
        operators: qualifiedPeople,
      });

      totalQualified += qualifiedPeople.length;
    }

    const skillCells = cells.filter((c) => c.skillId === skill.id);
    const trainerCount = skillCells.reduce((sum, c) => sum + c.trainerCount, 0);
    const expiringSoonCount = skillCells.reduce((sum, c) => sum + c.expiringSoonCount, 0);

    totals.push({
      skillId: skill.id,
      totalQualified,
      trainerCount,
      expiringSoonCount,
      isSpof: totalQualified < MIN_COVERAGE,
    });
  }

  return {
    asOf: asOfDateStr,
    shifts,
    skills: activeSkills,
    cells,
    totals,
  };
}

/**
 * Forecasts coverage at asOf + daysAhead.
 */
export function forecastCoverage(
  operators: OperatorDomainView[],
  skills: SkillDomainView[],
  shifts: ShiftDomainView[],
  records: SkillRecordDomain[],
  asOf: string,
  daysAhead: number
): CoveragePayload {
  const futureDate = addDaysToStr(asOf, daysAhead);
  return buildCoverage(operators, skills, shifts, records, futureDate);
}

const STATUS_RANK: Record<string, number> = { GREEN: 0, AMBER: 1, RED: 2 };

/**
 * Simulates operator departure or skill removal (MVP-1).
 */
export function simulateRemoval(
  operators: OperatorDomainView[],
  skills: SkillDomainView[],
  shifts: ShiftDomainView[],
  records: SkillRecordDomain[],
  operatorId: string,
  asOf: string,
  skillId: string | null = null
) {
  const asOfDateStr = formatDateStr(parseDate(asOf))!;
  const before = buildCoverage(operators, skills, shifts, records, asOfDateStr);

  let nextOps = operators;
  let nextRecords = records;

  if (skillId === null) {
    nextOps = operators.map((op) => (op.id === operatorId ? { ...op, isActive: false } : op));
  } else {
    nextRecords = records.filter((r) => !(r.operatorId === operatorId && r.skillId === skillId));
  }

  const after = buildCoverage(nextOps, skills, shifts, nextRecords, asOfDateStr);

  const afterBy = new Map<string, CoverageCellView>();
  for (const cell of after.cells) {
    afterBy.set(`${cell.skillId}_${cell.shiftId}`, cell);
  }

  const newlyRed: {
    skillId: string;
    shiftId: string;
    beforeCount: number;
    afterCount: number;
  }[] = [];

  const worsened: {
    skillId: string;
    shiftId: string;
    beforeStatus: string;
    afterStatus: string;
    beforeCount: number;
    afterCount: number;
  }[] = [];

  for (const cell of before.cells) {
    const nxt = afterBy.get(`${cell.skillId}_${cell.shiftId}`);
    if (!nxt) continue;

    if (cell.status !== "RED" && nxt.status === "RED") {
      newlyRed.push({
        skillId: cell.skillId,
        shiftId: cell.shiftId,
        beforeCount: cell.qualifiedCount,
        afterCount: nxt.qualifiedCount,
      });
    }

    if (STATUS_RANK[nxt.status] > STATUS_RANK[cell.status]) {
      worsened.push({
        skillId: cell.skillId,
        shiftId: cell.shiftId,
        beforeStatus: cell.status,
        afterStatus: nxt.status,
        beforeCount: cell.qualifiedCount,
        afterCount: nxt.qualifiedCount,
      });
    }
  }

  const getTrainerTotals = (cov: CoveragePayload) => {
    const map = new Map<string, number>();
    for (const cell of cov.cells) {
      map.set(cell.skillId, (map.get(cell.skillId) || 0) + cell.trainerCount);
    }
    return map;
  };

  const beforeTrainers = getTrainerTotals(before);
  const afterTrainers = getTrainerTotals(after);
  const lostAllTrainers: string[] = [];

  for (const [sId, count] of beforeTrainers.entries()) {
    if (count > 0 && (afterTrainers.get(sId) || 0) === 0) {
      lostAllTrainers.push(sId);
    }
  }

  return {
    before,
    after,
    newlyRed,
    worsened,
    lostAllTrainers,
  };
}
