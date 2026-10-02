import { EXPIRY_WINDOW_DAYS } from './qualification';
import { CoverageCell } from './coverage';

export const CRITICALITY_WEIGHT: Record<number, number> = {
  1: 1.0,
  2: 1.15,
  3: 1.3
};

export interface RiskBreakdown {
  term: string;
  detail: string;
  value: number;
}

export interface RiskResult {
  score: number;
  breakdown: RiskBreakdown[];
  raw: number;
  weighted: number;
}

export function riskScore(skillCriticality: number, cells: CoverageCell[]): RiskResult {
  const counts = cells.map(c => c.qualifiedCount);
  const minimum = counts.length > 0 ? Math.min(...counts) : 0;
  
  let base = 5;
  if (minimum <= 0) base = 100;
  else if (minimum === 1) base = 70;
  else if (minimum === 2) base = 30;

  const window = EXPIRY_WINDOW_DAYS;
  let expiringPeople = 0;
  let trainers = 0;
  const seen = new Set<string>();
  
  for (const cell of cells) {
    for (const person of cell.qualifiedOperators) {
      if (seen.has(person.id)) continue;
      seen.add(person.id);
      if (person.level >= 4) trainers++;
      if (person.daysToExpiry !== null && person.daysToExpiry >= 0 && person.daysToExpiry <= window) {
        expiringPeople++;
      }
    }
  }
  
  const expiringPoints = Math.min(20, expiringPeople * 10);
  const trainerPoints = trainers > 0 ? 0 : 15;
  const weight = CRITICALITY_WEIGHT[skillCriticality] ?? 1.0;
  
  const raw = base + expiringPoints + trainerPoints;
  const weighted = raw * weight;
  const score = Math.min(100, Math.round(weighted));
  
  const breakdown: RiskBreakdown[] = [
    {
      term: 'base_coverage',
      detail: `Weakest shift has ${minimum} qualified operator${minimum !== 1 ? 's' : ''}`,
      value: base
    },
    {
      term: 'expiring_certs',
      detail: `${expiringPeople} qualified operator${expiringPeople !== 1 ? 's' : ''} with a certificate inside ${window} days (capped at +20)`,
      value: expiringPoints
    },
    {
      term: 'no_trainer',
      detail: trainerPoints ? 'No qualified level-4 trainer' : 'A qualified level-4 trainer exists',
      value: trainerPoints
    },
    {
      term: 'criticality',
      detail: `Criticality ${skillCriticality} applies ×${weight.toFixed(2)} to the subtotal ${raw}`,
      value: weight
    }
  ];
  
  if (weighted > 100) {
    breakdown.push({
      term: 'cap',
      detail: 'Score capped at 100',
      value: 100
    });
  }
  
  return { score, breakdown, raw, weighted };
}
