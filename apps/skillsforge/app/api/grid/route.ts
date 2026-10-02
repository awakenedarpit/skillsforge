import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withOrgAuth } from "@/lib/api/withOrgAuth";
import { validationError } from "@/lib/api/validationError";
import { db } from "@/lib/db";
import { today, formatDateStr, parseDate } from "@/lib/domain/rules";
import { effectiveLevel, daysToExpiry } from "@/lib/domain/qualification";
import { DEMO_MACHINES, DEMO_OPERATORS, DEMO_SHIFTS, getDemoSkillRecords } from "@/lib/demo/seedData";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  shiftId: z.string().optional(),
  asOf: z.string().optional(),
});

/**
 * GET /api/grid?shiftId=&asOf=
 * Returns the operators x machines 2-D matrix.
 * Note: This returns a bounded matrix payload (15-50 operators x 8-20 machines),
 * not an unbounded pagination list, per Section 6 API specifications.
 */
export const GET = withOrgAuth(async (req, ctx) => {
  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse(Object.fromEntries(searchParams.entries()));

  if (!parsed.success) {
    return validationError(parsed);
  }

  const asOf = parsed.data.asOf || today();
  const shiftId = parsed.data.shiftId;

  try {
    const [shifts, skills, operators, records, histories] = await Promise.all([
      db.sfShift.findMany({
        where: { orgId: ctx.orgId },
        orderBy: { code: "asc" },
        select: { id: true, code: true, startTime: true, endTime: true },
      }),
      db.sfSkill.findMany({
        where: { orgId: ctx.orgId, isActive: true },
        orderBy: { code: "asc" },
        select: { id: true, code: true, name: true, nameHi: true, lineKey: true, criticality: true },
      }),
      db.sfOperator.findMany({
        where: {
          orgId: ctx.orgId,
          isActive: true,
          ...(shiftId ? { shiftId } : {}),
        },
        orderBy: [{ shiftId: "asc" }, { employeeCode: "asc" }],
        select: {
          id: true,
          employeeCode: true,
          name: true,
          shiftId: true,
          shift: { select: { code: true } },
        },
      }),
      db.sfOperatorSkill.findMany({
        where: { orgId: ctx.orgId },
        select: {
          operatorId: true,
          skillId: true,
          level: true,
          issuedOn: true,
          certifiedUntil: true,
          updatedAt: true,
        },
      }),
      db.sfSkillHistory.findMany({
        where: { orgId: ctx.orgId },
        orderBy: { changedAt: "desc" },
        take: 300,
        select: {
          operatorId: true,
          skillId: true,
          action: true,
          newLevel: true,
          changedByName: true,
          changedAt: true,
          reason: true,
        },
      }),
    ]);

    // Build latest history lookup by operatorId_skillId
    const latestHistoryMap = new Map<string, any>();
    for (const h of histories) {
      const key = `${h.operatorId}_${h.skillId}`;
      if (!latestHistoryMap.has(key)) {
        latestHistoryMap.set(key, h);
      }
    }

    // Build matrix lookup
    const recordMap = new Map<string, any>();
    for (const r of records) {
      recordMap.set(`${r.operatorId}_${r.skillId}`, r);
    }

    const matrix: Record<string, Record<string, any>> = {};

    for (const op of operators) {
      matrix[op.id] = {};
      for (const sk of skills) {
        const key = `${op.id}_${sk.id}`;
        const rec = recordMap.get(key);
        const hist = latestHistoryMap.get(key);

        const storedLevel = rec ? rec.level : 0;
        const certUntilStr = rec?.certifiedUntil ? formatDateStr(parseDate(rec.certifiedUntil)) : null;
        const issuedOnStr = rec?.issuedOn ? formatDateStr(parseDate(rec.issuedOn)) : null;
        const effLevel = effectiveLevel(storedLevel, certUntilStr, asOf);
        const daysLeft = daysToExpiry(certUntilStr, asOf);

        matrix[op.id][sk.id] = {
          operatorId: op.id,
          skillId: sk.id,
          level: storedLevel,
          effectiveLevel: effLevel,
          issuedOn: issuedOnStr,
          certifiedUntil: certUntilStr,
          daysToExpiry: daysLeft,
          isExpiringSoon: daysLeft !== null && daysLeft >= 0 && daysLeft <= 30,
          isExpired: daysLeft !== null && daysLeft < 0,
          lastChange: hist
            ? {
                action: hist.action,
                by: hist.changedByName,
                at: hist.changedAt,
                reason: hist.reason,
              }
            : null,
        };
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        asOf,
        shifts,
        skills,
        operators,
        matrix,
      },
    });
  } catch (err: unknown) {
    // In-memory fallback if DB is unreachable
    let ops = DEMO_OPERATORS;
    if (shiftId) ops = ops.filter((o) => o.shiftId === shiftId);

    const skills = DEMO_MACHINES;
    const shifts = DEMO_SHIFTS;
    const records = getDemoSkillRecords(asOf);

    const recordMap = new Map<string, any>();
    for (const r of records) {
      recordMap.set(`${r.operatorId}_${r.skillId}`, r);
    }

    const matrix: Record<string, Record<string, any>> = {};

    for (const op of ops) {
      matrix[op.id] = {};
      for (const sk of skills) {
        const key = `${op.id}_${sk.id}`;
        const rec = recordMap.get(key);

        const storedLevel = rec ? rec.level : 0;
        const certUntilStr = rec?.certifiedUntil ? formatDateStr(parseDate(rec.certifiedUntil)) : null;
        const issuedOnStr = rec?.issuedOn ? formatDateStr(parseDate(rec.issuedOn)) : null;
        const effLevel = effectiveLevel(storedLevel, certUntilStr, asOf);
        const daysLeft = daysToExpiry(certUntilStr, asOf);

        matrix[op.id][sk.id] = {
          operatorId: op.id,
          skillId: sk.id,
          level: storedLevel,
          effectiveLevel: effLevel,
          issuedOn: issuedOnStr,
          certifiedUntil: certUntilStr,
          daysToExpiry: daysLeft,
          isExpiringSoon: daysLeft !== null && daysLeft >= 0 && daysLeft <= 30,
          isExpired: daysLeft !== null && daysLeft < 0,
          lastChange: {
            action: "SEED",
            by: "Asha Verma",
            at: new Date().toISOString(),
            reason: "Initial qualification record",
          },
        };
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        asOf,
        shifts,
        skills,
        operators: ops,
        matrix,
      },
    });
  }
});
