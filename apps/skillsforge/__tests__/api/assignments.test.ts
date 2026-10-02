import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as checkAssignment } from "@/app/api/assignments/check/route";
import { GET as getAssignments, POST as postAssignment } from "@/app/api/assignments/route";
import { GET as getWorkload } from "@/app/api/workload/route";
import { setSession, resetSession } from "../setup";
import { mockDb } from "../helpers/mockDb";

describe("Assignments API Routes", () => {
  beforeEach(() => {
    resetSession();
  });

  describe("GET /api/assignments/check", () => {
    it("returns 401 unauthenticated when no session exists", async () => {
      setSession(null);
      const req = new NextRequest("http://localhost:3011/api/assignments/check?operatorId=op-1&skillId=sk-1");
      const res = await checkAssignment(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
    });

    it("returns 400 validation error if missing required query params", async () => {
      const req = new NextRequest("http://localhost:3011/api/assignments/check");
      const res = await checkAssignment(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
    });

    it("evaluates a qualified operator as green verdict", async () => {
      (mockDb.sfOperator.findFirst as any).mockResolvedValueOnce({
        id: "op-1",
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
      (mockDb.sfSkill.findMany as any).mockResolvedValueOnce([]);
      (mockDb.sfShift.findMany as any).mockResolvedValueOnce([]);
      (mockDb.sfOperatorSkill.findMany as any).mockResolvedValueOnce([]);
      (mockDb.sfAssignment.findMany as any).mockResolvedValueOnce([]);

      const req = new NextRequest(
        "http://localhost:3011/api/assignments/check?operatorId=op-1&skillId=sk-cnc-l1&assignmentDate=2026-10-02"
      );
      const res = await checkAssignment(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.verdict).toBe("green");
      expect(json.data.blocking).toHaveLength(0);
    });

    it("evaluates unqualified operator with level 1 as red verdict", async () => {
      (mockDb.sfOperator.findFirst as any).mockResolvedValueOnce({
        id: "op-2",
        name: "Anita Sharma",
        shiftId: "shift-a",
        isActive: true,
      });
      (mockDb.sfSkill.findFirst as any).mockResolvedValueOnce({
        id: "sk-qa-8",
        code: "QA-8",
        name: "CMM Inspection",
        nameHi: "सीएमएम निरीक्षण",
        lineKey: "FINISHING",
        criticality: 3,
        isActive: true,
      });
      (mockDb.sfOperatorSkill.findFirst as any).mockResolvedValueOnce({
        operatorId: "op-2",
        skillId: "sk-qa-8",
        level: 1, // Learning only, needs 2
        issuedOn: new Date("2025-01-01"),
        certifiedUntil: new Date("2027-01-01"),
      });
      (mockDb.sfOperator.findMany as any).mockResolvedValueOnce([]);
      (mockDb.sfSkill.findMany as any).mockResolvedValueOnce([]);
      (mockDb.sfShift.findMany as any).mockResolvedValueOnce([]);
      (mockDb.sfOperatorSkill.findMany as any).mockResolvedValueOnce([]);
      (mockDb.sfAssignment.findMany as any).mockResolvedValueOnce([]);

      const req = new NextRequest(
        "http://localhost:3011/api/assignments/check?operatorId=op-2&skillId=sk-qa-8&assignmentDate=2026-10-02"
      );
      const res = await checkAssignment(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.verdict).toBe("red");
      expect(json.data.blocking).toHaveLength(1);
      expect(json.data.blocking[0].code).toBe("LEVEL_TOO_LOW");
    });
  });

  describe("POST /api/assignments", () => {
    it("returns 403 forbidden for viewer/member role", async () => {
      setSession({
        user: {
          id: "usr-3",
          email: "vikas.rao@skillsforge.quikit.io",
          name: "Vikas Rao",
          orgId: "org-demo-1",
          membershipRole: "member", // Read only
        },
        expires: "2099-01-01",
      });

      const req = new NextRequest("http://localhost:3011/api/assignments", {
        method: "POST",
        body: JSON.stringify({
          operatorId: "op-1",
          skillId: "sk-1",
          assignmentDate: "2026-10-02",
        }),
      });
      const res = await postAssignment(req);
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.success).toBe(false);
    });

    it("returns 409 conflict when deploying unqualified operator and stores rejected row", async () => {
      setSession({
        user: {
          id: "usr-2",
          email: "rohit.kulkarni@skillsforge.quikit.io",
          name: "Rohit Kulkarni",
          orgId: "org-demo-1",
          membershipRole: "app_admin",
        },
        expires: "2099-01-01",
      });

      (mockDb.sfOperator.findFirst as any).mockResolvedValueOnce({
        id: "op-3",
        name: "Suresh Patil",
        shiftId: "shift-a",
        isActive: true,
      });
      (mockDb.sfSkill.findFirst as any).mockResolvedValueOnce({
        id: "sk-pkg-7",
        code: "PKG-7",
        name: "Packaging Line",
        lineKey: "FINISHING",
        criticality: 1,
        isActive: true,
      });
      // Expired cert
      (mockDb.sfOperatorSkill.findFirst as any).mockResolvedValueOnce({
        operatorId: "op-3",
        skillId: "sk-pkg-7",
        level: 3,
        issuedOn: new Date("2024-01-01"),
        certifiedUntil: new Date("2026-09-27"), // Expired 5 days before 2026-10-02
      });
      (mockDb.sfOperator.findMany as any).mockResolvedValueOnce([]);
      (mockDb.sfShift.findMany as any).mockResolvedValueOnce([]);
      (mockDb.sfOperatorSkill.findMany as any).mockResolvedValueOnce([]);
      (mockDb.sfAssignment.findMany as any).mockResolvedValueOnce([]);

      (mockDb.sfAssignment.create as any).mockResolvedValueOnce({
        id: "as-rej-1",
        operatorId: "op-3",
        skillId: "sk-pkg-7",
        shiftId: "shift-a",
        assignmentDate: new Date("2026-10-02"),
        status: "rejected",
        verdict: "red",
        assignedBy: "usr-2",
      });
      (mockDb.auditLog.create as any).mockResolvedValueOnce({ id: "aud-1" });

      const req = new NextRequest("http://localhost:3011/api/assignments", {
        method: "POST",
        body: JSON.stringify({
          operatorId: "op-3",
          skillId: "sk-pkg-7",
          assignmentDate: "2026-10-02",
        }),
      });
      const res = await postAssignment(req);
      const json = await res.json();

      expect(res.status).toBe(409);
      expect(json.success).toBe(false);
      expect(json.error).toContain("Certification expired");

      // Verify rejected row stored in database
      expect(mockDb.sfAssignment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "rejected",
            verdict: "red",
          }),
        })
      );
    });
  });

  describe("GET /api/workload", () => {
    it("returns 401 unauthenticated when no session exists", async () => {
      setSession(null);
      const req = new NextRequest("http://localhost:3011/api/workload");
      const res = await getWorkload(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
    });

    it("returns workload statistics with median and overloaded indicators", async () => {
      (mockDb.sfOperator.findMany as any).mockResolvedValueOnce([
        { id: "op-1", name: "Ravi Kumar", employeeCode: "OP-001", shiftId: "shift-a" },
        { id: "op-2", name: "Anita Sharma", employeeCode: "OP-002", shiftId: "shift-a" },
        { id: "op-3", name: "Suresh Patil", employeeCode: "OP-003", shiftId: "shift-a" },
      ]);
      (mockDb.sfAssignment.findMany as any).mockResolvedValueOnce([
        { operatorId: "op-1", status: "accepted" },
        { operatorId: "op-1", status: "accepted" },
        { operatorId: "op-1", status: "accepted" },
        { operatorId: "op-1", status: "accepted" },
        { operatorId: "op-2", status: "accepted" },
        { operatorId: "op-3", status: "accepted" },
      ]);

      const req = new NextRequest("http://localhost:3011/api/workload?days=14");
      const res = await getWorkload(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.days).toBe(14);
      expect(json.data.median).toBe(1);
      expect(json.data.stats).toHaveLength(3);

      const op1Stat = json.data.stats.find((s: any) => s.operatorId === "op-1");
      expect(op1Stat.count).toBe(4);
      expect(op1Stat.isOverloaded).toBe(true); // 4 > 1.5 * 1 and 4 >= 3
    });
  });
});
