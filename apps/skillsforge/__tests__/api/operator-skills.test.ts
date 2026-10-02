import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { PATCH as updateCell, DELETE as deleteCell } from "@/app/api/operator-skills/route";
import { setSession, resetSession } from "../setup";
import { mockDb } from "../helpers/mockDb";

describe("Operator Skills API Routes", () => {
  beforeEach(() => {
    resetSession();
  });

  describe("PATCH /api/operator-skills", () => {
    it("returns 401 unauthenticated when no session exists", async () => {
      setSession(null);
      const req = new NextRequest("http://localhost:3011/api/operator-skills", {
        method: "PATCH",
        body: JSON.stringify({ operatorId: "op-001", skillId: "sk-cnc-l1", level: 3 }),
      });
      const res = await updateCell(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.error).toBe("Unauthenticated");
    });

    it("returns 403 when user is read-only member", async () => {
      setSession({
        user: {
          id: "usr-member-1",
          orgId: "org-demo-1",
          membershipRole: "member",
        },
      });

      const req = new NextRequest("http://localhost:3011/api/operator-skills", {
        method: "PATCH",
        body: JSON.stringify({ operatorId: "op-001", skillId: "sk-cnc-l1", level: 3 }),
      });
      const res = await updateCell(req);
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.success).toBe(false);
      expect(json.error).toContain("insufficient permissions");
    });

    it("returns 400 when level exceeds 4 (Zod validation)", async () => {
      setSession({
        user: {
          id: "usr-admin-1",
          orgId: "org-demo-1",
          membershipRole: "app_admin",
        },
      });

      const req = new NextRequest("http://localhost:3011/api/operator-skills", {
        method: "PATCH",
        body: JSON.stringify({ operatorId: "op-001", skillId: "sk-cnc-l1", level: 5 }),
      });
      const res = await updateCell(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toBeDefined();
    });

    it("updates cell in transaction, writes history, and returns updated cell", async () => {
      setSession({
        user: {
          id: "usr-supervisor-1",
          name: "Rohit Kulkarni",
          orgId: "org-demo-1",
          membershipRole: "app_admin",
        },
      });

      // Operator & machine existence checks
      (mockDb.sfOperator.findFirst as any).mockResolvedValueOnce({ id: "op-001", orgId: "org-demo-1" });
      (mockDb.sfSkill.findFirst as any).mockResolvedValueOnce({ id: "sk-cnc-l1", orgId: "org-demo-1" });

      // Transaction mock
      (mockDb.$transaction as any).mockImplementationOnce(async (cb: any) => {
        const txMock = {
          sfOperatorSkill: {
            findFirst: vi.fn().mockResolvedValue({ level: 2, issuedOn: null, certifiedUntil: null }),
            upsert: vi.fn().mockResolvedValue({
              id: "os-001",
              orgId: "org-demo-1",
              operatorId: "op-001",
              skillId: "sk-cnc-l1",
              level: 3,
              issuedOn: new Date("2026-01-01"),
              certifiedUntil: new Date("2027-01-01"),
            }),
          },
          sfSkillHistory: {
            create: vi.fn().mockResolvedValue({ id: "hist-001" }),
          },
          sfAlert: {
            upsert: vi.fn().mockResolvedValue({ id: "alert-001" }),
            updateMany: vi.fn().mockResolvedValue({ count: 0 }),
          },
        };
        return cb(txMock);
      });

      const req = new NextRequest("http://localhost:3011/api/operator-skills", {
        method: "PATCH",
        body: JSON.stringify({
          operatorId: "op-001",
          skillId: "sk-cnc-l1",
          level: 3,
          issuedOn: "2026-01-01",
          certifiedUntil: "2027-01-01",
          reason: "Passed proficiency assessment",
        }),
      });

      const res = await updateCell(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.cell.level).toBe(3);
      expect(json.data.cell.effectiveLevel).toBe(3);
    });
  });

  describe("DELETE /api/operator-skills", () => {
    it("deletes skill record and resolves alerts in transaction", async () => {
      setSession({
        user: {
          id: "usr-admin-1",
          name: "Rohit Kulkarni",
          orgId: "org-demo-1",
          membershipRole: "app_admin",
        },
      });

      (mockDb.sfOperatorSkill.findFirst as any).mockResolvedValueOnce({
        id: "os-001",
        orgId: "org-demo-1",
        operatorId: "op-001",
        skillId: "sk-cnc-l1",
        level: 2,
      });

      (mockDb.$transaction as any).mockImplementationOnce(async (cb: any) => {
        const txMock = {
          sfSkillHistory: { create: vi.fn().mockResolvedValue({ id: "hist-del" }) },
          sfOperatorSkill: { deleteMany: vi.fn().mockResolvedValue({ count: 1 }) },
          sfAlert: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
        };
        return cb(txMock);
      });

      const req = new NextRequest(
        "http://localhost:3011/api/operator-skills?operatorId=op-001&skillId=sk-cnc-l1",
        { method: "DELETE" }
      );

      const res = await deleteCell(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.deleted).toBe(true);
    });
  });
});
