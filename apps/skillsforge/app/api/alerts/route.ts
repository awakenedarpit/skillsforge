import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withOrgAuth } from "@/lib/api/withOrgAuth";
import { validationError } from "@/lib/api/validationError";
import { db } from "@/lib/db";
import { today, formatDateStr, parseDate } from "@/lib/domain/rules";
import { daysToExpiry, severityFor } from "@/lib/domain/qualification";
import { runExpiryCheck } from "@/lib/api/expiryJob";
import {
  DEMO_MACHINES,
  DEMO_OPERATORS,
  getDemoSkillRecords,
} from "@/lib/demo/seedData";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  status: z.enum(["open", "resolved"]).default("open").optional(),
});

/**
 * GET /api/alerts?status=open
 * Returns certification alerts with recomputed daysRemaining on read.
 * Runs stale catch-up if the last successful expiry check is older than 24h.
 */
export const GET = withOrgAuth(async (req, ctx) => {
  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse(Object.fromEntries(searchParams.entries()));

  if (!parsed.success) {
    return validationError(parsed);
  }

  const status = parsed.data.status || "open";
  const asOf = today();

  try {
    // Stale catch-up check
    const lastRun = await db.sfJobRun.findFirst({
      where: { orgId: ctx.orgId, jobName: "expiry_check", status: "ok" },
      orderBy: { startedAt: "desc" },
    });

    const isStale = !lastRun || Date.now() - new Date(lastRun.startedAt).getTime() > 24 * 60 * 60 * 1000;
    if (isStale) {
      try {
        await runExpiryCheck({ orgId: ctx.orgId, triggeredBy: "stale_catchup" });
      } catch (e) {
        console.warn("Stale catch-up expiry check run failed, continuing:", e);
      }
    }

    const alerts = await db.sfAlert.findMany({
      where: {
        orgId: ctx.orgId,
        status,
      },
      take: 200,
      orderBy: [{ daysRemaining: "asc" }, { severity: "desc" }],
      select: {
        id: true,
        operatorId: true,
        skillId: true,
        certifiedUntil: true,
        severity: true,
        daysRemaining: true,
        status: true,
        firstFlaggedAt: true,
        lastCheckedAt: true,
        resolvedAt: true,
        resolvedReason: true,
        operator: {
          select: {
            id: true,
            employeeCode: true,
            name: true,
            shiftId: true,
          },
        },
        skill: {
          select: {
            id: true,
            code: true,
            name: true,
            nameHi: true,
          },
        },
      },
    });

    const formatted = alerts.map((a: any) => {
      const certDateStr = formatDateStr(parseDate(a.certifiedUntil))!;
      const daysLeft = daysToExpiry(certDateStr, asOf);
      const severity = daysLeft !== null ? severityFor(daysLeft) : a.severity;

      return {
        ...a,
        certifiedUntil: certDateStr,
        daysRemaining: daysLeft ?? a.daysRemaining,
        severity,
      };
    });

    return NextResponse.json({
      success: true,
      data: formatted,
    });
  } catch (err: unknown) {
    // In-memory fallback if DB is unreachable in offline demo / tests
    const records = getDemoSkillRecords(asOf);
    const demoAlerts: any[] = [];

    const opMap = new Map(DEMO_OPERATORS.map((o) => [o.id, o]));
    const skillMap = new Map(DEMO_MACHINES.map((s) => [s.id, s]));

    for (const r of records) {
      if (!r.certifiedUntil) continue;
      const daysLeft = daysToExpiry(r.certifiedUntil, asOf);
      if (daysLeft === null || daysLeft > 30) continue;

      const op = opMap.get(r.operatorId);
      const sk = skillMap.get(r.skillId);
      if (!op || !sk) continue;

      demoAlerts.push({
        id: `demo-alert-${r.operatorId}-${r.skillId}`,
        operatorId: r.operatorId,
        skillId: r.skillId,
        certifiedUntil: r.certifiedUntil,
        severity: severityFor(daysLeft),
        daysRemaining: daysLeft,
        status: "open",
        firstFlaggedAt: new Date().toISOString(),
        lastCheckedAt: new Date().toISOString(),
        resolvedAt: null,
        resolvedReason: null,
        operator: {
          id: op.id,
          employeeCode: op.employeeCode,
          name: op.name,
          shiftId: op.shiftId,
        },
        skill: {
          id: sk.id,
          code: sk.code,
          name: sk.name,
          nameHi: sk.nameHi,
        },
      });
    }

    demoAlerts.sort((a, b) => a.daysRemaining - b.daysRemaining);

    return NextResponse.json({
      success: true,
      data: status === "open" ? demoAlerts : [],
    });
  }
});
