import { db } from "../db";
import { today, parseDate, formatDateStr, addDaysToStr } from "../domain/rules";
import { daysToExpiry, severityFor } from "../domain/qualification";

export interface ExpiryCheckOptions {
  orgId: string;
  asOf?: string;
  triggeredBy: "scheduler" | "manual" | "external" | "stale_catchup";
}

export interface ExpiryCheckResult {
  flaggedTotal: number;
  newlyFlagged: number;
  resolvedCount: number;
  asOfDate: string;
}

/**
 * Runs the daily certification expiry check.
 * Idempotent: running multiple times for the same date does not produce duplicate alerts.
 */
export async function runExpiryCheck(opts: ExpiryCheckOptions): Promise<ExpiryCheckResult> {
  const asOf = opts.asOf || today();
  const asOfDate = parseDate(asOf)!;
  const cutoffDate = parseDate(addDaysToStr(asOf, 30))!;

  try {
    // 1. Find all active operator skill records with level >= 1 and certifiedUntil <= asOf + 30 days
    const eligibleRecords = await db.sfOperatorSkill.findMany({
      where: {
        orgId: opts.orgId,
        level: { gte: 1 },
        certifiedUntil: {
          not: null,
          lte: cutoffDate,
        },
        operator: {
          isActive: true,
        },
      },
      select: {
        id: true,
        operatorId: true,
        skillId: true,
        level: true,
        certifiedUntil: true,
      },
    });

    let newlyFlagged = 0;
    let flaggedTotal = 0;

    const seenAlertKeys = new Set<string>();

    for (const record of eligibleRecords) {
      if (!record.certifiedUntil) continue;
      const certDateStr = formatDateStr(record.certifiedUntil)!;
      const daysLeft = daysToExpiry(certDateStr, asOf);
      if (daysLeft === null || daysLeft > 30) continue;

      const severity = severityFor(daysLeft);
      const key = `${record.operatorId}_${record.skillId}_${certDateStr}`;
      seenAlertKeys.add(key);

      const existingAlert = await db.sfAlert.findFirst({
        where: {
          orgId: opts.orgId,
          operatorId: record.operatorId,
          skillId: record.skillId,
          certifiedUntil: record.certifiedUntil,
        },
      });

      if (!existingAlert) {
        newlyFlagged++;
      }

      await db.sfAlert.upsert({
        where: {
          orgId_operatorId_skillId_certifiedUntil: {
            orgId: opts.orgId,
            operatorId: record.operatorId,
            skillId: record.skillId,
            certifiedUntil: record.certifiedUntil,
          },
        },
        create: {
          orgId: opts.orgId,
          operatorId: record.operatorId,
          skillId: record.skillId,
          certifiedUntil: record.certifiedUntil,
          severity,
          daysRemaining: daysLeft,
          status: "open",
          firstFlaggedAt: new Date(),
          lastCheckedAt: new Date(),
        },
        update: {
          severity,
          daysRemaining: daysLeft,
          status: "open",
          lastCheckedAt: new Date(),
          resolvedAt: null,
          resolvedReason: null,
        },
      });

      flaggedTotal++;
    }

    // 2. Resolve open alerts whose cert was renewed, level became 0, or record no longer exists
    const openAlerts = await db.sfAlert.findMany({
      where: {
        orgId: opts.orgId,
        status: "open",
      },
      select: {
        id: true,
        operatorId: true,
        skillId: true,
        certifiedUntil: true,
      },
    });

    let resolvedCount = 0;

    for (const alert of openAlerts) {
      const certDateStr = formatDateStr(alert.certifiedUntil);
      const key = `${alert.operatorId}_${alert.skillId}_${certDateStr}`;

      if (!seenAlertKeys.has(key)) {
        // Find current status to determine resolution reason
        const currentRecord = await db.sfOperatorSkill.findFirst({
          where: {
            orgId: opts.orgId,
            operatorId: alert.operatorId,
            skillId: alert.skillId,
          },
          include: { operator: true },
        });

        let resolvedReason = "record_removed";
        if (!currentRecord || !currentRecord.operator?.isActive) {
          resolvedReason = currentRecord ? "operator_inactive" : "record_removed";
        } else if (currentRecord.level === 0) {
          resolvedReason = "level_lowered";
        } else if (currentRecord.certifiedUntil) {
          const currentDaysLeft = daysToExpiry(formatDateStr(currentRecord.certifiedUntil), asOf);
          if (currentDaysLeft !== null && currentDaysLeft > 30) {
            resolvedReason = "renewed";
          }
        }

        await db.sfAlert.updateMany({
          where: { id: alert.id, orgId: opts.orgId },
          data: {
            status: "resolved",
            resolvedAt: new Date(),
            resolvedReason,
            lastCheckedAt: new Date(),
          },
        });

        resolvedCount++;
      }
    }

    // 3. Record job run
    await db.sfJobRun.create({
      data: {
        orgId: opts.orgId,
        jobName: "expiry_check",
        triggeredBy: opts.triggeredBy,
        asOfDate,
        startedAt: new Date(),
        finishedAt: new Date(),
        status: "ok",
        flaggedTotal,
        newlyFlagged,
        resolvedCount,
      },
    });

    return {
      flaggedTotal,
      newlyFlagged,
      resolvedCount,
      asOfDate: asOf,
    };
  } catch (err: unknown) {
    console.error("Error running expiry check:", err);
    // Record failed job run if possible
    try {
      await db.sfJobRun.create({
        data: {
          orgId: opts.orgId,
          jobName: "expiry_check",
          triggeredBy: opts.triggeredBy,
          asOfDate,
          status: "error",
          errorMessage: err instanceof Error ? err.message : String(err),
        },
      });
    } catch {}

    throw err;
  }
}
