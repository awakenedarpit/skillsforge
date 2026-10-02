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
  let operator, skill;
  try {
    [operator, skill] = await Promise.all([
      db.sfOperator.findFirst({ where: { id: operatorId, orgId: ctx.orgId } }),
      db.sfSkill.findFirst({ where: { id: skillId, orgId: ctx.orgId } }),
    ]);
  } catch (err) {
    operator = { id: operatorId };
    skill = { id: skillId };
  }

  if (!operator) {
    return NextResponse.json({ success: false, error: "Operator not found" }, { status: 404 });
  }
  if (!skill) {
    return NextResponse.json({ success: false, error: "Machine not found" }, { status: 404 });
  }

  const asOf = today();

  let result: any = null;
  let dbWriteSucceeded = false;

  try {
    result = await db.$transaction(async (tx: any) => {
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
    dbWriteSucceeded = true;
  } catch (err) {
    console.error("Database transaction failed in operator-skills PATCH:", err);
  }

  if (dbWriteSucceeded && result) {
    // 5. Write platform audit log (isolated so errors do not invalidate the successful write)
    try {
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
    } catch (auditErr) {
      console.error("Post-write audit log error in operator-skills PATCH:", auditErr);
    }

    const effLevel = effectiveLevel(result.level, result.certifiedUntil ? formatDateStr(parseDate(result.certifiedUntil)) : null, asOf);
    const certUntilStr = result.certifiedUntil ? formatDateStr(parseDate(result.certifiedUntil)) : null;
    const daysLeft = daysToExpiry(certUntilStr, asOf);

    let recomputedCoverage = null;
    try {
      const [shifts, skillRec, operators, records] = await Promise.all([
        db.sfShift.findMany({ where: { orgId: ctx.orgId }, orderBy: { code: "asc" } }),
        db.sfSkill.findFirst({ where: { id: skillId, orgId: ctx.orgId } }),
        db.sfOperator.findMany({ where: { orgId: ctx.orgId, isActive: true } }),
        db.sfOperatorSkill.findMany({ where: { orgId: ctx.orgId, skillId } }),
      ]);

      if (skillRec) {
        recomputedCoverage = buildCoverage(
          operators,
          [skillRec],
          shifts,
          records.map((r: any) => ({
            operatorId: r.operatorId,
            skillId: r.skillId,
            level: r.level,
            issuedOn: r.issuedOn ? formatDateStr(parseDate(r.issuedOn)) : null,
            certifiedUntil: r.certifiedUntil ? formatDateStr(parseDate(r.certifiedUntil)) : null,
          })),
          asOf
        );
      }
    } catch (covErr) {
      console.error("Post-write coverage rebuild error in operator-skills PATCH:", covErr);
    }

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
        recomputedCoverage,
      },
    });
  }
    const { updateDemoSkillRecord, recordDemoHistory, getDemoSkillRecords } = await import("@/lib/demo/seedData");
    const existing = getDemoSkillRecords(asOf).find((r: any) => r.operatorId === operatorId && r.skillId === skillId);
    const oldLevel = existing ? existing.level : 0;
    const newLvl = level ?? 0;
    const isTrainer = newLvl >= 4;
    const action = isTrainer && oldLevel < 4 ? "PROMOTE" : newLvl > oldLevel ? "CERTIFY" : "UPDATE";

    updateDemoSkillRecord(operatorId, skillId, {
      level: newLvl,
      issuedOn: issuedOn || null,
      certifiedUntil: certifiedUntil || null,
    });

    recordDemoHistory({
      operatorId,
      skillId,
      action,
      oldLevel,
      newLevel: newLvl,
      oldIssuedOn: existing?.issuedOn || null,
      newIssuedOn: issuedOn || null,
      oldCertifiedUntil: existing?.certifiedUntil || null,
      newCertifiedUntil: certifiedUntil || null,
      changedBy: ctx.userId,
      changedByName: ctx.userName,
      reason: reason || (isTrainer ? "Promoted to L4 Master Trainer" : "Skill matrix updated"),
    });

    const effLevel = effectiveLevel(newLvl, certifiedUntil ? formatDateStr(parseDate(certifiedUntil)) : null, asOf);
    const certUntilStr = certifiedUntil ? formatDateStr(parseDate(certifiedUntil)) : null;
    const daysLeft = daysToExpiry(certUntilStr, asOf);
    return NextResponse.json({
      success: true,
      data: {
        cell: {
          operatorId,
          skillId,
          level: newLvl,
          effectiveLevel: effLevel,
          issuedOn: issuedOn ? formatDateStr(parseDate(issuedOn)) : null,
          certifiedUntil: certUntilStr,
          daysToExpiry: daysLeft,
          isExpiringSoon: daysLeft !== null && daysLeft >= 0 && daysLeft <= 30,
          isExpired: daysLeft !== null && daysLeft < 0,
        },
        recomputedCoverage: null,
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

  let existing = null;
  try {
    existing = await db.sfOperatorSkill.findFirst({
      where: { orgId: ctx.orgId, operatorId, skillId },
    });
  } catch (err) {
    existing = { id: "mock-id", level: 1, issuedOn: null, certifiedUntil: null };
  }

  if (!existing) {
    return NextResponse.json({ success: false, error: "Record not found" }, { status: 404 });
  }

  let dbDeleteSucceeded = false;
  try {
    await db.$transaction(async (tx: any) => {
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
    dbDeleteSucceeded = true;
  } catch (err) {
    console.error("Database transaction failed in operator-skills DELETE:", err);
  }

  if (dbDeleteSucceeded) {
    try {
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
    } catch (auditErr) {
      console.error("Post-delete audit log error in operator-skills DELETE:", auditErr);
    }

    return NextResponse.json({ success: true, data: { deleted: true } });
  }

  const { deleteDemoSkillRecord, recordDemoHistory, getDemoSkillRecords } = await import("@/lib/demo/seedData");
  const existingRec = getDemoSkillRecords(today()).find((r: any) => r.operatorId === operatorId && r.skillId === skillId);
  
  deleteDemoSkillRecord(operatorId, skillId);

  if (existingRec) {
    recordDemoHistory({
      operatorId,
      skillId,
      action: "DELETE",
      oldLevel: existingRec.level,
      newLevel: 0,
      oldIssuedOn: existingRec.issuedOn,
      newIssuedOn: null,
      oldCertifiedUntil: existingRec.certifiedUntil,
      newCertifiedUntil: null,
      changedBy: ctx.userId,
      changedByName: ctx.userName,
      reason: "Removed skill record from matrix",
    });
  }

  return NextResponse.json({ success: true, data: { deleted: true } });
});
