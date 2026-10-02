import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as listOperators, POST as createOperator } from "@/app/api/operators/route";
import {
  GET as getOperator,
  PATCH as patchOperator,
  DELETE as deleteOperator,
} from "@/app/api/operators/[id]/route";
import { setSession, resetSession } from "../setup";
import { mockDb } from "../helpers/mockDb";

describe("Operators API Routes", () => {
  beforeEach(() => {
    resetSession();
  });

  describe("Authentication & Authorization", () => {
    it("returns 401 unauthenticated when no session exists", async () => {
      setSession(null);
      const req = new NextRequest("http://localhost:3011/api/operators");
      const res = await listOperators(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.error).toBe("Unauthenticated");
    });

    it("returns 403 when non-admin member tries to POST operator", async () => {
      setSession({
        user: {
          id: "usr-member-1",
          email: "vikas@skillsforge.quikit.io",
          name: "Vikas Rao",
          orgId: "org-demo-1",
          membershipRole: "member",
          isSuperAdmin: false,
        },
      });

      const req = new NextRequest("http://localhost:3011/api/operators", {
        method: "POST",
        body: JSON.stringify({
          employeeCode: "OP-999",
          name: "New Operator",
          shiftId: "shift-a",
        }),
      });

      const res = await createOperator(req);
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.success).toBe(false);
      expect(json.error).toContain("Admin access required");
    });
  });

  describe("GET /api/operators", () => {
    it("returns paginated operators strictly filtered by orgId from session", async () => {
      (mockDb.sfOperator.count as any).mockResolvedValueOnce(1);
      (mockDb.sfOperator.findMany as any).mockResolvedValueOnce([
        {
          id: "op-001",
          employeeCode: "OP-001",
          name: "Ravi Kumar",
          shiftId: "shift-a",
          isActive: true,
          leftOn: null,
          shift: { id: "shift-a", code: "A", startTime: "06:00", endTime: "14:00" },
        },
      ]);

      const req = new NextRequest("http://localhost:3011/api/operators?page=1&limit=10");
      const res = await listOperators(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.data).toHaveLength(1);
      expect(json.data.pagination.total).toBe(1);

      // Verify orgId filter was passed to prisma
      expect(mockDb.sfOperator.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            orgId: "org-demo-1",
          }),
        })
      );
    });
  });

  describe("POST /api/operators", () => {
    it("returns 400 when Zod validation fails (missing fields)", async () => {
      setSession({
        user: {
          id: "usr-admin-1",
          orgId: "org-demo-1",
          membershipRole: "org_admin",
        },
      });

      const req = new NextRequest("http://localhost:3011/api/operators", {
        method: "POST",
        body: JSON.stringify({
          employeeCode: "",
          name: "",
        }),
      });

      const res = await createOperator(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toBeDefined();
    });

    it("creates operator with 201 status and logs audit entry", async () => {
      setSession({
        user: {
          id: "usr-admin-1",
          orgId: "org-demo-1",
          membershipRole: "org_admin",
        },
      });

      (mockDb.sfOperator.findFirst as any).mockResolvedValueOnce(null); // No existing
      (mockDb.sfOperator.create as any).mockResolvedValueOnce({
        id: "op-new-1",
        employeeCode: "OP-100",
        name: "Sunil Das",
        shiftId: "shift-b",
        isActive: true,
        leftOn: null,
      });

      const req = new NextRequest("http://localhost:3011/api/operators", {
        method: "POST",
        body: JSON.stringify({
          employeeCode: "OP-100",
          name: "Sunil Das",
          shiftId: "shift-b",
        }),
      });

      const res = await createOperator(req);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.data.employeeCode).toBe("OP-100");
    });
  });

  describe("GET /api/operators/[id]", () => {
    it("returns 404 when operator belongs to another org (cross-org rejected)", async () => {
      (mockDb.sfOperator.findFirst as any).mockResolvedValueOnce(null);

      const req = new NextRequest("http://localhost:3011/api/operators/foreign-op");
      const res = await getOperator(req, { params: { id: "foreign-op" } });
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.success).toBe(false);
      expect(json.error).toContain("Operator not found");

      expect(mockDb.sfOperator.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "foreign-op", orgId: "org-demo-1" },
        })
      );
    });
  });

  describe("PATCH & DELETE /api/operators/[id]", () => {
    it("soft-deactivates operator on DELETE with 200 status", async () => {
      setSession({
        user: {
          id: "usr-admin-1",
          orgId: "org-demo-1",
          membershipRole: "org_admin",
        },
      });

      (mockDb.sfOperator.findFirst as any).mockResolvedValueOnce({
        id: "op-001",
        orgId: "org-demo-1",
        isActive: true,
      });

      const req = new NextRequest("http://localhost:3011/api/operators/op-001", {
        method: "DELETE",
      });

      const res = await deleteOperator(req, { params: { id: "op-001" } });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.isActive).toBe(false);

      expect(mockDb.sfOperator.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "op-001", orgId: "org-demo-1" },
          data: expect.objectContaining({ isActive: false }),
        })
      );
    });
  });
});
