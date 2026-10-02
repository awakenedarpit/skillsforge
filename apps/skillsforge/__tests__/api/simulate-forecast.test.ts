import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as getForecast } from "@/app/api/simulate/forecast/route";
import { setSession, resetSession } from "../setup";
import { mockDb } from "../helpers/mockDb";

describe("GET /api/simulate/forecast", () => {
  beforeEach(() => {
    resetSession();
  });

  it("returns 401 when unauthenticated", async () => {
    setSession(null);
    const req = new NextRequest("http://localhost:3011/api/simulate/forecast");
    const res = await getForecast(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.success).toBe(false);
  });

  it("returns 200 with forecast data for 30, 60, or 90 days horizon", async () => {
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

    mockDb.sfShift.findMany.mockResolvedValueOnce([
      { id: "shift-1", code: "A", startTime: "06:00", endTime: "14:00" },
    ] as any);

    mockDb.sfSkill.findMany.mockResolvedValueOnce([
      {
        id: "skill-1",
        code: "CNC-01",
        name: "CNC Turning",
        nameHi: "सीएनसी टर्निंग",
        lineKey: "LINE-1",
        criticality: 3,
        isActive: true,
      },
    ] as any);

    mockDb.sfOperator.findMany.mockResolvedValueOnce([
      {
        id: "op-1",
        name: "Ravi Kumar",
        employeeCode: "EMP-001",
        shiftId: "shift-1",
        isActive: true,
      },
    ] as any);

    mockDb.sfOperatorSkill.findMany.mockResolvedValueOnce([
      {
        operatorId: "op-1",
        skillId: "skill-1",
        level: 3,
        issuedOn: new Date("2026-01-01"),
        certifiedUntil: new Date("2026-10-25"),
      },
    ] as any);

    const req = new NextRequest("http://localhost:3011/api/simulate/forecast?horizon=60&asOf=2026-10-01");
    const res = await getForecast(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.horizonDays).toBe(60);
    expect(json.data.asOf).toBe("2026-10-01");
    expect(json.data.projectedDate).toBe("2026-11-30");
    expect(json.data.summary).toBeDefined();
  });

  it("returns 400 validation error for invalid horizon", async () => {
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

    const req = new NextRequest("http://localhost:3011/api/simulate/forecast?horizon=-5");
    const res = await getForecast(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
  });
});
