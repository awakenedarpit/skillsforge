import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as getGapReport } from "@/app/api/reports/gaps/route";
import { GET as getVerdictReport } from "@/app/api/reports/verdict/route";
import { setSession, resetSession } from "../setup";
import { mockDb } from "../helpers/mockDb";

describe("Reports API Routes", () => {
  beforeEach(() => {
    resetSession();
  });

  describe("GET /api/reports/gaps", () => {
    it("returns 401 unauthenticated when no session exists", async () => {
      setSession(null);
      const req = new NextRequest("http://localhost:3011/api/reports/gaps");
      const res = await getGapReport(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
    });

    it("returns gap report with SPOFs via DB groupBy and redCells", async () => {
      (mockDb.sfShift.findMany as any).mockResolvedValueOnce([
        { id: "shift-a", code: "A", startTime: "06:00", endTime: "14:00" },
      ]);
      (mockDb.sfSkill.findMany as any).mockResolvedValueOnce([
        {
          id: "sk-qa-8",
          code: "QA-8",
          name: "CMM Inspection",
          nameHi: "सीएमएम निरीक्षण",
          lineKey: "FINISHING",
          criticality: 3,
          isActive: true,
        },
      ]);
      (mockDb.sfOperator.findMany as any).mockResolvedValueOnce([
        { id: "op-1", name: "Ravi Kumar", shiftId: "shift-a", isActive: true },
      ]);
      (mockDb.sfOperatorSkill.findMany as any).mockResolvedValueOnce([
        {
          operatorId: "op-1",
          skillId: "sk-qa-8",
          level: 4,
          issuedOn: new Date("2025-01-01"),
          certifiedUntil: new Date("2026-10-11"), // 9 days left from 2026-10-02
        },
      ]);
      // DB groupBy returns 1 qualified for QA-8
      (mockDb.sfOperatorSkill.groupBy as any).mockResolvedValueOnce([
        {
          skillId: "sk-qa-8",
          _count: { _all: 1 },
        },
      ]);

      const req = new NextRequest("http://localhost:3011/api/reports/gaps?asOf=2026-10-02");
      const res = await getGapReport(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.asOf).toBe("2026-10-02");
      expect(json.data.spofs).toHaveLength(1);
      expect(json.data.spofs[0].skill.code).toBe("QA-8");
      expect(json.data.spofs[0].qualifiedCount).toBe(1);
      expect(json.data.topRisks).toHaveLength(1);
      expect(json.data.topRisks[0].skill.code).toBe("QA-8");

      expect(mockDb.sfOperatorSkill.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ orgId: "org-demo-1" }),
        })
      );
    });
  });

  describe("GET /api/reports/verdict", () => {
    it("returns 401 unauthenticated when no session exists", async () => {
      setSession(null);
      const req = new NextRequest("http://localhost:3011/api/reports/verdict?operatorId=op-1&skillId=sk-1");
      const res = await getVerdictReport(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
    });

    it("returns printable verdict certificate payload", async () => {
      (mockDb.sfOperator.findFirst as any).mockResolvedValueOnce({
        id: "op-1",
        employeeCode: "OP-001",
        name: "Ravi Kumar",
        shiftId: "shift-a",
        isActive: true,
      });
      (mockDb.sfSkill.findFirst as any).mockResolvedValueOnce({
        id: "sk-cnc-l1",
        code: "CNC-L1",
        name: "CNC Lathe",
        nameHi: "सीएनसी लेथ",
        lineKey: "MACHINING",
        criticality: 3,
        isActive: true,
      });
      (mockDb.sfOperatorSkill.findFirst as any).mockResolvedValueOnce({
        operatorId: "op-1",
        skillId: "sk-cnc-l1",
        level: 4,
        issuedOn: new Date("2025-01-01"),
        certifiedUntil: new Date("2027-01-01"),
      });
      (mockDb.sfOperator.findMany as any).mockResolvedValueOnce([]);
      (mockDb.sfShift.findMany as any).mockResolvedValueOnce([
        { id: "shift-a", code: "A", startTime: "06:00", endTime: "14:00" },
      ]);
      (mockDb.sfOperatorSkill.findMany as any).mockResolvedValueOnce([]);
      (mockDb.sfAssignment.findMany as any).mockResolvedValueOnce([]);

      const req = new NextRequest(
        "http://localhost:3011/api/reports/verdict?operatorId=op-1&skillId=sk-cnc-l1&assignmentDate=2026-10-02"
      );
      const res = await getVerdictReport(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.verdict).toBe("green");
      expect(json.data.operator.name).toBe("Ravi Kumar");
      expect(json.data.skill.code).toBe("CNC-L1");
      expect(json.data.generatedBy).toBe("Rohit Kulkarni");
    });
  });
});
