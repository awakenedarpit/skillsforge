import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as simulateResignation } from "@/app/api/simulate/resignation/route";
import { setSession, resetSession } from "../setup";
import { mockDb } from "../helpers/mockDb";
import {
  DEMO_MACHINES,
  DEMO_OPERATORS,
  DEMO_SHIFTS,
  getDemoSkillRecords,
} from "@/lib/demo/seedData";

describe("MVP-1: Simulator API (GET /api/simulate/resignation)", () => {
  beforeEach(() => {
    resetSession();
  });

  it("returns 422 when operatorId is missing", async () => {
    const req = new NextRequest("http://localhost:3011/api/simulate/resignation");
    const res = await simulateResignation(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it("returns 404 when operator is not found", async () => {
    (mockDb.sfShift.findMany as any).mockResolvedValueOnce(DEMO_SHIFTS);
    (mockDb.sfSkill.findMany as any).mockResolvedValueOnce(DEMO_MACHINES);
    (mockDb.sfOperator.findMany as any).mockResolvedValueOnce(DEMO_OPERATORS);
    (mockDb.sfOperatorSkill.findMany as any).mockResolvedValueOnce(getDemoSkillRecords());

    const req = new NextRequest("http://localhost:3011/api/simulate/resignation?operatorId=non-existent");
    const res = await simulateResignation(req);
    expect(res.status).toBe(404);
  });

  it("simulates Ravi Kumar resignation: before vs after and newly red cells", async () => {
    (mockDb.sfShift.findMany as any).mockResolvedValueOnce(DEMO_SHIFTS);
    (mockDb.sfSkill.findMany as any).mockResolvedValueOnce(DEMO_MACHINES);
    (mockDb.sfOperator.findMany as any).mockResolvedValueOnce(DEMO_OPERATORS);
    (mockDb.sfOperatorSkill.findMany as any).mockResolvedValueOnce(getDemoSkillRecords());

    const req = new NextRequest("http://localhost:3011/api/simulate/resignation?operatorId=op-001");
    const res = await simulateResignation(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.operator.id).toBe("op-001");
    expect(json.data.operator.name).toBe("Ravi Kumar");

    // Ravi Kumar departure causes >= 2 cells to turn red (STORY-5)
    expect(json.data.summary.newlyRedCount).toBeGreaterThanOrEqual(2);
    expect(json.data.newlyRed.length).toBeGreaterThanOrEqual(2);
    expect(json.data.before).toBeDefined();
    expect(json.data.after).toBeDefined();

    // Verify cell structures
    expect(json.data.before.cells.length).toBe(24);
    expect(json.data.after.cells.length).toBe(24);

    // Verify replacement alternatives feature
    expect(json.data.replacements).toBeDefined();
    expect(json.data.replacements.length).toBeGreaterThan(0);
    expect(json.data.replacementSummary).toBeDefined();
    expect(json.data.replacementSummary.affectedSkillsCount).toBeGreaterThan(0);

    const firstReplacement = json.data.replacements[0];
    expect(firstReplacement.skillId).toBeDefined();
    expect(firstReplacement.skillCode).toBeDefined();
    expect(firstReplacement.resigningOperatorLevel).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(firstReplacement.alternatives)).toBe(true);

    if (firstReplacement.alternatives.length > 0) {
      const alt = firstReplacement.alternatives[0];
      expect(alt.operatorId).toBeDefined();
      expect(alt.name).toBeDefined();
      expect(alt.level).toBeGreaterThanOrEqual(2);
      expect(alt.recommendationTag).toBeDefined();
    }
  });
});
