import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as getAlerts } from "@/app/api/alerts/route";
import { setSession, resetSession } from "../setup";
import { mockDb } from "../helpers/mockDb";

describe("Alerts API Routes", () => {
  beforeEach(() => {
    resetSession();
  });

  describe("GET /api/alerts", () => {
    it("returns 401 unauthenticated when no session exists", async () => {
      setSession(null);
      const req = new NextRequest("http://localhost:3011/api/alerts");
      const res = await getAlerts(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.error).toBe("Unauthenticated");
    });

    it("returns open alerts filtered by orgId with recomputed daysRemaining", async () => {
      // Mock recent job run to avoid catch-up trigger
      (mockDb.sfJobRun.findFirst as any).mockResolvedValueOnce({
        id: "run-recent",
        startedAt: new Date(),
        status: "ok",
      });

      (mockDb.sfAlert.findMany as any).mockResolvedValueOnce([
        {
          id: "alert-1",
          operatorId: "op-1",
          skillId: "sk-qa-8",
          certifiedUntil: new Date("2026-10-11"), // 9 days from 2026-10-02
          severity: "warning",
          daysRemaining: 15,
          status: "open",
          firstFlaggedAt: new Date("2026-09-25"),
          lastCheckedAt: new Date("2026-10-01"),
          resolvedAt: null,
          resolvedReason: null,
          operator: {
            id: "op-1",
            employeeCode: "OP-001",
            name: "Ravi Kumar",
            shiftId: "shift-a",
          },
          skill: {
            id: "sk-qa-8",
            code: "QA-8",
            name: "CMM Inspection",
            nameHi: "सीएमएम निरीक्षण",
          },
        },
      ]);

      const req = new NextRequest("http://localhost:3011/api/alerts?status=open");
      const res = await getAlerts(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data).toHaveLength(1);
      expect(json.data[0].daysRemaining).toBe(9);
      expect(json.data[0].severity).toBe("warning"); // 9 days is in 8-14 days warning bracket

      expect(mockDb.sfAlert.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ orgId: "org-demo-1", status: "open" }),
        })
      );
    });
  });
});
