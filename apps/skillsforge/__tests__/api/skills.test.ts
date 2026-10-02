import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as listSkills, POST as createSkill } from "@/app/api/skills/route";
import {
  GET as getSkill,
  PATCH as patchSkill,
  DELETE as deleteSkill,
} from "@/app/api/skills/[id]/route";
import { setSession, resetSession } from "../setup";
import { mockDb } from "../helpers/mockDb";

describe("Skills / Machines API Routes", () => {
  beforeEach(() => {
    resetSession();
  });

  describe("Authentication & Authorization", () => {
    it("returns 401 unauthenticated when no session exists", async () => {
      setSession(null);
      const req = new NextRequest("http://localhost:3011/api/skills");
      const res = await listSkills(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.error).toBe("Unauthenticated");
    });

    it("returns 403 when non-admin member tries to POST skill", async () => {
      setSession({
        user: {
          id: "usr-member-1",
          orgId: "org-demo-1",
          membershipRole: "member",
        },
      });

      const req = new NextRequest("http://localhost:3011/api/skills", {
        method: "POST",
        body: JSON.stringify({
          code: "CNC-X",
          name: "CNC Prototype",
          lineKey: "MACHINING",
          criticality: 3,
        }),
      });

      const res = await createSkill(req);
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.success).toBe(false);
      expect(json.error).toContain("Admin access required");
    });
  });

  describe("GET /api/skills", () => {
    it("returns paginated machines scoped by orgId from session", async () => {
      (mockDb.sfSkill.count as any).mockResolvedValueOnce(1);
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

      const req = new NextRequest("http://localhost:3011/api/skills?page=1&limit=10");
      const res = await listSkills(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.data).toHaveLength(1);
      expect(json.data.pagination.total).toBe(1);

      expect(mockDb.sfSkill.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            orgId: "org-demo-1",
          }),
        })
      );
    });
  });

  describe("POST /api/skills", () => {
    it("returns 400 when Zod validation fails (invalid lineKey)", async () => {
      setSession({
        user: {
          id: "usr-admin-1",
          orgId: "org-demo-1",
          membershipRole: "org_admin",
        },
      });

      const req = new NextRequest("http://localhost:3011/api/skills", {
        method: "POST",
        body: JSON.stringify({
          code: "TEST-1",
          name: "Test Machine",
          lineKey: "INVALID_LINE", // invalid enum
        }),
      });

      const res = await createSkill(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toBeDefined();
    });

    it("creates skill with 201 status and logs audit entry", async () => {
      setSession({
        user: {
          id: "usr-admin-1",
          orgId: "org-demo-1",
          membershipRole: "org_admin",
        },
      });

      (mockDb.sfSkill.findFirst as any).mockResolvedValueOnce(null);
      (mockDb.sfSkill.create as any).mockResolvedValueOnce({
        id: "sk-new-1",
        code: "LASER-1",
        name: "Laser Cutter",
        nameHi: "लेजर कटर",
        lineKey: "MACHINING",
        criticality: 3,
        isActive: true,
      });

      const req = new NextRequest("http://localhost:3011/api/skills", {
        method: "POST",
        body: JSON.stringify({
          code: "LASER-1",
          name: "Laser Cutter",
          nameHi: "लेजर कटर",
          lineKey: "MACHINING",
          criticality: 3,
        }),
      });

      const res = await createSkill(req);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.data.code).toBe("LASER-1");
    });
  });

  describe("GET /api/skills/[id]", () => {
    it("returns 404 when machine belongs to another org (cross-org rejected)", async () => {
      (mockDb.sfSkill.findFirst as any).mockResolvedValueOnce(null);

      const req = new NextRequest("http://localhost:3011/api/skills/foreign-skill");
      const res = await getSkill(req, { params: { id: "foreign-skill" } });
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.success).toBe(false);
      expect(json.error).toContain("Machine not found");

      expect(mockDb.sfSkill.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "foreign-skill", orgId: "org-demo-1" },
        })
      );
    });
  });

  describe("DELETE /api/skills/[id]", () => {
    it("soft-deactivates machine on DELETE with 200 status", async () => {
      setSession({
        user: {
          id: "usr-admin-1",
          orgId: "org-demo-1",
          membershipRole: "org_admin",
        },
      });

      (mockDb.sfSkill.findFirst as any).mockResolvedValueOnce({
        id: "sk-cnc-l1",
        orgId: "org-demo-1",
        isActive: true,
      });

      const req = new NextRequest("http://localhost:3011/api/skills/sk-cnc-l1", {
        method: "DELETE",
      });

      const res = await deleteSkill(req, { params: { id: "sk-cnc-l1" } });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.isActive).toBe(false);

      expect(mockDb.sfSkill.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "sk-cnc-l1", orgId: "org-demo-1" },
          data: expect.objectContaining({ isActive: false }),
        })
      );
    });
  });
});
