import { describe, it, expect } from "vitest";
import {
  projectCoverageForecast,
  type OperatorDomainView,
  type SkillDomainView,
  type ShiftDomainView,
  type SkillRecordDomain,
} from "../../lib/domain/coverage";

describe("Shift Coverage Horizon Forecasting (projectCoverageForecast)", () => {
  const asOf = "2026-10-01";

  const shifts: ShiftDomainView[] = [
    { id: "shift-a", code: "A", startTime: "06:00", endTime: "14:00" },
    { id: "shift-b", code: "B", startTime: "14:00", endTime: "22:00" },
  ];

  const skills: SkillDomainView[] = [
    {
      id: "skill-1",
      code: "CNC-01",
      name: "CNC Turning",
      lineKey: "LINE-1",
      criticality: 3,
      isActive: true,
    },
    {
      id: "skill-2",
      code: "WELD-01",
      name: "TIG Welding",
      lineKey: "LINE-1",
      criticality: 2,
      isActive: true,
    },
  ];

  it("identifies cells that drop below minimum (<2 qualified) due to upcoming cert expiry within 30 days", () => {
    // 2 operators on shift A for skill 1:
    // op1 expires in 20 days (2026-10-21) -> within 30 days
    // op2 expires in 100 days (2027-01-09)
    const operators: OperatorDomainView[] = [
      { id: "op-1", name: "Ravi Kumar", shiftId: "shift-a", isActive: true },
      { id: "op-2", name: "Amit Singh", shiftId: "shift-a", isActive: true },
    ];

    const records: SkillRecordDomain[] = [
      { operatorId: "op-1", skillId: "skill-1", level: 3, certifiedUntil: "2026-10-21" },
      { operatorId: "op-2", skillId: "skill-1", level: 3, certifiedUntil: "2027-01-09" },
    ];

    // At 30 days: op-1's cert expires, dropping count from 2 to 1 (< MIN_COVERAGE=2), turning cell RED
    const result30 = projectCoverageForecast(operators, skills, shifts, records, asOf, 30);
    expect(result30.asOf).toBe("2026-10-01");
    expect(result30.horizonDays).toBe(30);
    expect(result30.projectedDate).toBe("2026-10-31");
    expect(result30.dropsBelowMinimum.length).toBe(1);

    const drop = result30.dropsBelowMinimum[0];
    expect(drop.skillCode).toBe("CNC-01");
    expect(drop.shiftCode).toBe("A");
    expect(drop.currentCount).toBe(2);
    expect(drop.projectedCount).toBe(1);
    expect(drop.currentStatus).toBe("AMBER");
    expect(drop.projectedStatus).toBe("RED");
    expect(drop.expiringOperators).toHaveLength(1);
    expect(drop.expiringOperators[0].name).toBe("Ravi Kumar");

    // At 10 days: neither expires, no drops
    const result10 = projectCoverageForecast(operators, skills, shifts, records, asOf, 10);
    expect(result10.dropsBelowMinimum.length).toBe(0);
    expect(result10.summary.totalDropsBelowMinimum).toBe(0);
  });

  it("handles multi-horizon forecasts: 30, 60, 90 days", () => {
    const operators: OperatorDomainView[] = [
      { id: "op-1", name: "Operator 1", shiftId: "shift-a", isActive: true },
      { id: "op-2", name: "Operator 2", shiftId: "shift-a", isActive: true },
      { id: "op-3", name: "Operator 3", shiftId: "shift-a", isActive: true },
    ];

    // Starts with 3 qualified (GREEN)
    // op-1 expires in 45 days (2026-11-15) -> captured in 60d and 90d
    // op-2 expires in 75 days (2026-12-15) -> drops to 1 qualified at 90d (turns RED)
    const records: SkillRecordDomain[] = [
      { operatorId: "op-1", skillId: "skill-1", level: 2, certifiedUntil: "2026-11-15" },
      { operatorId: "op-2", skillId: "skill-1", level: 2, certifiedUntil: "2026-12-15" },
      { operatorId: "op-3", skillId: "skill-1", level: 2, certifiedUntil: "2027-06-01" },
    ];

    // 30 days: all 3 valid
    const fc30 = projectCoverageForecast(operators, skills, shifts, records, asOf, 30);
    expect(fc30.dropsBelowMinimum.length).toBe(0);
    expect(fc30.worsenedCells.length).toBe(0);

    // 60 days: op-1 expires, drops from 3 to 2 (AMBER). Worsened but not below minimum (<2)
    const fc60 = projectCoverageForecast(operators, skills, shifts, records, asOf, 60);
    expect(fc60.dropsBelowMinimum.length).toBe(0);
    expect(fc60.worsenedCells.length).toBe(1);
    expect(fc60.worsenedCells[0].projectedCount).toBe(2);

    // 90 days: op-1 and op-2 expire, drops from 3 to 1 (<2, RED). Both worsened and drops below minimum!
    const fc90 = projectCoverageForecast(operators, skills, shifts, records, asOf, 90);
    expect(fc90.dropsBelowMinimum.length).toBe(1);
    expect(fc90.dropsBelowMinimum[0].currentCount).toBe(3);
    expect(fc90.dropsBelowMinimum[0].projectedCount).toBe(1);
    expect(fc90.dropsBelowMinimum[0].projectedStatus).toBe("RED");
    expect(fc90.dropsBelowMinimum[0].expiringOperators).toHaveLength(2);
    expect(fc90.summary.skillsAffected).toBe(1);
    expect(fc90.summary.shiftsAffected).toBe(1);
  });

  it("does not report drops if cell is already RED at baseline", () => {
    const operators: OperatorDomainView[] = [
      { id: "op-1", name: "Single Operator", shiftId: "shift-a", isActive: true },
    ];
    // Baseline only has 1 qualified (< MIN_COVERAGE=2), so already RED
    const records: SkillRecordDomain[] = [
      { operatorId: "op-1", skillId: "skill-1", level: 3, certifiedUntil: "2026-10-15" },
    ];

    const result = projectCoverageForecast(operators, skills, shifts, records, asOf, 30);
    // Already RED at baseline does not count as "newly dropping below minimum"
    expect(result.dropsBelowMinimum.length).toBe(0);
  });
});
