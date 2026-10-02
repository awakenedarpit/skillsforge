import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as getAuditLogs } from "@/app/api/audit-log/route";
import { setSession, resetSession } from "../setup";
import { mockDb } from "../helpers/mockDb";

describe("GET /api/audit-log", () => {
  beforeEach(() => {
    resetSession();
  });

  it("returns 401 unauthenticated when no session exists", async () => {
    setSession(null);
    const req = new NextRequest("http://localhost:3011/api/audit-log");
    const res = await getAuditLogs(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.success).toBe(false);
  });

  it("returns 403 forbidden for regular member role", async () => {
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

    const req = new NextRequest("http://localhost:3011/api/audit-log");
    const res = await getAuditLogs(req);
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.success).toBe(false);
    expect(json.error).toContain("Admin access required");
  });

  it("returns paginated audit logs for admin role with org scoping", async () => {
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

    (mockDb.auditLog.count as any).mockResolvedValueOnce(1);
    (mockDb.auditLog.findMany as any).mockResolvedValueOnce([
      {
        id: "log-1",
        actorId: "usr-admin",
        actorRole: "org_admin",
        action: "UPDATE",
        entityType: "operator_skill",
        entityId: "rec-1",
        changesJson: '["level"]',
        reason: "Annual evaluation",
        createdAt: new Date("2026-10-02T10:00:00Z"),
      },
    ]);

    const req = new NextRequest("http://localhost:3011/api/audit-log?page=1&limit=20");
    const res = await getAuditLogs(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.items).toHaveLength(1);
    expect(json.data.pagination.total).toBe(1);
    expect(json.data.pagination.page).toBe(1);

    expect(mockDb.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ orgId: "org-demo-1" }),
      })
    );
  });

  it("applies action, entityType, and date range filters correctly", async () => {
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

    (mockDb.auditLog.count as any).mockResolvedValueOnce(0);
    (mockDb.auditLog.findMany as any).mockResolvedValueOnce([]);

    const req = new NextRequest(
      "http://localhost:3011/api/audit-log?action=CREATE&entityType=shift&startDate=2026-01-01&endDate=2026-10-02"
    );
    const res = await getAuditLogs(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(mockDb.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          orgId: "org-demo-1",
          action: "CREATE",
          entityType: "shift",
          createdAt: expect.objectContaining({
            gte: expect.any(Date),
            lte: expect.any(Date),
          }),
        }),
      })
    );
  });
});
