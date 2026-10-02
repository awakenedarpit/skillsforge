import { EXPIRY_WINDOW_DAYS, isQualified, daysToExpiry } from './qualification';
import { Coverage, OperatorView, SkillRecord, SkillView, ShiftView, CoverageCell } from './coverage';
import { riskScore } from './risk';
import { WorkloadStats } from './verdict';

export interface TrainingSuggestion {
  skillId: string;
  skillCode: string;
  skillName: string;
  shiftId: string;
  shiftName: string;
  operatorId: string;
  operatorName: string;
  currentLevel: number;
  score: number;
  trainerName: string | null;
  reason: string;
  factors: string[];
  riskScore: number;
}

export function recommendCrossTraining(
  operators: OperatorView[],
  skills: SkillView[],
  shifts: ShiftView[],
  records: SkillRecord[],
  coverage: Coverage,
  onDate: Date,
  workloadStats: WorkloadStats,
  limit: number = 12
): TrainingSuggestion[] {
  const skillBy = new Map<string, SkillView>();
  for (const s of skills) skillBy.set(s.id, s);
  
  const shiftBy = new Map<string, ShiftView>();
  for (const s of shifts) shiftBy.set(s.id, s);
  
  const cellsBySkill = new Map<string, CoverageCell[]>();
  for (const cell of coverage.cells) {
    if (!cellsBySkill.has(cell.skillId)) {
      cellsBySkill.set(cell.skillId, []);
    }
    cellsBySkill.get(cell.skillId)!.push(cell);
  }

  const redCells = coverage.cells.filter(c => c.status === 'RED');
  const scoredCells: { riskNeg: number; code: string; shiftId: string; cell: CoverageCell; risk: ReturnType<typeof riskScore> }[] = [];
  
  for (const cell of redCells) {
    const skill = skillBy.get(cell.skillId);
    if (!skill) continue;
    const risk = riskScore(skill.criticality, cellsBySkill.get(cell.skillId) ?? []);
    scoredCells.push({ riskNeg: -risk.score, code: skill.code, shiftId: cell.shiftId, cell, risk });
  }
  
  scoredCells.sort((a, b) => {
    if (a.riskNeg !== b.riskNeg) return a.riskNeg - b.riskNeg;
    if (a.code !== b.code) return a.code.localeCompare(b.code);
    return a.shiftId.localeCompare(b.shiftId);
  });

  const byPair = new Map<string, SkillRecord>();
  for (const r of records) byPair.set(`${r.operatorId}_${r.skillId}`, r);
  
  const window = EXPIRY_WINDOW_DAYS;
  const suggestions: TrainingSuggestion[] = [];

  for (const { cell, risk } of scoredCells) {
    const skill = skillBy.get(cell.skillId);
    const shift = shiftBy.get(cell.shiftId);
    if (!skill || !shift) continue;
    
    const trainer = trainerName(coverage, skill.id);
    const candidates: { score: number; op: OperatorView; factors: string[]; level: number }[] = [];
    
    for (const op of operators) {
      if (op.shiftId !== shift.id || !op.isActive) continue;
      const record = byPair.get(`${op.id}_${skill.id}`);
      const level = record ? record.level : 0;
      const until = record ? record.certifiedUntil : null;
      if (isQualified(op.isActive, level, until, onDate)) continue;
      
      let score = 0;
      const factors: string[] = [];
      
      if (level === 1) {
        score += 40;
        factors.push("already Level 1 on this machine");
      }
      if (sameLineProficient(op, skill, skills, records, onDate)) {
        score += 30;
        factors.push(`qualified at level 3+ on another ${skill.line} machine`);
      }
      
      const load = workloadStats.counts[op.id] ?? 0;
      if (load <= workloadStats.median) {
        score += 20;
        factors.push("low recent workload");
      }
      if (!anyCertExpiring(op.id, records, onDate, window)) {
        score += 10;
        factors.push("no certificate expiring within 30 days");
      }
      
      candidates.push({ score, op, factors, level });
    }
    
    candidates.sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      return a.op.name.localeCompare(b.op.name);
    });
    
    for (const { score, op, factors, level } of candidates.slice(0, 2)) {
      const trainerBit = trainer ? `${trainer} can train` : "no level-4 trainer is on this machine yet";
      const factorText = factors.length > 0 ? factors.join("; ") : "available on this shift";
      const reason = `Train ${op.name} on ${skill.name} (${skill.code}) for shift ${shift.name}: fixes a red cell; ${factorText}; ${trainerBit}.`;
      
      suggestions.push({
        skillId: skill.id,
        skillCode: skill.code,
        skillName: skill.name,
        shiftId: shift.id,
        shiftName: shift.name,
        operatorId: op.id,
        operatorName: op.name,
        currentLevel: level,
        score,
        trainerName: trainer,
        reason,
        factors,
        riskScore: risk.score
      });
    }
    
    if (suggestions.length >= limit) break;
  }
  
  return suggestions.slice(0, limit);
}

function trainerName(coverage: Coverage, skillId: string): string | null {
  for (const cell of coverage.cells) {
    if (cell.skillId !== skillId) continue;
    for (const person of cell.qualifiedOperators) {
      if (person.level >= 4) return person.name;
    }
  }
  return null;
}

function sameLineProficient(op: OperatorView, skill: SkillView, skills: SkillView[], records: SkillRecord[], onDate: Date): boolean {
  const lineIds = new Set(skills.filter(s => s.line === skill.line && s.id !== skill.id).map(s => s.id));
  const byPair = new Map<string, SkillRecord>();
  for (const r of records) byPair.set(`${r.operatorId}_${r.skillId}`, r);
  
  for (const otherId of lineIds) {
    const record = byPair.get(`${op.id}_${otherId}`);
    if (record && record.level >= 3 && isQualified(op.isActive, record.level, record.certifiedUntil, onDate)) {
      return true;
    }
  }
  return false;
}

function anyCertExpiring(operatorId: string, records: SkillRecord[], onDate: Date, window: number): boolean {
  for (const record of records) {
    if (record.operatorId !== operatorId || record.certifiedUntil === null) continue;
    const remaining = daysToExpiry(record.certifiedUntil, onDate);
    if (remaining !== null && remaining >= 0 && remaining <= window && record.level >= 2) {
      return true;
    }
  }
  return false;
}
