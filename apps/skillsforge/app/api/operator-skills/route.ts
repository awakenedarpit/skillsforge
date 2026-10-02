import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withOrgAuth } from "@/lib/api/withOrgAuth";
import { validationError } from "@/lib/api/validationError";
import { writeAuditLog } from "@/lib/api/auditLog";
import { canEditSkillGrid } from "@/lib/api/skillsforgePermissions";
import { db } from "@/lib/db";
import { today, parseDate, formatDateStr } from "@/lib/domain/rules";
import { daysToExpiry, severityFor, effectiveLevel } from "@/lib/domain/qualification";
import { buildCoverage } from "@/lib/domain/coverage";

export const dynamic = "force-dynamic";

const patchCellSchema = z.object({
  operatorId: z.string().trim().min(1, "Operator ID is required"),
  skillId: z.string().trim().min(1, "Skill ID is required"),
  level: z.number().int().min(0).max(4).optional(),
  issuedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)").nullable().optional(),
  certifiedUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)").nullable().optional(),
  reason: z.string().max(500).optional(),
});

export const PATCH = withOrgAuth(async (req, ctx) => {
  if (!canEditSkillGrid(ctx.userRole)) {
    return NextResponse.json(
      { success: false, error: "Forbidden: insufficient permissions to edit skill grid" },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = patchCellSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed);
  }

  const { operatorId, skillId, level, issuedOn, certifiedUntil, reason } = parsed.data;

  // Verify operator and skill belong to tenant
  const [operator, skill] = await Promise.all([
    db.sfOperator.findFirst({ where: { id: operatorId, orgId: ctx.orgId } }),
    db.sfSkill.findFirst({ where: { id: skillId, orgId: ctx.orgId } }),
  ]);

  if (!operator) {
    return NextResponse.json({ success: false, error: "Operator not found" }, { status: 404 });
  }
  if (!skill) {
    return NextResponse.json({ success: false, error: "Machine not found" }, { status: 404 });
  }

  const asOf = today();

  const result = await db.$transaction(async (tx) => {
    // 1. Fetch existing record
    const existing = await tx.sfOperatorSkill.findFirst({
      where: { orgId: ctx.orgId, operatorId, skillId },
    });

    const newLevel = level !== undefined ? level : (existing?.level ?? 0);
    const newIssuedOn = issuedOn !== undefined ? (issuedOn ? parseDate(issuedOn) : null) : existing?.issuedOn;
    const newCertifiedUntil = certifiedUntil !== undefined ? (certifiedUntil ? parseDate(certifiedUntil) : null) : existing?.certifiedUntil;

    // 2. Write SfSkillHistory (immutable audit)
    await tx.sfSkillHistory.create({
      data: {
        orgId: ctx.orgId,
        operatorId,
        skillId,
        action: existing ? "UPDATE" : "CREATE",
        oldLevel: existing?.level ?? null,
        newLevel,
        oldIssuedOn: existing?.issuedOn ?? null,
        newIssuedOn,
        oldCertifiedUntil: existing?.certifiedUntil ?? null,
        newCertifiedUntil,
        changedBy: ctx.userId,
        changedByName: ctx.userName,
        reason: reason || null,
      },
    });

    // 3. Upsert SfOperatorSkill
    const updated = await tx.sfOperatorSkill.upsert({
      where: {
        orgId_operatorId_skillId: {
          orgId: ctx.orgId,
          operatorId,
          skillId,
        },
      },
      create: {
        orgId: ctx.orgId,
        operatorId,
        skillId,
        level: newLevel,
        issuedOn: newIssuedOn,
        certifiedUntil: newCertifiedUntil,
        createdBy: ctx.userId,
      },
      update: {
        level: newLevel,
        issuedOn: newIssuedOn,
        certifiedUntil: newCertifiedUntil,
        updatedBy: ctx.userId,
      },
    });

    // 4. Re-sync SfAlert for this record
    const certUntilStr = newCertifiedUntil ? formatDateStr(newCertifiedUntil) : null;
    const daysLeft = daysToExpiry(certUntilStr, asOf);

    if (newLevel >= 1 && newCertifiedUntil && daysLeft !== null && daysLeft <= 30) {
      // Upsert alert
      const severity = severityFor(daysLeft);
      await tx.sfAlert.upsert({
        where: {
          orgId_operatorId_skillId_certifiedUntil: {
            orgId: ctx.orgId,
            operatorId,
            skillId,
            certifiedUntil: newCertifiedUntil,
          },
        },
        create: {
          orgId: ctx.orgId,
          operatorId,
          skillId,
          certifiedUntil: newCertifiedUntil,
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
    } else {
      // Resolve any open alert for this operator and skill
      await tx.sfAlert.updateMany({
        where: {
          orgId: ctx.orgId,
          operatorId,
          skillId,
          status: "open",
        },
        data: {
          status: "resolved",
          resolvedAt: new Date(),
          resolvedReason: newLevel === 0 ? "level_lowered" : "renewed",
        },
      });
    }

    return updated;
  });

  // 5. Write platform audit log
  await writeAuditLog({
    orgId: ctx.orgId,
    actorId: ctx.userId,
    actorRole: ctx.userRole,
    action: "UPDATE",
    entityType: "operator_skill",
    entityId: result.id,
    changes: Object.keys(parsed.data).filter((k) => k !== "operatorId" && k !== "skillId"),
    reason: reason || null,
  });

  const effLevel = effectiveLevel(result.level, result.certifiedUntil ? formatDateStr(parseDate(result.certifiedUntil)) : null, asOf);
  const certUntilStr = result.certifiedUntil ? formatDateStr(parseDate(result.certifiedUntil)) : null;
  const daysLeft = daysToExpiry(certUntilStr, asOf);

  return NextResponse.json({
    success: true,
    data: {
      cell: {
        operatorId: result.operatorId,
        skillId: result.skillId,
        level: result.level,
        effectiveLevel: effLevel,
        issuedOn: result.issuedOn ? formatDateStr(parseDate(result.issuedOn)) : null,
        certifiedUntil: certUntilStr,
        daysToExpiry: daysLeft,
        isExpiringSoon: daysLeft !== null && daysLeft >= 0 && daysLeft <= 30,
        isExpired: daysLeft !== null && daysLeft < 0,
      },
    },
  });
});

export const DELETE = withOrgAuth(async (req, ctx) => {
  if (!canEditSkillGrid(ctx.userRole)) {
    return NextResponse.json(
      { success: false, error: "Forbidden: insufficient permissions to edit skill grid" },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(req.url);
  const operatorId = searchParams.get("operatorId");
  const skillId = searchParams.get("skillId");

  if (!operatorId || !skillId) {
    return NextResponse.json(
      { success: false, error: "Both operatorId and skillId query parameters are required" },
      { status: 400 }
    );
  }

  const existing = await db.sfOperatorSkill.findFirst({
    where: { orgId: ctx.orgId, operatorId, skillId },
  });

  if (!existing) {
    return NextResponse.json({ success: false, error: "Record not found" }, { status: 404 });
  }

  await db.$transaction(async (tx) => {
    // 1. History record with action DELETE
    await tx.sfSkillHistory.create({
      data: {
        orgId: ctx.orgId,
        operatorId,
        skillId,
        action: "DELETE",
        oldLevel: existing.level,
        newLevel: null,
        oldIssuedOn: existing.issuedOn,
        newIssuedOn: null,
        oldCertifiedUntil: existing.certifiedUntil,
        newCertifiedUntil: null,
        changedBy: ctx.userId,
        changedByName: ctx.userName,
        reason: "Record deleted",
      },
    });

    // 2. Delete operator skill record
    await tx.sfOperatorSkill.deleteMany({
      where: { orgId: ctx.orgId, operatorId, skillId },
    });

    // 3. Resolve alerts
    await tx.sfAlert.updateMany({
      where: {
        orgId: ctx.orgId,
        operatorId,
        skillId,
        status: "open",
      },
      data: {
        status: "resolved",
        resolvedAt: new Date(),
        resolvedReason: "record_removed",
      },
    });
  });

  await writeAuditLog({
    orgId: ctx.orgId,
    actorId: ctx.userId,
    actorRole: ctx.userRole,
    action: "DELETE",
    entityType: "operator_skill",
    entityId: existing.id,
    changes: ["level", "issuedOn", "certifiedUntil"],
    reason: "Deleted skill record",
  });

  return NextResponse.json({ success: true, data: { deleted: true } });
});
