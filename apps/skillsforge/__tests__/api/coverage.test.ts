import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as getCoverage } from "@/app/api/coverage/route";
import { setSession, resetSession } from "../setup";
import { mockDb } from "../helpers/mockDb";

describe("Coverage API Routes", () => {
  beforeEach(() => {
    resetSession();
  });

  describe("GET /api/coverage", () => {
    it("returns 401 unauthenticated when no session exists", async () => {
      setSession(null);
      const req = new NextRequest("http://localhost:3011/api/coverage");
      const res = await getCoverage(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.error).toBe("Unauthenticated");
    });

    it("returns coverage heatmap payload filtered by orgId", async () => {
      (mockDb.sfShift.findMany as any).mockResolvedValueOnce([
        { id: "shift-a", code: "A", startTime: "06:00", endTime: "14:00" },
        { id: "shift-b", code: "B", startTime: "14:00", endTime: "22:00" },
      ]);
      (mockDb.sfSkill.findMany as any).mockResolvedValueOnce([
        {
          id: "sk-cnc-l1",
          code: "CNC-L1",
          name: "CNC Lathe",
          nameHi: "सीएनसी लेथ",
          lineKey: "MACHINING",
          criticality: 3,
          isActive: true,
        },
      ]);
      (mockDb.sfOperator.findMany as any).mockResolvedValueOnce([
        { id: "op-1", name: "Ravi Kumar", shiftId: "shift-a", isActive: true },
        { id: "op-2", name: "Anita Sharma", shiftId: "shift-a", isActive: true },
      ]);
      (mockDb.sfOperatorSkill.findMany as any).mockResolvedValueOnce([
        {
          operatorId: "op-1",
          skillId: "sk-cnc-l1",
          level: 4,
          issuedOn: new Date("2025-01-01"),
          certifiedUntil: new Date("2027-01-01"),
        },
        {
          operatorId: "op-2",
          skillId: "sk-cnc-l1",
          level: 2,
          issuedOn: new Date("2025-01-01"),
          certifiedUntil: new Date("2027-01-01"),
        },
      ]);

      const req = new NextRequest("http://localhost:3011/api/coverage?asOf=2026-10-02");
      const res = await getCoverage(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.asOf).toBe("2026-10-02");
      expect(json.data.skills).toHaveLength(1);
      expect(json.data.shifts).toHaveLength(2);

      // Shift A has 2 qualified -> AMBER
      const shiftACell = json.data.cells.find((c: any) => c.shiftId === "shift-a");
      expect(shiftACell.qualifiedCount).toBe(2);
      expect(shiftACell.status).toBe("AMBER");
      expect(shiftACell.trainerCount).toBe(1);

      // Shift B has 0 qualified -> RED
      const shiftBCell = json.data.cells.find((c: any) => c.shiftId === "shift-b");
      expect(shiftBCell.qualifiedCount).toBe(0);
      expect(shiftBCell.status).toBe("RED");

      expect(mockDb.sfOperator.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ orgId: "org-demo-1" }),
        })
      );
    });
  });
});
