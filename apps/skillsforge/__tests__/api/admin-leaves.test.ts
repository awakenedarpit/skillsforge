import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as getAdminLeaves, PATCH as patchAdminLeaves } from "@/app/api/admin/leaves/route";
import { POST as postMemberLeave } from "@/app/api/member/leaves/route";
import { setSession, resetSession } from "../setup";

describe("Admin Leave Approvals API", () => {
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
    const req = new NextRequest("http://localhost:3011/api/admin/leaves");
    const res = await getAdminLeaves(req);
    expect(res.status).toBe(401);
  });

  it("returns all leave applications with operator details and summary counts", async () => {
    const req = new NextRequest("http://localhost:3011/api/admin/leaves");
    const res = await getAdminLeaves(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.leaves).toBeInstanceOf(Array);
    expect(json.data.summary).toBeDefined();
    expect(typeof json.data.summary.total).toBe("number");
    expect(typeof json.data.summary.pending).toBe("number");

    // Verify first leave has operator metadata
    if (json.data.leaves.length > 0) {
      const first = json.data.leaves[0];
      expect(first.operator).toBeDefined();
      expect(first.operator.name).toBeDefined();
      expect(first.operator.shiftCode).toBeDefined();
    }
  });

  it("forbids regular member from approving or rejecting leaves with 403", async () => {
    setSession({
      user: {
        id: "usr-vikas-3",
        email: "vikas.rao@skillsforge.quikit.io",
        name: "Vikas Rao",
        orgId: "org-demo-manufacturing",
        membershipRole: "member", // Member cannot approve
      },
      expires: "2099-01-01",
    });

    const req = new NextRequest("http://localhost:3011/api/admin/leaves", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leaveId: "leave-102",
        status: "APPROVED",
      }),
    });

    const res = await patchAdminLeaves(req);
    expect(res.status).toBe(403);
  });

  it("allows supervisor to approve a pending leave request", async () => {
    // First, submit a test leave request
    const postReq = new NextRequest("http://localhost:3011/api/member/leaves", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operatorId: "op-001",
        leaveType: "CASUAL",
        startDate: "2026-11-01",
        endDate: "2026-11-02",
        reason: "Personal work",
      }),
    });
    const postRes = await postMemberLeave(postReq);
    const postJson = await postRes.json();
    const createdId = postJson.data.id;

    // Now approve it as supervisor
    const patchReq = new NextRequest("http://localhost:3011/api/admin/leaves", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leaveId: createdId,
        status: "APPROVED",
        notes: "Approved by Shift A supervisor",
      }),
    });

    const patchRes = await patchAdminLeaves(patchReq);
    const patchJson = await patchRes.json();

    expect(patchRes.status).toBe(200);
    expect(patchJson.success).toBe(true);
    expect(patchJson.data.status).toBe("APPROVED");
    expect(patchJson.data.reviewedBy).toBe("Rohit Kulkarni");
  });

  it("allows supervisor to reject a pending leave request", async () => {
    // First, submit a test leave request
    const postReq = new NextRequest("http://localhost:3011/api/member/leaves", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operatorId: "op-002",
        leaveType: "ANNUAL",
        startDate: "2026-12-01",
        endDate: "2026-12-05",
        reason: "Holiday trip",
      }),
    });
    const postRes = await postMemberLeave(postReq);
    const postJson = await postRes.json();
    const createdId = postJson.data.id;

    // Now reject it as supervisor
    const patchReq = new NextRequest("http://localhost:3011/api/admin/leaves", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leaveId: createdId,
        status: "REJECTED",
        notes: "Peak production week, cannot grant leave",
      }),
    });

    const patchRes = await patchAdminLeaves(patchReq);
    const patchJson = await patchRes.json();

    expect(patchRes.status).toBe(200);
    expect(patchJson.success).toBe(true);
    expect(patchJson.data.status).toBe("REJECTED");
  });
});
