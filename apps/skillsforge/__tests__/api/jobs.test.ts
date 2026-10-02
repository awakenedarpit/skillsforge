import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as postExpiryCheck } from "@/app/api/jobs/expiry-check/route";
import { GET as getJobRuns } from "@/app/api/jobs/runs/route";
import { setSession, resetSession } from "../setup";
import { mockDb } from "../helpers/mockDb";

describe("Jobs API Routes", () => {
  beforeEach(() => {
    resetSession();
  });

  describe("POST /api/jobs/expiry-check", () => {
    it("returns 401 unauthenticated when no session and no internal secret", async () => {
      setSession(null);
      const req = new NextRequest("http://localhost:3011/api/jobs/expiry-check", {
        method: "POST",
      });
      const res = await postExpiryCheck(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
    });

    it("returns 403 forbidden for member/viewer role", async () => {
      setSession({
        user: {
          id: "usr-3",
          email: "vikas.rao@skillsforge.quikit.io",
          name: "Vikas Rao",
          orgId: "org-demo-1",
          membershipRole: "member", // Read-only member
        },
        expires: "2099-01-01",
      });

      const req = new NextRequest("http://localhost:3011/api/jobs/expiry-check", {
        method: "POST",
      });
      const res = await postExpiryCheck(req);
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.success).toBe(false);
      expect(json.error).toContain("Forbidden");
    });

    it("allows app_admin supervisor and returns 201 Created", async () => {
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

      (mockDb.sfOperatorSkill.findMany as any).mockResolvedValueOnce([]);
      (mockDb.sfAlert.findMany as any).mockResolvedValueOnce([]);
      (mockDb.sfJobRun.create as any).mockResolvedValueOnce({
        id: "job-1",
        status: "ok",
      });
      (mockDb.auditLog.create as any).mockResolvedValueOnce({ id: "audit-1" });

      const req = new NextRequest("http://localhost:3011/api/jobs/expiry-check", {
        method: "POST",
        body: JSON.stringify({ asOf: "2026-10-02" }),
      });
      const res = await postExpiryCheck(req);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.data.asOfDate).toBe("2026-10-02");
    });

    it("allows execution via valid x-internal-secret header", async () => {
      setSession(null); // No user session

      (mockDb.sfOperatorSkill.findMany as any).mockResolvedValueOnce([]);
      (mockDb.sfAlert.findMany as any).mockResolvedValueOnce([]);
      (mockDb.sfJobRun.create as any).mockResolvedValueOnce({
        id: "job-2",
        status: "ok",
      });

      const req = new NextRequest("http://localhost:3011/api/jobs/expiry-check", {
        method: "POST",
        headers: {
          "x-internal-secret": process.env.INTERNAL_SECRET || "shared-secret-for-internal-calls",
        },
      });
      const res = await postExpiryCheck(req);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
    });
  });

  describe("GET /api/jobs/runs", () => {
    it("returns 401 unauthenticated when no session exists", async () => {
      setSession(null);
      const req = new NextRequest("http://localhost:3011/api/jobs/runs");
      const res = await getJobRuns(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
    });

    it("returns paginated job runs filtered by orgId", async () => {
      (mockDb.sfJobRun.count as any).mockResolvedValueOnce(1);
      (mockDb.sfJobRun.findMany as any).mockResolvedValueOnce([
        {
          id: "run-1",
          jobName: "expiry_check",
          triggeredBy: "scheduler",
          asOfDate: new Date("2026-10-02"),
          startedAt: new Date(),
          finishedAt: new Date(),
          status: "ok",
          flaggedTotal: 6,
          newlyFlagged: 0,
          resolvedCount: 0,
          errorMessage: null,
        },
      ]);

      const req = new NextRequest("http://localhost:3011/api/jobs/runs?page=1&limit=10");
      const res = await getJobRuns(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.data).toHaveLength(1);
      expect(json.data.pagination.total).toBe(1);
      expect(json.data.pagination.page).toBe(1);

      expect(mockDb.sfJobRun.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ orgId: "org-demo-1" }),
        })
      );
    });
  });
});
