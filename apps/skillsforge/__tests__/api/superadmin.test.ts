import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as getSuperadminOrgs } from "@/app/api/superadmin/orgs/route";
import { setSession, resetSession } from "../setup";
import { mockDb } from "../helpers/mockDb";

describe("GET /api/superadmin/orgs", () => {
  beforeEach(() => {
    resetSession();
  });

  it("returns 401 unauthenticated when no session exists", async () => {
    setSession(null);
    const req = new NextRequest("http://localhost:3011/api/superadmin/orgs");
    const res = await getSuperadminOrgs(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.success).toBe(false);
  });

  it("returns 403 forbidden for regular admin who is not superadmin", async () => {
    setSession({
      user: {
        id: "usr-admin",
        email: "admin@skillsforge.quikit.io",
        name: "Org Admin",
        orgId: "org-demo-1",
        membershipRole: "org_admin",
        isSuperAdmin: false,
      },
      expires: "2099-01-01",
    });

    const req = new NextRequest("http://localhost:3011/api/superadmin/orgs");
    const res = await getSuperadminOrgs(req);
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.success).toBe(false);
    expect(json.error).toContain("Superadmin access required");
  });

  it("returns 403 forbidden for member role", async () => {
    setSession({
      user: {
        id: "usr-member",
        email: "member@skillsforge.quikit.io",
        name: "Regular Member",
        orgId: "org-demo-1",
        membershipRole: "member",
        isSuperAdmin: false,
      },
      expires: "2099-01-01",
    });

    const req = new NextRequest("http://localhost:3011/api/superadmin/orgs");
    const res = await getSuperadminOrgs(req);
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.success).toBe(false);
  });

  it("returns list of orgs with count summaries for superadmin", async () => {
    setSession({
      user: {
        id: "usr-superadmin",
        email: "superadmin@skillsforge.quikit.io",
        name: "Global Superadmin",
        orgId: "org-demo-1",
        membershipRole: "super_admin",
        isSuperAdmin: true,
      },
      expires: "2099-01-01",
    });

    (mockDb.org.findMany as any).mockResolvedValueOnce([
      {
        id: "org-demo-1",
        name: "Acme Auto Components",
        slug: "acme-auto",
        createdAt: new Date("2026-01-01"),
      },
    ]);
    (mockDb.sfOperator.count as any).mockResolvedValueOnce(15);
    (mockDb.sfSkill.count as any).mockResolvedValueOnce(8);
    (mockDb.sfShift.count as any).mockResolvedValueOnce(3);
    (mockDb.sfAlert.count as any).mockResolvedValueOnce(6);

    const req = new NextRequest("http://localhost:3011/api/superadmin/orgs");
    const res = await getSuperadminOrgs(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
    expect(json.data[0]).toMatchObject({
      id: "org-demo-1",
      name: "Acme Auto Components",
      operatorCount: 15,
      machineCount: 8,
      shiftCount: 3,
      openAlertsCount: 6,
    });
  });
});
