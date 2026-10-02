import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as getShifts, POST as createShift } from "@/app/api/shifts/route";
import { PATCH as updateShift, DELETE as deleteShift } from "@/app/api/shifts/[id]/route";
import { setSession, resetSession } from "../setup";
import { mockDb } from "../helpers/mockDb";

describe("Shifts API Routes", () => {
  beforeEach(() => {
    resetSession();
  });

  describe("GET /api/shifts", () => {
    it("returns 401 unauthenticated when no session exists", async () => {
      setSession(null);
      const req = new NextRequest("http://localhost:3011/api/shifts");
      const res = await getShifts(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
    });

    it("returns shifts for authenticated organization", async () => {
      (mockDb.sfShift.findMany as any).mockResolvedValueOnce([
        { id: "shift-a", code: "A", name: "Morning", startTime: "06:00", endTime: "14:00" },
        { id: "shift-b", code: "B", name: "Afternoon", startTime: "14:00", endTime: "22:00" },
      ]);

      const req = new NextRequest("http://localhost:3011/api/shifts");
      const res = await getShifts(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data).toHaveLength(2);
      expect(mockDb.sfShift.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ orgId: "org-demo-1" }),
        })
      );
    });
  });

  describe("POST /api/shifts", () => {
    it("returns 403 forbidden for non-admin member", async () => {
      setSession({
        user: {
          id: "usr-member",
          email: "member@skillsforge.quikit.io",
          name: "Member User",
          orgId: "org-demo-1",
          membershipRole: "member",
        },
        expires: "2099-01-01",
      });

      const req = new NextRequest("http://localhost:3011/api/shifts", {
        method: "POST",
        body: JSON.stringify({
          code: "D",
          name: "Night",
          startTime: "22:00",
          endTime: "06:00",
        }),
      });

      const res = await createShift(req);
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.success).toBe(false);
    });

    it("creates shift successfully for org_admin with valid payload", async () => {
      setSession({
        user: {
          id: "usr-admin",
          email: "admin@skillsforge.quikit.io",
          name: "Admin User",
          orgId: "org-demo-1",
          membershipRole: "org_admin",
        },
        expires: "2099-01-01",
      });

      (mockDb.sfShift.findFirst as any).mockResolvedValueOnce(null); // No conflict
      (mockDb.sfShift.create as any).mockResolvedValueOnce({
        id: "shift-d",
        code: "D",
        name: "General",
        startTime: "09:00",
        endTime: "18:00",
      });
      (mockDb.auditLog.create as any).mockResolvedValueOnce({ id: "audit-1" });

      const req = new NextRequest("http://localhost:3011/api/shifts", {
        method: "POST",
        body: JSON.stringify({
          code: "D",
          name: "General",
          startTime: "09:00",
          endTime: "18:00",
        }),
      });

      const res = await createShift(req);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.data.code).toBe("D");
    });

    it("returns 409 conflict when shift code already exists in org", async () => {
      setSession({
        user: {
          id: "usr-admin",
          email: "admin@skillsforge.quikit.io",
          name: "Admin User",
          orgId: "org-demo-1",
          membershipRole: "org_admin",
        },
        expires: "2099-01-01",
      });

      (mockDb.sfShift.findFirst as any).mockResolvedValueOnce({ id: "existing-a", code: "A" });

      const req = new NextRequest("http://localhost:3011/api/shifts", {
        method: "POST",
        body: JSON.stringify({
          code: "A",
          name: "Duplicate Shift",
          startTime: "06:00",
          endTime: "14:00",
        }),
      });

      const res = await createShift(req);
      const json = await res.json();

      expect(res.status).toBe(409);
      expect(json.error).toContain("already exists");
    });
  });

  describe("DELETE /api/shifts/[id]", () => {
    it("returns 409 conflict when shift is referenced by assignments", async () => {
      setSession({
        user: {
          id: "usr-admin",
          email: "admin@skillsforge.quikit.io",
          name: "Admin User",
          orgId: "org-demo-1",
          membershipRole: "org_admin",
        },
        expires: "2099-01-01",
      });

      (mockDb.sfShift.findFirst as any).mockResolvedValueOnce({ id: "shift-a", code: "A" });
      (mockDb.sfAssignment.count as any).mockResolvedValueOnce(5); // 5 assignments reference this shift

      const req = new NextRequest("http://localhost:3011/api/shifts/shift-a", {
        method: "DELETE",
      });

      const res = await deleteShift(req, { params: { id: "shift-a" } });
      const json = await res.json();

      expect(res.status).toBe(409);
      expect(json.success).toBe(false);
      expect(json.error).toContain("referenced by existing assignments");
    });

    it("successfully deletes unreferenced shift", async () => {
      setSession({
        user: {
          id: "usr-admin",
          email: "admin@skillsforge.quikit.io",
          name: "Admin User",
          orgId: "org-demo-1",
          membershipRole: "org_admin",
        },
        expires: "2099-01-01",
      });

      (mockDb.sfShift.findFirst as any).mockResolvedValueOnce({ id: "shift-unref", code: "U" });
      (mockDb.sfAssignment.count as any).mockResolvedValueOnce(0);
      (mockDb.sfOperator.count as any).mockResolvedValueOnce(0);
      (mockDb.sfShift.delete as any).mockResolvedValueOnce({ id: "shift-unref" });
      (mockDb.auditLog.create as any).mockResolvedValueOnce({ id: "audit-2" });

      const req = new NextRequest("http://localhost:3011/api/shifts/shift-unref", {
        method: "DELETE",
      });

      const res = await deleteShift(req, { params: { id: "shift-unref" } });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.id).toBe("shift-unref");
    });
  });
});
