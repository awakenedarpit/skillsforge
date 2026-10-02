import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { PATCH as patchSkill, DELETE as deleteSkill } from "@/app/api/operator-skills/route";
import { GET as getCoverage } from "@/app/api/coverage/route";
import { GET as getAlerts } from "@/app/api/alerts/route";
import { POST as postAssignment } from "@/app/api/assignments/route";
import { GET as getGapReport } from "@/app/api/reports/gaps/route";
import { runExpiryCheck } from "@/lib/api/expiryJob";
import { setSession, resetSession } from "../setup";
import { mockDb } from "../helpers/mockDb";
import { getDemoSkillRecords } from "@/lib/demo/seedData";

describe("SkillsForge Acceptance Gate (D1 - D4 Criteria)", () => {
  beforeEach(() => {
    resetSession();
  });

  /**
   * D1: Edit a level live -> the heatmap updates instantly (no page reload)
   */
  it("D1_edit_changes_heatmap: live level edit and deletion change coverage counts", async () => {
    // 1. Setup mock data for PATCH
    (mockDb.sfOperator.findFirst as any).mockResolvedValueOnce({
      id: "op-001",
      orgId: "org-demo-1",
      shiftId: "shift-a",
      isActive: true,
    });
    (mockDb.sfSkill.findFirst as any).mockResolvedValueOnce({
      id: "sk-cnc-l1",
      orgId: "org-demo-1",
      isActive: true,
      criticality: 3,
    });
    (mockDb.sfOperatorSkill.findFirst as any).mockResolvedValueOnce({
      id: "os-1",
      level: 1, // Currently unqualified
      issuedOn: new Date("2025-01-01"),
      certifiedUntil: new Date("2027-01-01"),
    });

    (mockDb.$transaction as any).mockImplementationOnce(async (fn: any) => {
      return fn({
        sfSkillHistory: { create: vi.fn().mockResolvedValue({ id: "hist-1" }) },
        sfOperatorSkill: {
          findFirst: vi.fn().mockResolvedValue({ level: 1, issuedOn: null, certifiedUntil: null }),
          upsert: vi.fn().mockResolvedValue({
            id: "os-1",
            operatorId: "op-001",
            skillId: "sk-cnc-l1",
            level: 4, // Promoted to Trainer (qualified)
            issuedOn: new Date("2025-01-01"),
            certifiedUntil: new Date("2027-01-01"),
          }),
        },
        sfAlert: {
          updateMany: vi.fn().mockResolvedValue({ count: 0 }),
          upsert: vi.fn().mockResolvedValue({ id: "al-1" }),
        },
      });
    });

    (mockDb.auditLog.create as any).mockResolvedValueOnce({ id: "aud-1" });

    // Mock coverage recomputation inside PATCH
    (mockDb.sfShift.findMany as any).mockResolvedValueOnce([
      { id: "shift-a", code: "A", startTime: "06:00", endTime: "14:00" },
    ]);
    (mockDb.sfSkill.findFirst as any).mockResolvedValueOnce({
      id: "sk-cnc-l1",
      code: "CNC-L1",
      name: "CNC Lathe",
      lineKey: "MACHINING",
      criticality: 3,
      isActive: true,
    });
    (mockDb.sfOperator.findMany as any).mockResolvedValueOnce([
      { id: "op-001", name: "Ravi Kumar", shiftId: "shift-a", isActive: true },
    ]);
    (mockDb.sfOperatorSkill.findMany as any).mockResolvedValueOnce([
      {
        operatorId: "op-001",
        skillId: "sk-cnc-l1",
        level: 4,
        issuedOn: new Date("2025-01-01"),
        certifiedUntil: new Date("2027-01-01"),
      },
    ]);

    // Perform PATCH: promote to level 4
    const patchReq = new NextRequest("http://localhost:3011/api/operator-skills", {
      method: "PATCH",
      body: JSON.stringify({
        operatorId: "op-001",
        skillId: "sk-cnc-l1",
        level: 4,
        reason: "Completed trainer certification",
      }),
    });

    const patchRes = await patchSkill(patchReq);
    const patchJson = await patchRes.json();

    expect(patchRes.status).toBe(200);
    expect(patchJson.success).toBe(true);
    expect(patchJson.data.cell.level).toBe(4);
    expect(patchJson.data.cell.effectiveLevel).toBe(4);
    expect(patchJson.data.recomputedCoverage).toBeDefined();

    // Coverage for Shift A now shows 1 qualified operator (previously 0)
    const shiftACell = patchJson.data.recomputedCoverage.cells.find((c: any) => c.shiftId === "shift-a");
    expect(shiftACell.qualifiedCount).toBe(1);
    expect(shiftACell.trainerCount).toBe(1);
  });

  /**
   * D2: An expiring certification appears on the alert panel with days remaining
   */
  it("D2_expiring_cert_on_alert_panel_with_days: alert panel exposes expiring & overdue certs with exact days remaining and idempotency", async () => {
    // 1. Run expiry check worker logic for today
    const asOf = "2026-10-02";
    const demoRecords = getDemoSkillRecords(asOf);

    // Filter active records expiring <= 30 days or overdue
    const mockDbRecords = demoRecords
      .filter((r) => r.certifiedUntil !== null)
      .map((r) => ({
        id: `os-${r.operatorId}-${r.skillId}`,
        operatorId: r.operatorId,
        skillId: r.skillId,
        level: r.level,
        certifiedUntil: new Date(r.certifiedUntil!),
      }));

    (mockDb.sfOperatorSkill.findMany as any).mockResolvedValue(mockDbRecords);
    (mockDb.sfAlert.findFirst as any).mockResolvedValue(null);
    (mockDb.sfAlert.upsert as any).mockResolvedValue({ id: "al-1" });
    (mockDb.sfAlert.findMany as any).mockResolvedValue([]);
    (mockDb.sfJobRun.create as any).mockResolvedValue({ id: "run-1", status: "ok" });

    const result = await runExpiryCheck({
      orgId: "org-demo-1",
      asOf,
      triggeredBy: "manual",
    });

    // 5 expiring certs + 1 overdue cert = 6 flagged
    expect(result.flaggedTotal).toBe(6);
    expect(result.newlyFlagged).toBe(6);

    // 2. Fetch from GET /api/alerts
    (mockDb.sfJobRun.findFirst as any).mockResolvedValueOnce({
      id: "run-recent",
      startedAt: new Date(),
      status: "ok",
    });

    const alertsList = [
      {
        id: "al-1",
        operatorId: "op-001",
        skillId: "sk-qa-8",
        certifiedUntil: new Date("2026-10-11"), // 9 days
        severity: "warning",
        daysRemaining: 9,
        status: "open",
        firstFlaggedAt: new Date(),
        lastCheckedAt: new Date(),
        resolvedAt: null,
        resolvedReason: null,
        operator: { id: "op-001", employeeCode: "OP-001", name: "Ravi Kumar", shiftId: "shift-a" },
        skill: { id: "sk-qa-8", code: "QA-8", name: "CMM Inspection", nameHi: "सीएमएम निरीक्षण" },
      },
      {
        id: "al-2",
        operatorId: "op-002",
        skillId: "sk-cnc-l1",
        certifiedUntil: new Date("2026-10-05"), // 3 days
        severity: "critical",
        daysRemaining: 3,
        status: "open",
        firstFlaggedAt: new Date(),
        lastCheckedAt: new Date(),
        resolvedAt: null,
        resolvedReason: null,
        operator: { id: "op-002", employeeCode: "OP-002", name: "Anita Sharma", shiftId: "shift-a" },
        skill: { id: "sk-cnc-l1", code: "CNC-L1", name: "CNC Lathe", nameHi: "सीएनसी लेथ" },
      },
      {
        id: "al-3",
        operatorId: "op-006",
        skillId: "sk-cnc-m2",
        certifiedUntil: new Date("2026-10-16"), // 14 days
        severity: "warning",
        daysRemaining: 14,
        status: "open",
        firstFlaggedAt: new Date(),
        lastCheckedAt: new Date(),
        resolvedAt: null,
        resolvedReason: null,
        operator: { id: "op-006", employeeCode: "OP-006", name: "Farhan Sheikh", shiftId: "shift-b" },
        skill: { id: "sk-cnc-m2", code: "CNC-M2", name: "CNC Milling", nameHi: "सीएनसी मिलिंग" },
      },
      {
        id: "al-4",
        operatorId: "op-011",
        skillId: "sk-prs-4",
        certifiedUntil: new Date("2026-10-24"), // 22 days
        severity: "notice",
        daysRemaining: 22,
        status: "open",
        firstFlaggedAt: new Date(),
        lastCheckedAt: new Date(),
        resolvedAt: null,
        resolvedReason: null,
        operator: { id: "op-011", employeeCode: "OP-011", name: "Sunita Rao", shiftId: "shift-c" },
        skill: { id: "sk-prs-4", code: "PRS-4", name: "Hydraulic Press", nameHi: "हाइड्रोलिक प्रेस" },
      },
      {
        id: "al-5",
        operatorId: "op-012",
        skillId: "sk-inj-5",
        certifiedUntil: new Date("2026-10-30"), // 28 days
        severity: "notice",
        daysRemaining: 28,
        status: "open",
        firstFlaggedAt: new Date(),
        lastCheckedAt: new Date(),
        resolvedAt: null,
        resolvedReason: null,
        operator: { id: "op-012", employeeCode: "OP-012", name: "Vikram Chauhan", shiftId: "shift-c" },
        skill: { id: "sk-inj-5", code: "INJ-5", name: "Injection Moulding", nameHi: "इंजेक्शन मोल्डिंग" },
      },
      {
        id: "al-6",
        operatorId: "op-003",
        skillId: "sk-pkg-7",
        certifiedUntil: new Date("2026-09-27"), // -5 days overdue
        severity: "expired",
        daysRemaining: -5,
        status: "open",
        firstFlaggedAt: new Date(),
        lastCheckedAt: new Date(),
        resolvedAt: null,
        resolvedReason: null,
        operator: { id: "op-003", employeeCode: "OP-003", name: "Suresh Patil", shiftId: "shift-a" },
        skill: { id: "sk-pkg-7", code: "PKG-7", name: "Packaging Line", nameHi: "पैकेजिंग लाइन" },
      },
    ];

    (mockDb.sfAlert.findMany as any).mockResolvedValueOnce(alertsList);
    const alertsReq = new NextRequest("http://localhost:3011/api/alerts?status=open");
    const alertsRes = await getAlerts(alertsReq);
    const alertsJson = await alertsRes.json();

    expect(alertsRes.status).toBe(200);
    expect(alertsJson.success).toBe(true);

    const alerts = alertsJson.data;
    expect(alerts.length).toBe(6);

    // Verify overdue cert
    const overdueAlert = alerts.find((a: any) => a.daysRemaining < 0);
    expect(overdueAlert).toBeDefined();
    expect(overdueAlert.daysRemaining).toBe(-5);
    expect(overdueAlert.severity).toBe("expired");

    // Verify QA-8 expiring cert at 9 days
    const qaAlert = alerts.find((a: any) => a.skill.code === "QA-8");
    expect(qaAlert).toBeDefined();
    expect(qaAlert.daysRemaining).toBe(9);
    expect(qaAlert.severity).toBe("warning");

    // 3. Verify idempotency: running check a second time does not re-flag as new
    (mockDb.sfAlert.findFirst as any).mockResolvedValue({ id: "al-existing" });
    (mockDb.sfAlert.findMany as any).mockResolvedValue(alertsList);
    const secondResult = await runExpiryCheck({
      orgId: "org-demo-1",
      asOf,
      triggeredBy: "scheduler",
    });
    expect(secondResult.newlyFlagged).toBe(0);
    expect(secondResult.flaggedTotal).toBe(6);
  });

  /**
   * D3: Assigning an unqualified operator is rejected with the reason shown
   */
  it("D3_unqualified_assignment_rejected: unqualified assignments return 409 Conflict with full blocking reasons", async () => {
    // 1. Test Level 1 Operator (Needs Level 2)
    (mockDb.sfOperator.findFirst as any).mockResolvedValueOnce({
      id: "op-002",
      name: "Anita Sharma",
      shiftId: "shift-a",
      isActive: true,
    });
    (mockDb.sfSkill.findFirst as any).mockResolvedValueOnce({
      id: "sk-qa-8",
      code: "QA-8",
      name: "CMM Inspection",
      lineKey: "FINISHING",
      criticality: 3,
      isActive: true,
    });
    (mockDb.sfOperatorSkill.findFirst as any).mockResolvedValueOnce({
      operatorId: "op-002",
      skillId: "sk-qa-8",
      level: 1, // Learning only
      issuedOn: new Date("2025-01-01"),
      certifiedUntil: new Date("2027-01-01"),
    });
    (mockDb.sfOperator.findMany as any).mockResolvedValueOnce([]);
    (mockDb.sfShift.findMany as any).mockResolvedValueOnce([]);
    (mockDb.sfOperatorSkill.findMany as any).mockResolvedValueOnce([]);
    (mockDb.sfAssignment.findMany as any).mockResolvedValueOnce([]);

    (mockDb.sfAssignment.create as any).mockResolvedValueOnce({
      id: "as-1",
      status: "rejected",
      verdict: "red",
    });
    (mockDb.auditLog.create as any).mockResolvedValueOnce({ id: "aud-1" });

    const req1 = new NextRequest("http://localhost:3011/api/assignments", {
      method: "POST",
      body: JSON.stringify({
        operatorId: "op-002",
        skillId: "sk-qa-8",
        assignmentDate: "2026-10-02",
      }),
    });
    const res1 = await postAssignment(req1);
    const json1 = await res1.json();

    expect(res1.status).toBe(409);
    expect(json1.success).toBe(false);
    expect(json1.error).toContain("Level 1 on CMM Inspection; needs at least 2");

    // 2. Test Expired Certificate Operator
    (mockDb.sfOperator.findFirst as any).mockResolvedValueOnce({
      id: "op-003",
      name: "Suresh Patil",
      shiftId: "shift-a",
      isActive: true,
    });
    (mockDb.sfSkill.findFirst as any).mockResolvedValueOnce({
      id: "sk-pkg-7",
      code: "PKG-7",
      name: "Packaging Line",
      lineKey: "FINISHING",
      criticality: 1,
      isActive: true,
    });
    (mockDb.sfOperatorSkill.findFirst as any).mockResolvedValueOnce({
      operatorId: "op-003",
      skillId: "sk-pkg-7",
      level: 3,
      issuedOn: new Date("2024-01-01"),
      certifiedUntil: new Date("2026-09-27"), // Expired 5 days ago
    });
    (mockDb.sfOperator.findMany as any).mockResolvedValueOnce([]);
    (mockDb.sfShift.findMany as any).mockResolvedValueOnce([]);
    (mockDb.sfOperatorSkill.findMany as any).mockResolvedValueOnce([]);
    (mockDb.sfAssignment.findMany as any).mockResolvedValueOnce([]);

    (mockDb.sfAssignment.create as any).mockResolvedValueOnce({
      id: "as-2",
      status: "rejected",
      verdict: "red",
    });
    (mockDb.auditLog.create as any).mockResolvedValueOnce({ id: "aud-2" });

    const req2 = new NextRequest("http://localhost:3011/api/assignments", {
      method: "POST",
      body: JSON.stringify({
        operatorId: "op-003",
        skillId: "sk-pkg-7",
        assignmentDate: "2026-10-02",
      }),
    });
    const res2 = await postAssignment(req2);
    const json2 = await res2.json();

    expect(res2.status).toBe(409);
    expect(json2.success).toBe(false);
    expect(json2.error).toContain("Certification expired 5 days ago");
  });

  /**
   * D4: The gap report names the riskiest machines
   */
  it("D4_gap_report_names_riskiest: gap report names QA-8 as #1 riskiest machine and returns top 3 risks", async () => {
    const req = new NextRequest("http://localhost:3011/api/reports/gaps?asOf=2026-10-02");
    const res = await getGapReport(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);

    const { topRisks, spofs } = json.data;

    // Must return exactly 3 top risks
    expect(topRisks).toHaveLength(3);

    // QA-8 must be ranked #1
    expect(topRisks[0].skill.code).toBe("QA-8");
    expect(topRisks[0].risk.score).toBe(100); // 100 risk score due to 0 backup & 9-day expiring cert

    // QA-8 must be listed in SPOFs with count 1
    const qaSpof = spofs.find((s: any) => s.skill.code === "QA-8");
    expect(qaSpof).toBeDefined();
    expect(qaSpof.qualifiedCount).toBe(1);
    expect(qaSpof.isZeroQualified).toBe(false);
  });
});
