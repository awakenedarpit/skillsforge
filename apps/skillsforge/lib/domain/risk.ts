import { CRITICALITY_WEIGHT, EXPIRY_WINDOW_DAYS } from "./rules";
import { CoverageCellView } from "./coverage";

export interface RiskBreakdownTerm {
  term: string;
  detail: string;
  value: number;
}

export interface RiskResult {
  score: number;
  breakdown: RiskBreakdownTerm[];
  raw: number;
  weighted: number;
}

export function riskScore(skillCriticality: number, cellsForSkill: CoverageCellView[]): RiskResult {
  const counts = cellsForSkill.map((c) => c.qualifiedCount);
  const minimum = counts.length > 0 ? Math.min(...counts) : 0;

  let base = 5;
  if (minimum <= 0) base = 100;
  else if (minimum === 1) base = 70;
  else if (minimum === 2) base = 30;

  let expiringOperatorsCount = 0;
  let trainersCount = 0;
  const uniqueSeen = new Set<string>();

  for (const cell of cellsForSkill) {
    for (const person of cell.operators) {
      if (uniqueSeen.has(person.id)) continue;
      uniqueSeen.add(person.id);
      if (person.level >= 4) trainersCount++;
      if (
        person.daysToExpiry !== null &&
        person.daysToExpiry >= 0 &&
        person.daysToExpiry <= EXPIRY_WINDOW_DAYS
      ) {
        expiringOperatorsCount++;
      }
    }
  }

  const expiringPoints = Math.min(20, expiringOperatorsCount * 10);
  const trainerPoints = trainersCount > 0 ? 0 : 15;
  const weight = CRITICALITY_WEIGHT[skillCriticality] ?? 1.0;

  const raw = base + expiringPoints + trainerPoints;
  const weighted = raw * weight;
  const score = Math.min(100, Math.round(weighted));

  const breakdown: RiskBreakdownTerm[] = [
    {
      term: "base_coverage",
      detail: `Lowest shift count is ${minimum} operator${minimum !== 1 ? "s" : ""}`,
      value: base,
    },
    {
      term: "expiring_certs",
      detail: `${expiringOperatorsCount} qualified operator${expiringOperatorsCount !== 1 ? "s" : ""} expiring within 30 days (+${expiringPoints})`,
      value: expiringPoints,
    },
    {
      term: "no_trainer",
      detail: trainerPoints > 0 ? "No level-4 trainer available (+15)" : "Qualified level-4 trainer exists",
      value: trainerPoints,
    },
    {
      term: "criticality_weight",
      detail: `Criticality ${skillCriticality} applies weight multiplier x${weight.toFixed(2)}`,
      value: weight,
    },
  ];

  if (weighted > 100) {
    breakdown.push({
      term: "cap",
      detail: "Score capped at 100",
      value: 100,
    });
  }

  return { score, breakdown, raw, weighted };
}
