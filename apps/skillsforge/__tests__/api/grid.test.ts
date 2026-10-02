import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as getGrid } from "@/app/api/grid/route";
import { GET as exportGrid } from "@/app/api/grid/export/route";
import { setSession, resetSession } from "../setup";
import { mockDb } from "../helpers/mockDb";

describe("Grid API Routes", () => {
  beforeEach(() => {
    resetSession();
  });

  describe("GET /api/grid", () => {
    it("returns 401 unauthenticated when no session exists", async () => {
      setSession(null);
      const req = new NextRequest("http://localhost:3011/api/grid");
      const res = await getGrid(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.error).toBe("Unauthenticated");
    });

    it("returns paginated operators x machines matrix with pagination metadata", async () => {
      (mockDb.sfShift.findMany as any).mockResolvedValueOnce([
        { id: "shift-a", code: "A", startTime: "06:00", endTime: "14:00" },
      ]);
      (mockDb.sfSkill.findMany as any).mockResolvedValueOnce([
        { id: "sk-cnc-l1", code: "CNC-L1", name: "CNC Lathe", nameHi: "सीएनसी लेथ", lineKey: "MACHINING", criticality: 3 },
      ]);
      (mockDb.sfOperator.count as any).mockResolvedValueOnce(1);
      (mockDb.sfOperator.findMany as any).mockResolvedValueOnce([
        {
          id: "op-001",
          employeeCode: "OP-001",
          name: "Ravi Kumar",
          shiftId: "shift-a",
          shift: { code: "A" },
        },
      ]);
      (mockDb.sfOperatorSkill.findMany as any).mockResolvedValueOnce([
        {
          operatorId: "op-001",
          skillId: "sk-cnc-l1",
          level: 4,
          issuedOn: new Date("2025-01-01"),
          certifiedUntil: new Date("2027-01-01"),
          updatedAt: new Date(),
        },
      ]);
      (mockDb.sfSkillHistory.findMany as any).mockResolvedValueOnce([]);

      const req = new NextRequest("http://localhost:3011/api/grid?asOf=2026-10-02&page=1&pageSize=50");
      const res = await getGrid(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.operators).toHaveLength(1);
      expect(json.data.skills).toHaveLength(1);
      expect(json.data.pagination).toEqual({
        page: 1,
        pageSize: 50,
        total: 1,
        totalPages: 1,
      });
      expect(json.data.matrix["op-001"]["sk-cnc-l1"]).toBeDefined();
      expect(json.data.matrix["op-001"]["sk-cnc-l1"].level).toBe(4);
      expect(json.data.matrix["op-001"]["sk-cnc-l1"].effectiveLevel).toBe(4);
    });

    it("evaluates expired certification into effective level 0", async () => {
      (mockDb.sfShift.findMany as any).mockResolvedValueOnce([]);
      (mockDb.sfSkill.findMany as any).mockResolvedValueOnce([
        { id: "sk-pkg-7", code: "PKG-7", name: "Packaging", nameHi: null, lineKey: "FINISHING", criticality: 1 },
      ]);
      (mockDb.sfOperator.count as any).mockResolvedValueOnce(1);
      (mockDb.sfOperator.findMany as any).mockResolvedValueOnce([
        {
          id: "op-003",
          employeeCode: "OP-003",
          name: "Suresh Patil",
          shiftId: "shift-a",
          shift: { code: "A" },
        },
      ]);
      (mockDb.sfOperatorSkill.findMany as any).mockResolvedValueOnce([
        {
          operatorId: "op-003",
          skillId: "sk-pkg-7",
          level: 3,
          issuedOn: new Date("2024-01-01"),
          certifiedUntil: new Date("2026-09-20"), // Expired before 2026-10-02
          updatedAt: new Date(),
        },
      ]);
      (mockDb.sfSkillHistory.findMany as any).mockResolvedValueOnce([]);

      const req = new NextRequest("http://localhost:3011/api/grid?asOf=2026-10-02");
      const res = await getGrid(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      const cell = json.data.matrix["op-003"]["sk-pkg-7"];
      expect(cell.level).toBe(3);
      expect(cell.effectiveLevel).toBe(0);
      expect(cell.isExpired).toBe(true);
    });

    it("enforces role-based row filtering: members only see their own row", async () => {
      setSession({
        user: {
          id: "usr-member-1",
          email: "member@skillsforge.quikit.io",
          name: "Operator Member",
          orgId: "org-demo-1",
          membershipRole: "member",
          operatorId: "op-002",
        },
        expires: "2099-01-01",
      });

      (mockDb.sfShift.findMany as any).mockResolvedValueOnce([]);
      (mockDb.sfSkill.findMany as any).mockResolvedValueOnce([]);
      (mockDb.sfOperator.count as any).mockResolvedValueOnce(1);
      (mockDb.sfOperator.findMany as any).mockResolvedValueOnce([
        {
          id: "op-002",
          employeeCode: "OP-002",
          name: "Pooja Sharma",
          shiftId: "shift-a",
          shift: { code: "A" },
        },
      ]);
      (mockDb.sfOperatorSkill.findMany as any).mockResolvedValueOnce([]);
      (mockDb.sfSkillHistory.findMany as any).mockResolvedValueOnce([]);

      const req = new NextRequest("http://localhost:3011/api/grid");
      const res = await getGrid(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.operators).toHaveLength(1);
      expect(json.data.operators[0].id).toBe("op-002");

      // Verify that sfOperator.findMany query was strictly scoped to operatorId: op-002
      expect(mockDb.sfOperator.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: "op-002",
            orgId: "org-demo-1",
          }),
        })
      );
    });

    it("returns empty result for member with null operatorId", async () => {
      setSession({
        user: {
          id: "usr-member-no-op",
          email: "nonop@skillsforge.quikit.io",
          name: "Non Operator Member",
          orgId: "org-demo-1",
          membershipRole: "member",
          operatorId: null,
        },
        expires: "2099-01-01",
      });

      (mockDb.sfShift.findMany as any).mockResolvedValueOnce([]);
      (mockDb.sfSkill.findMany as any).mockResolvedValueOnce([]);

      const req = new NextRequest("http://localhost:3011/api/grid");
      const res = await getGrid(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.operators).toHaveLength(0);
      expect(json.data.pagination.total).toBe(0);
      expect(mockDb.sfOperator.findMany).not.toHaveBeenCalled();
    });
  });

  describe("GET /api/grid/export", () => {
    it("returns full grid as CSV with appropriate headers and formula escaping", async () => {
      (mockDb.sfSkill.findMany as any).mockResolvedValueOnce([
        { id: "sk-1", code: "CNC", name: "CNC Milling" },
      ]);
      (mockDb.sfOperator.findMany as any).mockResolvedValueOnce([
        {
          id: "op-1",
          employeeCode: "OP-01",
          name: "=DangerousFormula",
          shift: { code: "A" },
        },
      ]);
      (mockDb.sfOperatorSkill.findMany as any).mockResolvedValueOnce([
        { operatorId: "op-1", skillId: "sk-1", level: 3, certifiedUntil: new Date("2027-01-01") },
      ]);

      const req = new NextRequest("http://localhost:3011/api/grid/export");
      const res = await exportGrid(req);
      const text = await res.text();

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toContain("text/csv");
      expect(text).toContain("Employee Code,Operator Name,Shift,CNC Milling");
      // Verify formula injection protection prepends single quote
      expect(text).toContain("'=DangerousFormula");
    });
  });
});
