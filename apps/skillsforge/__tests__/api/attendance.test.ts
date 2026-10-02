import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as getAttendance, PATCH as patchAttendance } from "@/app/api/attendance/route";
import { POST as syncBiometric } from "@/app/api/attendance/sync-biometric/route";
import { setSession, resetSession } from "../setup";

describe("Attendance & Biometric Sync API", () => {
  beforeEach(() => {
    resetSession();
    // Default session as Rohit Kulkarni (app_admin supervisor)
    setSession({
      user: {
        id: "usr-rohit-2",
        email: "rohit.kulkarni@skillsforge.quikit.io",
        name: "Rohit Kulkarni",
        orgId: "org-demo-manufacturing",
        membershipRole: "app_admin",
      },
      expires: "2099-01-01",
    });
  });

  it("returns 401 unauthenticated when no session exists", async () => {
    setSession(null);
    const req = new NextRequest("http://localhost:3011/api/attendance");
    const res = await getAttendance(req);
    expect(res.status).toBe(401);
  });

  it("returns all operator attendance records with summary counts", async () => {
    const req = new NextRequest("http://localhost:3011/api/attendance");
    const res = await getAttendance(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.records).toBeInstanceOf(Array);
    expect(json.data.records.length).toBeGreaterThan(0);
    expect(json.data.summary).toBeDefined();
    expect(typeof json.data.summary.total).toBe("number");
    expect(typeof json.data.summary.present).toBe("number");
    expect(typeof json.data.summary.absent).toBe("number");
    expect(typeof json.data.summary.biometricRate).toBe("number");

    // Check operator metadata attached
    const first = json.data.records[0];
    expect(first.operator).toBeDefined();
    expect(first.operator.name).toBeDefined();
    expect(first.operator.shiftCode).toBeDefined();
  });

  it("forbids regular member from updating attendance with 403", async () => {
    setSession({
      user: {
        id: "usr-vikas-3",
        email: "vikas.rao@skillsforge.quikit.io",
        name: "Vikas Rao",
        orgId: "org-demo-manufacturing",
        membershipRole: "member",
      },
      expires: "2099-01-01",
    });

    const req = new NextRequest("http://localhost:3011/api/attendance", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operatorId: "op-001",
        status: "ABSENT",
      }),
    });
    const res = await patchAttendance(req);
    expect(res.status).toBe(403);
  });

  it("allows supervisor to mark employee ABSENT", async () => {
    const req = new NextRequest("http://localhost:3011/api/attendance", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operatorId: "op-002",
        status: "ABSENT",
        notes: "Uninformed absence on morning shift",
      }),
    });
    const res = await patchAttendance(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.status).toBe("ABSENT");
    expect(json.data.operatorId).toBe("op-002");
    expect(json.data.punchInTime).toBeNull();
  });

  it("allows supervisor to mark employee PRESENT", async () => {
    const req = new NextRequest("http://localhost:3011/api/attendance", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operatorId: "op-005",
        status: "PRESENT",
        notes: "Gate RFID reader issue, manual supervisor confirmation",
      }),
    });
    const res = await patchAttendance(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.status).toBe("PRESENT");
    expect(json.data.operatorId).toBe("op-005");
  });

  it("syncs biometric attendance terminal records", async () => {
    const req = new NextRequest("http://localhost:3011/api/attendance/sync-biometric", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await syncBiometric(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.totalSynced).toBeGreaterThan(0);
    expect(json.data.device).toContain("BioStation");
    expect(json.data.syncedAt).toBeDefined();
  });
});
