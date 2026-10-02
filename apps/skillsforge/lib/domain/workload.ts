export interface OperatorWorkloadStat {
  operatorId: string;
  name: string;
  count: number;
  isOverloaded: boolean;
}

export interface WorkloadDistributionResult {
  median: number;
  totalAssignments: number;
  top3SharePct: number;
  top3Count: number;
  stats: OperatorWorkloadStat[];
}

export function computeMedian(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

export function workloadStats(
  operators: { id: string; name: string }[],
  assignments: { operatorId: string; status: string }[]
): WorkloadDistributionResult {
  const counts: Record<string, number> = {};
  for (const op of operators) {
    counts[op.id] = 0;
  }

  let totalAccepted = 0;
  for (const a of assignments) {
    if (a.status === "accepted") {
      counts[a.operatorId] = (counts[a.operatorId] || 0) + 1;
      totalAccepted++;
    }
  }

  const countList = Object.values(counts);
  const median = computeMedian(countList);

  const stats: OperatorWorkloadStat[] = operators.map((op) => {
    const c = counts[op.id] || 0;
    const isOverloaded = median > 0 && c > 1.5 * median && c >= 3;
    return {
      operatorId: op.id,
      name: op.name,
      count: c,
      isOverloaded,
    };
  });

  stats.sort((a, b) => b.count - a.count);

  const top3Total = stats.slice(0, 3).reduce((sum, item) => sum + item.count, 0);
  const top3SharePct = totalAccepted > 0 ? Math.round((top3Total / totalAccepted) * 100) : 0;

  return {
    median,
    totalAssignments: totalAccepted,
    top3SharePct,
    top3Count: Math.min(3, stats.length),
    stats,
  };
}
