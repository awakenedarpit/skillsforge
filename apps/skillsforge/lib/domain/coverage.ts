import {
  MIN_COVERAGE,
  EXPIRY_WINDOW_DAYS,
  QUALIFIED_MIN_LEVEL,
  formatDateStr,
  parseDate,
  addDaysToStr,
  diffDays,
} from "./rules";
import { isQualified, daysToExpiry, effectiveLevel } from "./qualification";

export interface OperatorDomainView {
  id: string;
  name: string;
  shiftId: string;
  isActive: boolean;
  employeeCode?: string;
  shift?: { code: string };
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

export interface CoverageDropItem {
  skillId: string;
  skillCode: string;
  skillName: string;
  skillNameHi?: string | null;
  shiftId: string;
  shiftCode: string;
  currentCount: number;
  projectedCount: number;
  currentStatus: "RED" | "AMBER" | "GREEN";
  projectedStatus: "RED" | "AMBER" | "GREEN";
  expiringOperators: Array<{
    id: string;
    name: string;
    level: number;
    certifiedUntil: string | null;
  }>;
}

export interface ShiftCoverageForecastResult {
  asOf: string;
  horizonDays: number;
  projectedDate: string;
  currentCoverage: CoveragePayload;
  projectedCoverage: CoveragePayload;
  dropsBelowMinimum: CoverageDropItem[];
  worsenedCells: CoverageDropItem[];
  summary: {
    totalDropsBelowMinimum: number;
    totalWorsened: number;
    skillsAffected: number;
    shiftsAffected: number;
  };
}

/**
 * Projects coverage changes over a selectable horizon (e.g. 30, 60, 90 days)
 * based on upcoming certification expiries, reusing buildCoverage and forecastCoverage.
 */
export function projectCoverageForecast(
  operators: OperatorDomainView[],
  skills: SkillDomainView[],
  shifts: ShiftDomainView[],
  records: SkillRecordDomain[],
  asOf: string,
  horizonDays: number
): ShiftCoverageForecastResult {
  const asOfDateStr = formatDateStr(parseDate(asOf))!;
  const projectedDate = addDaysToStr(asOfDateStr, horizonDays);
  const currentCoverage = buildCoverage(operators, skills, shifts, records, asOfDateStr);
  const projectedCoverage = buildCoverage(operators, skills, shifts, records, projectedDate);

  const skillsMap = new Map(skills.map((s: SkillDomainView) => [s.id, s]));
  const shiftsMap = new Map(shifts.map((s: ShiftDomainView) => [s.id, s]));
  const projectedCellsMap = new Map(
    projectedCoverage.cells.map((c) => [`${c.skillId}_${c.shiftId}`, c])
  );

  const dropsBelowMinimum: CoverageDropItem[] = [];
  const worsenedCells: CoverageDropItem[] = [];

  for (const currentCell of currentCoverage.cells) {
    const projectedCell = projectedCellsMap.get(`${currentCell.skillId}_${currentCell.shiftId}`);
    if (!projectedCell) continue;

    const skill = skillsMap.get(currentCell.skillId);
    const shift = shiftsMap.get(currentCell.shiftId);
    const skillCode = skill?.code || currentCell.skillId;
    const skillName = skill?.name || currentCell.skillId;
    const skillNameHi = skill?.nameHi || null;
    const shiftCode = shift?.code || currentCell.shiftId;

    const currentOpIds = new Set(currentCell.operators.map((o) => o.id));
    const projectedOpIds = new Set(projectedCell.operators.map((o) => o.id));
    const expiringOps = currentCell.operators
      .filter((o) => currentOpIds.has(o.id) && !projectedOpIds.has(o.id))
      .map((o) => ({
        id: o.id,
        name: o.name,
        level: o.level,
        certifiedUntil: o.certifiedUntil,
      }));

    const isDrop = currentCell.status !== "RED" && projectedCell.status === "RED";
    const isWorsened =
      STATUS_RANK[projectedCell.status] > STATUS_RANK[currentCell.status] ||
      projectedCell.qualifiedCount < currentCell.qualifiedCount;

    const dropItem: CoverageDropItem = {
      skillId: currentCell.skillId,
      skillCode,
      skillName,
      skillNameHi,
      shiftId: currentCell.shiftId,
      shiftCode,
      currentCount: currentCell.qualifiedCount,
      projectedCount: projectedCell.qualifiedCount,
      currentStatus: currentCell.status,
      projectedStatus: projectedCell.status,
      expiringOperators: expiringOps,
    };

    if (isDrop) {
      dropsBelowMinimum.push(dropItem);
    }
    if (isWorsened) {
      worsenedCells.push(dropItem);
    }
  }

  const skillsAffected = new Set(dropsBelowMinimum.map((d) => d.skillId)).size;
  const shiftsAffected = new Set(dropsBelowMinimum.map((d) => d.shiftId)).size;

  return {
    asOf: asOfDateStr,
    horizonDays,
    projectedDate,
    currentCoverage,
    projectedCoverage,
    dropsBelowMinimum,
    worsenedCells,
    summary: {
      totalDropsBelowMinimum: dropsBelowMinimum.length,
      totalWorsened: worsenedCells.length,
      skillsAffected,
      shiftsAffected,
    },
  };
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

export interface ReplacementAlternative {
  operatorId: string;
  name: string;
  employeeCode: string;
  shiftId: string;
  shiftCode: string;
  isSameShift: boolean;
  level: number;
  effectiveLevel: number;
  levelLabel: string;
  certifiedUntil: string | null;
  daysToExpiry: number | null;
  certStatus: "valid" | "expiring_soon" | "expired";
  recommendationTag: string;
}

export interface SkillReplacementAnalysis {
  skillId: string;
  skillCode: string;
  skillName: string;
  skillNameHi?: string | null;
  lineKey: string;
  criticality: number;
  resigningOperatorLevel: number;
  resigningOperatorLevelLabel: string;
  sameShiftCount: number;
  totalQualifiedCount: number;
  status: "COVERED" | "CROSS_SHIFT_ONLY" | "CRITICAL_UNCOVERED";
  alternatives: ReplacementAlternative[];
  trainingCandidates: ReplacementAlternative[];
}

export interface ReplacementSummary {
  affectedSkillsCount: number;
  coveredSameShiftCount: number;
  crossShiftOnlyCount: number;
  criticalUncoveredCount: number;
  totalAlternativesAvailable: number;
}

export interface ResignationReplacementsResult {
  summary: ReplacementSummary;
  replacements: SkillReplacementAnalysis[];
}

/**
 * Identifies alternative operators who can take over each machine/skill
 * currently operated by a departing or resigning operator.
 */
export function computeResignationReplacements(
  operators: OperatorDomainView[],
  skills: SkillDomainView[],
  shifts: ShiftDomainView[],
  records: SkillRecordDomain[],
  targetOperatorId: string,
  asOf: string,
  targetSkillId: string | null = null
): ResignationReplacementsResult {
  const asOfDateStr = formatDateStr(parseDate(asOf))!;
  const targetOp = operators.find((op) => op.id === targetOperatorId);
  if (!targetOp) {
    return {
      summary: {
        affectedSkillsCount: 0,
        coveredSameShiftCount: 0,
        crossShiftOnlyCount: 0,
        criticalUncoveredCount: 0,
        totalAlternativesAvailable: 0,
      },
      replacements: [],
    };
  }

  const shiftsMap = new Map(shifts.map((s) => [s.id, s]));
  const skillsMap = new Map(skills.map((s) => [s.id, s]));
  const recordMap = new Map<string, SkillRecordDomain>();
  for (const r of records) {
    recordMap.set(`${r.operatorId}_${r.skillId}`, r);
  }

  // Find all skills that targetOp is qualified for (or targeted skillId)
  let relevantSkillIds: string[] = [];
  if (targetSkillId) {
    relevantSkillIds = [targetSkillId];
  } else {
    const opRecords = records.filter((r) => r.operatorId === targetOperatorId);
    const qualifiedSkillIds = opRecords
      .filter((r) => r.level >= QUALIFIED_MIN_LEVEL)
      .map((r) => r.skillId);

    if (qualifiedSkillIds.length > 0) {
      relevantSkillIds = qualifiedSkillIds;
    } else {
      relevantSkillIds = opRecords.map((r) => r.skillId);
    }
  }

  // Deduplicate skill IDs
  relevantSkillIds = Array.from(new Set(relevantSkillIds));

  const otherOps = operators.filter((o) => o.id !== targetOperatorId && o.isActive);
  const replacements: SkillReplacementAnalysis[] = [];

  for (const sId of relevantSkillIds) {
    const skill = skillsMap.get(sId);
    if (!skill) continue;

    const targetRec = recordMap.get(`${targetOperatorId}_${sId}`);
    const targetLevel = targetRec ? targetRec.level : 0;
    const targetLevelLabel =
      targetLevel >= 4
        ? "Level 4 (Trainer)"
        : targetLevel === 3
        ? "Level 3 (Autonomous)"
        : targetLevel === 2
        ? "Level 2 (Supervised)"
        : `Level ${targetLevel}`;

    const qualifiedAlts: ReplacementAlternative[] = [];
    const trainingCands: ReplacementAlternative[] = [];

    for (const op of otherOps) {
      const rec = recordMap.get(`${op.id}_${sId}`);
      if (!rec || rec.level < 1) continue;

      const until = rec.certifiedUntil ? formatDateStr(parseDate(rec.certifiedUntil)) : null;
      const daysLeft = daysToExpiry(until, asOfDateStr);
      const isQualifiedNow = isQualified(op.isActive, rec.level, until, asOfDateStr);
      const effLevel = effectiveLevel(rec.level, until, asOfDateStr);
      const isSameShift = op.shiftId === targetOp.shiftId;
      const shiftObj = shiftsMap.get(op.shiftId);
      const shiftCode = shiftObj?.code || op.shift?.code || op.shiftId;
      const empCode = op.employeeCode || op.id;

      const certStatus: "valid" | "expiring_soon" | "expired" =
        daysLeft !== null && daysLeft < 0
          ? "expired"
          : daysLeft !== null && daysLeft <= EXPIRY_WINDOW_DAYS
          ? "expiring_soon"
          : "valid";

      const levelLabel =
        rec.level >= 4
          ? "Level 4 (Trainer)"
          : rec.level === 3
          ? "Level 3 (Autonomous)"
          : rec.level === 2
          ? "Level 2 (Supervised)"
          : "Level 1 (In Training)";

      if (rec.level >= 2 && isQualifiedNow) {
        let recommendationTag = "";
        if (isSameShift) {
          if (rec.level >= 4) recommendationTag = "Lead Trainer (Same Shift)";
          else if (rec.level === 3) recommendationTag = "Ready Now (Same Shift)";
          else recommendationTag = "Supervised Backup (Same Shift)";
        } else {
          if (rec.level >= 4) recommendationTag = "Cross-Shift Trainer";
          else recommendationTag = "Cross-Shift Transfer";
        }

        qualifiedAlts.push({
          operatorId: op.id,
          name: op.name,
          employeeCode: empCode,
          shiftId: op.shiftId,
          shiftCode,
          isSameShift,
          level: rec.level,
          effectiveLevel: effLevel,
          levelLabel,
          certifiedUntil: until,
          daysToExpiry: daysLeft,
          certStatus,
          recommendationTag,
        });
      } else if (rec.level === 1) {
        trainingCands.push({
          operatorId: op.id,
          name: op.name,
          employeeCode: empCode,
          shiftId: op.shiftId,
          shiftCode,
          isSameShift,
          level: rec.level,
          effectiveLevel: effLevel,
          levelLabel,
          certifiedUntil: until,
          daysToExpiry: daysLeft,
          certStatus,
          recommendationTag: isSameShift
            ? "In Training (Same Shift) - Fast-Track"
            : "In Training (Cross-Shift) - Fast-Track",
        });
      }
    }

    // Sort qualified alternatives:
    // 1. Same shift first
    // 2. Higher effective level
    // 3. Cert freshness (non-expiring > expiring soon)
    // 4. Alphabetical by name
    qualifiedAlts.sort((a, b) => {
      if (a.isSameShift !== b.isSameShift) return a.isSameShift ? -1 : 1;
      if (a.effectiveLevel !== b.effectiveLevel) return b.effectiveLevel - a.effectiveLevel;
      const aExp = a.certStatus === "expiring_soon" ? 1 : 0;
      const bExp = b.certStatus === "expiring_soon" ? 1 : 0;
      if (aExp !== bExp) return aExp - bExp;
      return a.name.localeCompare(b.name);
    });

    trainingCands.sort((a, b) => {
      if (a.isSameShift !== b.isSameShift) return a.isSameShift ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    const sameShiftCount = qualifiedAlts.filter((a) => a.isSameShift).length;
    const totalQualifiedCount = qualifiedAlts.length;

    let status: "COVERED" | "CROSS_SHIFT_ONLY" | "CRITICAL_UNCOVERED" = "CRITICAL_UNCOVERED";
    if (sameShiftCount > 0) {
      status = "COVERED";
    } else if (totalQualifiedCount > 0) {
      status = "CROSS_SHIFT_ONLY";
    }

    replacements.push({
      skillId: sId,
      skillCode: skill.code,
      skillName: skill.name,
      skillNameHi: skill.nameHi || null,
      lineKey: skill.lineKey || "GENERAL",
      criticality: skill.criticality || 2,
      resigningOperatorLevel: targetLevel,
      resigningOperatorLevelLabel: targetLevelLabel,
      sameShiftCount,
      totalQualifiedCount,
      status,
      alternatives: qualifiedAlts,
      trainingCandidates: trainingCands,
    });
  }

  // Sort replacements: critical uncovered first, then cross shift only, then covered, then by criticality desc
  const statusPriority: Record<string, number> = {
    CRITICAL_UNCOVERED: 0,
    CROSS_SHIFT_ONLY: 1,
    COVERED: 2,
  };
  replacements.sort((a, b) => {
    const prioDiff = statusPriority[a.status] - statusPriority[b.status];
    if (prioDiff !== 0) return prioDiff;
    return b.criticality - a.criticality;
  });

  const coveredSameShiftCount = replacements.filter((r) => r.status === "COVERED").length;
  const crossShiftOnlyCount = replacements.filter((r) => r.status === "CROSS_SHIFT_ONLY").length;
  const criticalUncoveredCount = replacements.filter((r) => r.status === "CRITICAL_UNCOVERED").length;
  const totalAlternativesAvailable = replacements.reduce(
    (sum, r) => sum + r.totalQualifiedCount,
    0
  );

  return {
    summary: {
      affectedSkillsCount: replacements.length,
      coveredSameShiftCount,
      crossShiftOnlyCount,
      criticalUncoveredCount,
      totalAlternativesAvailable,
    },
    replacements,
  };
}
