import { NextResponse } from "next/server";
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
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

interface CellData {
  operatorId: string;
  skillId: string;
  level: number;
  effectiveLevel: number;
  issuedOn: string | null;
  certifiedUntil: string | null;
  daysToExpiry: number | null;
  isExpiringSoon: boolean;
  isExpired: boolean;
  lastChange: {
    action: string;
    by: string | null;
    at: Date | string;
    reason: string | null;
  } | null;
}

interface HistoryItem {
  operatorId: string;
  skillId: string;
  action: string;
  newLevel: number | null;
  changedByName: string | null;
  changedAt: Date;
  reason: string | null;
}

interface OperatorSkillItem {
  operatorId: string;
  skillId: string;
  level: number;
  issuedOn: Date | null;
  certifiedUntil: Date | null;
  updatedAt: Date;
}

/**
 * GET /api/grid?shiftId=&asOf=&page=1&pageSize=50
 * Returns the operators x machines 2-D matrix.
 * Supports pagination (page, pageSize) and role-based row filtering:
 * Non-admin members only see their own row (or empty if operatorId is null).
 */
export const GET = withOrgAuth(async (req, ctx) => {
  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse(Object.fromEntries(searchParams.entries()));

  if (!parsed.success) {
    return validationError(parsed);
  }

  const asOf = parsed.data.asOf || today();
  const shiftId = parsed.data.shiftId;
  const page = parsed.data.page;
  const pageSize = parsed.data.pageSize;

  // Role-based filtering: non-admin member sees only their own operator row
  const isMember = ctx.userRole === "member" && !ctx.isSuperAdmin;

  try {
    if (isMember && !ctx.operatorId) {
      // Member without an operator ID gets an empty result
      const [shifts, skills] = await Promise.all([
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
      ]);

      return NextResponse.json({
        success: true,
        data: {
          asOf,
          shifts,
          skills,
          operators: [],
          matrix: {},
          pagination: {
            page,
            pageSize,
            total: 0,
            totalPages: 1,
          },
        },
      });
    }

    const operatorWhere = {
      orgId: ctx.orgId,
      isActive: true,
      ...(shiftId ? { shiftId } : {}),
      ...(isMember ? { id: ctx.operatorId! } : {}),
    };

    const [shifts, skills, totalOperators, operators, records, histories] = await Promise.all([
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
      db.sfOperator.count({ where: operatorWhere }),
      db.sfOperator.findMany({
        where: operatorWhere,
        orderBy: [{ shiftId: "asc" }, { employeeCode: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
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
    const latestHistoryMap = new Map<string, HistoryItem>();
    for (const h of histories) {
      const key = `${h.operatorId}_${h.skillId}`;
      if (!latestHistoryMap.has(key)) {
        latestHistoryMap.set(key, h);
      }
    }

    // Build matrix lookup
    const recordMap = new Map<string, OperatorSkillItem>();
    for (const r of records) {
      recordMap.set(`${r.operatorId}_${r.skillId}`, r);
    }

    const matrix: Record<string, Record<string, CellData>> = {};

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

    const totalPages = Math.max(1, Math.ceil(totalOperators / pageSize));

    return NextResponse.json({
      success: true,
      data: {
        asOf,
        shifts,
        skills,
        operators,
        matrix,
        pagination: {
          page,
          pageSize,
          total: totalOperators,
          totalPages,
        },
      },
    });
  } catch (err: unknown) {
    const shifts = DEMO_SHIFTS;
    const shiftMap = new Map(shifts.map((s) => [s.id, s]));
    let ops = DEMO_OPERATORS.map((o) => ({
      ...o,
      shift: o.shift || { code: shiftMap.get(o.shiftId)?.code || "A" },
    }));

    if (isMember) {
      if (!ctx.operatorId) {
        ops = [];
      } else {
        ops = ops.filter((o) => o.id === ctx.operatorId);
      }
    }

    if (shiftId) ops = ops.filter((o) => o.shiftId === shiftId);

    const totalOps = ops.length;
    const totalPages = Math.max(1, Math.ceil(totalOps / pageSize));
    const pagedOps = ops.slice((page - 1) * pageSize, page * pageSize);

    const skills = DEMO_MACHINES;
    const records = getDemoSkillRecords(asOf);

    const recordMap = new Map<string, { operatorId: string; skillId: string; level: number; certifiedUntil?: string | Date; issuedOn?: string | Date }>();
    for (const r of records) {
      recordMap.set(`${r.operatorId}_${r.skillId}`, r);
    }

    const matrix: Record<string, Record<string, CellData>> = {};

    for (const op of pagedOps) {
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
        operators: pagedOps,
        matrix,
        pagination: {
          page,
          pageSize,
          total: totalOps,
          totalPages,
        },
      },
    });
  }
});
