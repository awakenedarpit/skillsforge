import type { SfAlert } from "@prisma/client";
import { db } from "../db";
import { today, parseDate, formatDateStr, addDaysToStr } from "../domain/rules";
import { daysToExpiry, severityFor } from "../domain/qualification";
import { dispatchExpiryNotification, ExpiryNotificationPayload } from "../notifications";

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

    // Load all open alerts for this org in ONE query upfront to eliminate N+1 queries
    const existingOpenAlerts = await db.sfAlert.findMany({
      where: {
        orgId: opts.orgId,
        status: "open",
      },
    });

    const openAlertsMap = new Map<string, typeof existingOpenAlerts[0]>();
    for (const alert of existingOpenAlerts) {
      const key = `${alert.operatorId}_${alert.skillId}_${alert.certifiedUntil.getTime()}`;
      openAlertsMap.set(key, alert);
    }

    let newlyFlagged = 0;
    let flaggedTotal = 0;

    const seenAlertKeys = new Set<string>();
    const upsertOps: any[] = [];
    const notificationsToSend: ExpiryNotificationPayload[] = [];
    const now = new Date();

    for (const record of eligibleRecords) {
      if (!record.certifiedUntil) continue;
      const certDateStr = formatDateStr(record.certifiedUntil)!;
      const daysLeft = daysToExpiry(certDateStr, asOf);
      if (daysLeft === null || daysLeft > 30) continue;

      const severity = severityFor(daysLeft);
      const key = `${record.operatorId}_${record.skillId}_${certDateStr}`;
      seenAlertKeys.add(key);

      const alertLookupKey = `${record.operatorId}_${record.skillId}_${record.certifiedUntil.getTime()}`;
      const existingAlert = openAlertsMap.get(alertLookupKey);

      if (!existingAlert) {
        newlyFlagged++;
      }

      // Only notify once per alert (if alert is newly flagged or has never been notified)
      if (!existingAlert || !existingAlert.notifiedAt) {
        notificationsToSend.push({
          orgId: opts.orgId,
          operatorId: record.operatorId,
          skillId: record.skillId,
          severity,
          daysRemaining: daysLeft,
          certifiedUntil: record.certifiedUntil,
        });
      }

      upsertOps.push(
        db.sfAlert.upsert({
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
            firstFlaggedAt: now,
            lastCheckedAt: now,
            notifiedAt: now,
          },
          update: {
            severity,
            daysRemaining: daysLeft,
            status: "open",
            lastCheckedAt: now,
            notifiedAt: existingAlert?.notifiedAt || now,
            resolvedAt: null,
            resolvedReason: null,
          },
        })
      );

      flaggedTotal++;
    }

    if (upsertOps.length > 0) {
      await db.$transaction(upsertOps);
    }

    // Safely dispatch notifications; failures must never fail the job
    for (const notif of notificationsToSend) {
      try {
        await dispatchExpiryNotification(notif);
      } catch (err: unknown) {
        console.error("Non-blocking notification failure:", err);
      }
    }

    // 2. Resolve open alerts whose cert was renewed, level became 0, or record no longer exists
    const alertsToResolve = (existingOpenAlerts as SfAlert[]).filter((alert: SfAlert) => {
      const certDateStr = formatDateStr(alert.certifiedUntil);
      const key = `${alert.operatorId}_${alert.skillId}_${certDateStr}`;
      return !seenAlertKeys.has(key);
    });

    let resolvedCount = 0;

    if (alertsToResolve.length > 0) {
      const opIds = Array.from(new Set(alertsToResolve.map((a: SfAlert) => a.operatorId)));
      const skIds = Array.from(new Set(alertsToResolve.map((a: SfAlert) => a.skillId)));

      const currentRecords = await db.sfOperatorSkill.findMany({
        where: {
          orgId: opts.orgId,
          operatorId: { in: opIds },
          skillId: { in: skIds },
        },
        include: { operator: true },
      });

      const currentRecordMap = new Map<string, (typeof currentRecords)[0]>();
      for (const rec of currentRecords) {
        currentRecordMap.set(`${rec.operatorId}_${rec.skillId}`, rec);
      }

      const resolveOps: any[] = [];
      for (const alert of alertsToResolve) {
        const currentRecord = currentRecordMap.get(`${alert.operatorId}_${alert.skillId}`);

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

        resolveOps.push(
          db.sfAlert.updateMany({
            where: { id: alert.id, orgId: opts.orgId },
            data: {
              status: "resolved",
              resolvedAt: now,
              resolvedReason,
              lastCheckedAt: now,
            },
          })
        );

        resolvedCount++;
      }

      if (resolveOps.length > 0) {
        await db.$transaction(resolveOps);
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
