import { addDays, startOfDay } from 'date-fns';
import { MIN_COVERAGE, EXPIRY_WINDOW_DAYS, isQualified, daysToExpiry } from './qualification';

export interface OperatorView {
  id: string;
  name: string;
  shiftId: string;
  isActive: boolean;
}

export interface SkillView {
  id: string;
  code: string;
  name: string;
  line: string;
  criticality: number;
  isActive: boolean;
}

export interface ShiftView {
  id: string;
  name: string;
}

export interface SkillRecord {
  operatorId: string;
  skillId: string;
  level: number;
  issuedOn: Date | null;
  certifiedUntil: Date | null;
}

export interface QualifiedOperator {
  id: string;
  name: string;
  level: number;
  certifiedUntil: Date | null;
  daysToExpiry: number | null;
}

export interface CoverageCell {
  skillId: string;
  shiftId: string;
  qualifiedCount: number;
  status: 'RED' | 'AMBER' | 'GREEN';
  qualifiedOperators: QualifiedOperator[];
  trainerCount: number;
  expiringSoonCount: number;
}

export interface SkillCoverageTotal {
  skillId: string;
  totalQualified: number;
}

export interface Coverage {
  cells: CoverageCell[];
  totals: SkillCoverageTotal[];
}

export function cellStatus(count: number, minimum: number = MIN_COVERAGE): 'RED' | 'AMBER' | 'GREEN' {
  if (count < minimum) return 'RED';
  if (count === minimum) return 'AMBER';
  return 'GREEN';
}

export function coverageCells(
  operators: OperatorView[],
  skills: SkillView[],
  shifts: ShiftView[],
  records: SkillRecord[],
  onDate: Date
): Coverage {
  const window = EXPIRY_WINDOW_DAYS;
  const byPair = new Map<string, SkillRecord>();
  for (const r of records) {
    byPair.set(`${r.operatorId}_${r.skillId}`, r);
  }

  const activeSkills = skills.filter(s => s.isActive);
  const cells: CoverageCell[] = [];
  const totals: SkillCoverageTotal[] = [];

  for (const skill of activeSkills) {
    let total = 0;
    for (const shift of shifts) {
      const people: QualifiedOperator[] = [];
      for (const op of operators) {
        if (op.shiftId !== shift.id) continue;
        const record = byPair.get(`${op.id}_${skill.id}`);
        const level = record ? record.level : 0;
        const until = record && record.certifiedUntil ? record.certifiedUntil : null;
        if (!isQualified(op.isActive, level, until, onDate)) continue;
        const remaining = daysToExpiry(until, onDate);
        people.push({
          id: op.id,
          name: op.name,
          level,
          certifiedUntil: until,
          daysToExpiry: remaining
        });
      }
      
      people.sort((a, b) => {
        if (a.level !== b.level) return b.level - a.level;
        return a.name.localeCompare(b.name);
      });
      
      const trainers = people.filter(p => p.level >= 4).length;
      const expiring = people.filter(p => p.daysToExpiry !== null && p.daysToExpiry >= 0 && p.daysToExpiry <= window).length;
      
      cells.push({
        skillId: skill.id,
        shiftId: shift.id,
        qualifiedCount: people.length,
        status: cellStatus(people.length),
        qualifiedOperators: people,
        trainerCount: trainers,
        expiringSoonCount: expiring,
      });
      total += people.length;
    }
    totals.push({ skillId: skill.id, totalQualified: total });
  }

  return { cells, totals };
}

export function forecast(
  operators: OperatorView[],
  skills: SkillView[],
  shifts: ShiftView[],
  records: SkillRecord[],
  onDate: Date,
  daysAhead: number
): Coverage {
  return coverageCells(operators, skills, shifts, records, addDays(startOfDay(onDate), daysAhead));
}

const STATUS_RANK: Record<string, number> = { GREEN: 0, AMBER: 1, RED: 2 };
function statusRank(status: string): number {
  return STATUS_RANK[status] ?? 0;
}

export function simulateRemoval(
  operators: OperatorView[],
  skills: SkillView[],
  shifts: ShiftView[],
  records: SkillRecord[],
  operatorId: string,
  onDate: Date,
  skillId: string | null = null
) {
  const before = coverageCells(operators, skills, shifts, records, onDate);
  let nextOps = operators;
  let nextRecords = records;
  
  if (skillId === null) {
    nextOps = operators.map(op => op.id === operatorId ? { ...op, isActive: false } : op);
  } else {
    nextRecords = records.filter(r => !(r.operatorId === operatorId && r.skillId === skillId));
  }
  
  const after = coverageCells(nextOps, skills, shifts, nextRecords, onDate);
  const afterBy = new Map<string, CoverageCell>();
  for (const cell of after.cells) {
    afterBy.set(`${cell.skillId}_${cell.shiftId}`, cell);
  }
  
  const newlyRed: any[] = [];
  const worsened: any[] = [];
  
  for (const cell of before.cells) {
    const nxt = afterBy.get(`${cell.skillId}_${cell.shiftId}`);
    if (!nxt) continue;
    if (cell.status !== 'RED' && nxt.status === 'RED') {
      newlyRed.push({
        skillId: cell.skillId,
        shiftId: cell.shiftId,
        beforeCount: cell.qualifiedCount,
        afterCount: nxt.qualifiedCount,
        beforeStatus: cell.status,
        afterStatus: nxt.status
      });
    }
    if (statusRank(nxt.status) > statusRank(cell.status)) {
      worsened.push({
        skillId: cell.skillId,
        shiftId: cell.shiftId,
        beforeStatus: cell.status,
        afterStatus: nxt.status,
        beforeCount: cell.qualifiedCount,
        afterCount: nxt.qualifiedCount
      });
    }
  }
  
  const trainerTotals = (cov: Coverage) => {
    const totals = new Map<string, number>();
    for (const cell of cov.cells) {
      totals.set(cell.skillId, (totals.get(cell.skillId) || 0) + cell.trainerCount);
    }
    return totals;
  };
  
  const beforeTrainers = trainerTotals(before);
  const afterTrainers = trainerTotals(after);
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
    lostAllTrainers
  };
}
