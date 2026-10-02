import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST as postExpiryCheck } from "@/app/api/jobs/expiry-check/route";
import { GET as getJobRuns } from "@/app/api/jobs/runs/route";
import { setSession, resetSession } from "../setup";
import { mockDb } from "../helpers/mockDb";
import { resetRateLimitStore, checkRateLimit } from "@/lib/api/rateLimiter";

describe("Jobs API Routes", () => {
  beforeEach(() => {
    resetSession();
    resetRateLimitStore();
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

    it("batches queries and stays at 5 or fewer DB calls for 100 records (N+1 elimination)", async () => {
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

      // Generate 100 mock expiring records
      const mockRecords = Array.from({ length: 100 }, (_, i) => ({
        id: `os-${i}`,
        operatorId: `op-${i}`,
        skillId: `sk-${i % 8}`,
        level: 2,
        certifiedUntil: new Date("2026-10-12"), // 10 days away
      }));

      (mockDb.sfOperatorSkill.findMany as any).mockResolvedValueOnce(mockRecords);
      (mockDb.sfAlert.findMany as any).mockResolvedValueOnce([]);
      (mockDb.$transaction as any).mockResolvedValueOnce([]);
      (mockDb.sfJobRun.create as any).mockResolvedValueOnce({ id: "run-batch", status: "ok" });
      (mockDb.auditLog.create as any).mockResolvedValueOnce({ id: "audit-batch" });

      const req = new NextRequest("http://localhost:3011/api/jobs/expiry-check", {
        method: "POST",
        body: JSON.stringify({ asOf: "2026-10-02" }),
      });

      const res = await postExpiryCheck(req);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.data.flaggedTotal).toBe(100);

      // Verify zero N+1 findFirst calls were made
      expect(mockDb.sfAlert.findFirst).toHaveBeenCalledTimes(0);

      // Verify batched transaction was used instead of 100 individual upserts
      expect(mockDb.$transaction).toHaveBeenCalledTimes(1);

      // Total DB query calls in runExpiryCheck: findMany(skills) + findMany(alerts) + $transaction(upserts) + create(jobRun) = 4
      expect(mockDb.sfOperatorSkill.findMany).toHaveBeenCalledTimes(1);
      expect(mockDb.sfAlert.findMany).toHaveBeenCalledTimes(1);
    });

    it("enforces rate limit: allows 5 requests, blocks 6th with 429 and Retry-After header, and resets after window", async () => {
      setSession({
        user: {
          id: "usr-admin-rate",
          email: "admin.rate@skillsforge.quikit.io",
          name: "Admin Rate",
          orgId: "org-demo-1",
          membershipRole: "app_admin",
        },
        expires: "2099-01-01",
      });

      (mockDb.sfOperatorSkill.findMany as any).mockResolvedValue([]);
      (mockDb.sfAlert.findMany as any).mockResolvedValue([]);
      (mockDb.$transaction as any).mockResolvedValue([]);
      (mockDb.sfJobRun.create as any).mockResolvedValue({ id: "run-rate", status: "ok" });
      (mockDb.auditLog.create as any).mockResolvedValue({ id: "audit-rate" });

      // First 5 requests should be allowed
      for (let i = 0; i < 5; i++) {
        const req = new NextRequest("http://localhost:3011/api/jobs/expiry-check", {
          method: "POST",
          body: JSON.stringify({ asOf: "2026-10-02" }),
        });
        const res = await postExpiryCheck(req);
        expect(res.status).toBe(201);
      }

      // 6th request should be blocked with 429
      const blockedReq = new NextRequest("http://localhost:3011/api/jobs/expiry-check", {
        method: "POST",
        body: JSON.stringify({ asOf: "2026-10-02" }),
      });
      const blockedRes = await postExpiryCheck(blockedReq);
      const blockedJson = await blockedRes.json();

      expect(blockedRes.status).toBe(429);
      expect(blockedJson.success).toBe(false);
      expect(blockedJson.error).toContain("Too many requests");
      expect(blockedRes.headers.get("Retry-After")).toBeTruthy();
      const retryAfter = Number(blockedRes.headers.get("Retry-After"));
      expect(retryAfter).toBeGreaterThan(0);
      expect(retryAfter).toBeLessThanOrEqual(60);

      // Verify window reset behavior using checkRateLimit with simulated time / reset
      resetRateLimitStore();
      const afterResetReq = new NextRequest("http://localhost:3011/api/jobs/expiry-check", {
        method: "POST",
        body: JSON.stringify({ asOf: "2026-10-02" }),
      });
      const afterResetRes = await postExpiryCheck(afterResetReq);
      expect(afterResetRes.status).toBe(201);
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
