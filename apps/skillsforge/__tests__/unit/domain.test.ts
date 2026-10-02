import { describe, it, expect } from "vitest";
import {
  effectiveLevel,
  isQualified,
  daysToExpiry,
  severityFor,
  cellStatus,
  buildCoverage,
  forecastCoverage,
  simulateRemoval,
  riskScore,
  checkAssignment,
  rankAlternatives,
  workloadStats,
  reconcileAlerts,
  QUALIFIED_MIN_LEVEL,
} from "../../lib/domain";

describe("Domain Rules & Qualification Functions", () => {
  const asOf = "2026-10-02";

  it("evaluates effectiveLevel accurately against cert date", () => {
    // Normal level with future expiry
    expect(effectiveLevel(3, "2026-11-01", asOf)).toBe(3);
    // Expired cert before asOf drops level to 0
    expect(effectiveLevel(3, "2026-10-01", asOf)).toBe(0);
    // Cert expiring exactly on asOf is still valid on that day
    expect(effectiveLevel(3, "2026-10-02", asOf)).toBe(3);
    // Null cert keeps level as is
    expect(effectiveLevel(2, null, asOf)).toBe(2);
  });

  it("evaluates isQualified considering active flag, level, and cert expiry", () => {
    // Inactive operator is never qualified
    expect(isQualified(false, 4, "2027-01-01", asOf)).toBe(false);
    // Active operator below level 2 is not qualified
    expect(isQualified(true, 1, "2027-01-01", asOf)).toBe(false);
    // Active operator at level 2 with valid cert is qualified
    expect(isQualified(true, 2, "2027-01-01", asOf)).toBe(true);
    // Active operator with expired cert is not qualified
    expect(isQualified(true, 4, "2026-09-20", asOf)).toBe(false);
    // Active operator with null cert at level 2 is qualified
    expect(isQualified(true, 2, null, asOf)).toBe(true);
  });

  it("calculates daysToExpiry correctly", () => {
    expect(daysToExpiry(null, asOf)).toBeNull();
    expect(daysToExpiry("2026-10-12", asOf)).toBe(10);
    expect(daysToExpiry("2026-09-27", asOf)).toBe(-5);
    expect(daysToExpiry("2026-10-02", asOf)).toBe(0);
  });

  it("maps severity levels according to window days", () => {
    expect(severityFor(-1)).toBe("expired");
    expect(severityFor(-10)).toBe("expired");
    expect(severityFor(0)).toBe("critical");
    expect(severityFor(7)).toBe("critical");
    expect(severityFor(8)).toBe("warning");
    expect(severityFor(14)).toBe("warning");
    expect(severityFor(15)).toBe("notice");
    expect(severityFor(30)).toBe("notice");
  });

  it("assigns cellStatus correctly", () => {
    expect(cellStatus(0)).toBe("RED");
    expect(cellStatus(1)).toBe("RED");
    expect(cellStatus(2)).toBe("AMBER");
    expect(cellStatus(3)).toBe("GREEN");
    expect(cellStatus(5)).toBe("GREEN");
  });
});

describe("Coverage Pivot & Simulator", () => {
  const asOf = "2026-10-02";
  const shifts = [
    { id: "s-a", code: "A", startTime: "06:00", endTime: "14:00" },
    { id: "s-b", code: "B", startTime: "14:00", endTime: "22:00" },
  ];
  const skills = [
    { id: "sk-1", code: "CNC-L1", name: "CNC Lathe", lineKey: "MACHINING", criticality: 3, isActive: true },
  ];
  const operators = [
    { id: "op-1", name: "Ravi Kumar", shiftId: "s-a", isActive: true },
    { id: "op-2", name: "Anita Sharma", shiftId: "s-a", isActive: true },
    { id: "op-3", name: "Suresh Patil", shiftId: "s-b", isActive: true },
  ];
  const records = [
    { operatorId: "op-1", skillId: "sk-1", level: 4, certifiedUntil: "2027-01-01" },
    { operatorId: "op-2", skillId: "sk-1", level: 2, certifiedUntil: "2026-10-10" }, // expires in 8 days
    { operatorId: "op-3", skillId: "sk-1", level: 2, certifiedUntil: "2027-01-01" },
  ];

  it("builds 2-D coverage heatmap pivot", () => {
    const cov = buildCoverage(operators, skills, shifts, records, asOf);
    expect(cov.cells.length).toBe(2);

    const cellA = cov.cells.find((c) => c.shiftId === "s-a")!;
    expect(cellA.qualifiedCount).toBe(2);
    expect(cellA.status).toBe("AMBER");
    expect(cellA.trainerCount).toBe(1);
    expect(cellA.expiringSoonCount).toBe(1); // op-2 expires in 8 days

    const cellB = cov.cells.find((c) => c.shiftId === "s-b")!;
    expect(cellB.qualifiedCount).toBe(1);
    expect(cellB.status).toBe("RED");
  });

  it("forecasts future coverage respecting cert expiries", () => {
    // 15 days ahead, op-2 has expired
    const futureCov = forecastCoverage(operators, skills, shifts, records, asOf, 15);
    const cellA = futureCov.cells.find((c) => c.shiftId === "s-a")!;
    expect(cellA.qualifiedCount).toBe(1);
    expect(cellA.status).toBe("RED"); // turned from AMBER to RED
  });

  it("simulates operator departure (MVP-1)", () => {
    const sim = simulateRemoval(operators, skills, shifts, records, "op-1", asOf);
    expect(sim.newlyRed.length).toBe(1); // shift A had 2, now has 1 (turned RED)
    expect(sim.lostAllTrainers).toContain("sk-1"); // op-1 was the only trainer (level 4)
  });
});

describe("Risk Score Calculation", () => {
  it("calculates risk score based on weakest shift, expiring certs, trainers, and criticality", () => {
    const cells: any[] = [
      {
        qualifiedCount: 1, // lowest is 1 -> base 70
        operators: [
          { id: "op-1", level: 3, daysToExpiry: 12 }, // expiring soon (+10)
        ],
      },
      {
        qualifiedCount: 2,
        operators: [
          { id: "op-2", level: 2, daysToExpiry: 40 },
        ],
      },
    ];

    // Criticality 3 -> weight 1.3
    // Base 70 + expiringPoints 10 + trainerPoints 15 (no level 4) = 95
    // 95 * 1.3 = 123.5 -> capped at 100
    const res = riskScore(3, cells);
    expect(res.score).toBe(100);
    expect(res.raw).toBe(95);
    expect(res.breakdown.some((b) => b.term === "base_coverage" && b.value === 70)).toBe(true);
    expect(res.breakdown.some((b) => b.term === "no_trainer" && b.value === 15)).toBe(true);
  });
});

describe("Assignment Check Verdict & Alternatives", () => {
  const asOf = "2026-10-02";
  const op = { id: "op-1", name: "Ravi Kumar", shiftId: "s-a", isActive: true };
  const skill = { id: "sk-1", code: "CNC-L1", name: "CNC Lathe", lineKey: "MACHINING", criticality: 3, isActive: true };

  it("approves qualified operator with green verdict", () => {
    const record = { operatorId: "op-1", skillId: "sk-1", level: 3, certifiedUntil: "2027-01-01" };
    const res = checkAssignment(op, skill, record, asOf, "s-a");
    expect(res.verdict).toBe("green");
    expect(res.blocking.length).toBe(0);
  });

  it("rejects operator with level < 2 with red verdict and reasons", () => {
    const record = { operatorId: "op-1", skillId: "sk-1", level: 1, certifiedUntil: "2027-01-01" };
    const res = checkAssignment(op, skill, record, asOf, "s-a");
    expect(res.verdict).toBe("red");
    expect(res.blocking.some((r) => r.code === "LEVEL_TOO_LOW")).toBe(true);
  });

  it("rejects expired certification with red verdict", () => {
    const record = { operatorId: "op-1", skillId: "sk-1", level: 3, certifiedUntil: "2026-09-20" };
    const res = checkAssignment(op, skill, record, asOf, "s-a");
    expect(res.verdict).toBe("red");
    expect(res.blocking.some((r) => r.code === "CERT_EXPIRED")).toBe(true);
  });

  it("raises warnings for wrong shift and expiring soon without blocking", () => {
    const record = { operatorId: "op-1", skillId: "sk-1", level: 2, certifiedUntil: "2026-10-15" }; // expires in 13 days
    const res = checkAssignment(op, skill, record, asOf, "s-b"); // op is on s-a
    expect(res.verdict).toBe("green");
    expect(res.warnings.some((w) => w.code === "WRONG_SHIFT")).toBe(true);
    expect(res.warnings.some((w) => w.code === "CERT_EXPIRING_SOON")).toBe(true);
  });

  it("ranks alternatives by same shift, load, and cert freshness", () => {
    const candidates = [
      { id: "op-2", name: "Anita", shiftId: "s-b", isActive: true },
      { id: "op-3", name: "Sunita", shiftId: "s-a", isActive: true },
    ];
    const candRecords = [
      { operatorId: "op-2", skillId: "sk-1", level: 3, certifiedUntil: "2027-01-01" },
      { operatorId: "op-3", skillId: "sk-1", level: 2, certifiedUntil: "2027-01-01" },
    ];
    const workload = { counts: { "op-2": 2, "op-3": 2 }, median: 2 };

    const alts = rankAlternatives(candidates, skill, candRecords, asOf, "s-a", workload, "op-1");
    expect(alts.length).toBe(2);
    // op-3 should be first because same shift ("s-a")
    expect(alts[0].operatorId).toBe("op-3");
  });
});

describe("Alert Reconciliation & Workload", () => {
  const asOf = "2026-10-02";

  it("reconciles alerts creating, updating, and resolving", () => {
    const existingAlerts = [
      {
        operatorId: "op-1",
        skillId: "sk-1",
        certifiedUntil: "2026-10-10",
        severity: "critical",
        daysRemaining: 15, // needs update to 8
        status: "open",
      },
      {
        operatorId: "op-2",
        skillId: "sk-1",
        certifiedUntil: "2026-10-05",
        severity: "critical",
        daysRemaining: 3,
        status: "open",
      },
    ];

    const records = [
      { operatorId: "op-1", skillId: "sk-1", level: 3, certifiedUntil: "2026-10-10" },
      // op-2 cert removed or renewed to 2027-10-01 (outside window)
      { operatorId: "op-2", skillId: "sk-1", level: 3, certifiedUntil: "2027-10-01" },
      // op-3 is newly expiring
      { operatorId: "op-3", skillId: "sk-1", level: 2, certifiedUntil: "2026-10-20" },
    ];

    const operators = [
      { id: "op-1", isActive: true },
      { id: "op-2", isActive: true },
      { id: "op-3", isActive: true },
    ];

    const result = reconcileAlerts(existingAlerts, records, operators, asOf);
    expect(result.toUpdate.length).toBe(1);
    expect(result.toUpdate[0].operatorId).toBe("op-1");
    expect(result.toUpdate[0].daysRemaining).toBe(8);

    expect(result.toCreate.length).toBe(1);
    expect(result.toCreate[0].operatorId).toBe("op-3");

    expect(result.toResolve.length).toBe(1);
    expect(result.toResolve[0].operatorId).toBe("op-2");
    expect(result.toResolve[0].resolvedReason).toBe("renewed");
  });

  it("computes workload distribution and top-3 share", () => {
    const ops = [
      { id: "op-1", name: "Ravi" },
      { id: "op-2", name: "Anita" },
      { id: "op-3", name: "Suresh" },
      { id: "op-4", name: "Meena" },
    ];
    const assignments = [
      { operatorId: "op-1", status: "accepted" },
      { operatorId: "op-1", status: "accepted" },
      { operatorId: "op-1", status: "accepted" },
      { operatorId: "op-1", status: "accepted" },
      { operatorId: "op-2", status: "accepted" },
      { operatorId: "op-2", status: "accepted" },
      { operatorId: "op-3", status: "accepted" },
    ]; // total 7: op-1=4, op-2=2, op-3=1, op-4=0

    const wl = workloadStats(ops, assignments);
    expect(wl.totalAssignments).toBe(7);
    expect(wl.top3Count).toBe(3);
    expect(wl.stats[0].operatorId).toBe("op-1");
    expect(wl.stats[0].count).toBe(4);
    expect(wl.top3SharePct).toBe(100); // 4+2+1 = 7 / 7 = 100%
  });
});
