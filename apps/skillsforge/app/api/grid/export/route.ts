import { NextResponse } from "next/server";
import { z } from "zod";
import { withOrgAuth } from "@/lib/api/withOrgAuth";
import { validationError } from "@/lib/api/validationError";
import { db } from "@/lib/db";
import { today, formatDateStr, parseDate } from "@/lib/domain/rules";
import { effectiveLevel } from "@/lib/domain/qualification";
import { DEMO_MACHINES, DEMO_OPERATORS, DEMO_SHIFTS, getDemoSkillRecords } from "@/lib/demo/seedData";
import { buildCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  shiftId: z.string().optional(),
  asOf: z.string().optional(),
});

/**
 * GET /api/grid/export?shiftId=&asOf=
 * Exports the full skill grid matrix as a CSV file.
 * Role-aware: Members export only their own row; Admins export the entire org matrix.
 * Includes CSV formula injection protection.
 */
export const GET = withOrgAuth(async (req, ctx) => {
  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse(Object.fromEntries(searchParams.entries()));

  if (!parsed.success) {
    return validationError(parsed);
  }

  const asOf = parsed.data.asOf || today();
  const shiftId = parsed.data.shiftId;
  const isMember = ctx.userRole === "member" && !ctx.isSuperAdmin;

  try {
    if (isMember && !ctx.operatorId) {
      const skills: Array<{ id: string; code: string; name: string }> = await db.sfSkill.findMany({
        where: { orgId: ctx.orgId, isActive: true },
        orderBy: { code: "asc" },
        select: { id: true, code: true, name: true },
      });
      const headers = ["Employee Code", "Operator Name", "Shift", ...skills.map((s) => s.name)];
      const csv = buildCsv(headers, []);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="skillsforge_grid_${asOf}.csv"`,
        },
      });
    }

    const operatorWhere = {
      orgId: ctx.orgId,
      isActive: true,
      ...(shiftId ? { shiftId } : {}),
      ...(isMember ? { id: ctx.operatorId! } : {}),
    };

    const [skillsRaw, operatorsRaw, recordsRaw] = await Promise.all([
      db.sfSkill.findMany({
        where: { orgId: ctx.orgId, isActive: true },
        orderBy: { code: "asc" },
        select: { id: true, code: true, name: true },
      }),
      db.sfOperator.findMany({
        where: operatorWhere,
        orderBy: [{ shiftId: "asc" }, { employeeCode: "asc" }],
        select: {
          id: true,
          employeeCode: true,
          name: true,
          shift: { select: { code: true } },
        },
      }),
      db.sfOperatorSkill.findMany({
        where: { orgId: ctx.orgId },
        select: {
          operatorId: true,
          skillId: true,
          level: true,
          certifiedUntil: true,
        },
      }),
    ]);

    const skills = skillsRaw as Array<{ id: string; code: string; name: string }>;
    const operators = operatorsRaw as Array<{
      id: string;
      employeeCode: string;
      name: string;
      shift: { code: string } | null;
    }>;
    const records = recordsRaw as Array<{
      operatorId: string;
      skillId: string;
      level: number;
      certifiedUntil: Date | null;
    }>;

    const recordMap = new Map<string, { level: number; certifiedUntil: Date | null }>();
    for (const r of records) {
      recordMap.set(`${r.operatorId}_${r.skillId}`, r);
    }

    const headers = ["Employee Code", "Operator Name", "Shift", ...skills.map((s) => s.name)];
    const rows: unknown[][] = [];

    for (const op of operators) {
      const row: unknown[] = [op.employeeCode, op.name, op.shift?.code || ""];
      for (const sk of skills) {
        const rec = recordMap.get(`${op.id}_${sk.id}`);
        const storedLevel = rec ? rec.level : 0;
        const certUntilStr = rec?.certifiedUntil ? formatDateStr(parseDate(rec.certifiedUntil)) : null;
        const effLevel = effectiveLevel(storedLevel, certUntilStr, asOf);
        row.push(effLevel > 0 ? `L${effLevel}` : "0");
      }
      rows.push(row);
    }

    const csv = buildCsv(headers, rows);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="skillsforge_grid_${asOf}.csv"`,
      },
    });
  } catch (err: unknown) {
    const shiftMap = new Map(DEMO_SHIFTS.map((s) => [s.id, s]));
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

    const skills = DEMO_MACHINES;
    const records = getDemoSkillRecords(asOf);
    const recordMap = new Map<string, { level: number; certifiedUntil?: string | Date }>();
    for (const r of records) {
      recordMap.set(`${r.operatorId}_${r.skillId}`, r);
    }

    const headers = ["Employee Code", "Operator Name", "Shift", ...skills.map((s) => s.name)];
    const rows: unknown[][] = [];

    for (const op of ops) {
      const row: unknown[] = [op.employeeCode, op.name, op.shift?.code || ""];
      for (const sk of skills) {
        const rec = recordMap.get(`${op.id}_${sk.id}`);
        const storedLevel = rec ? rec.level : 0;
        const certUntilStr = rec?.certifiedUntil ? formatDateStr(parseDate(rec.certifiedUntil)) : null;
        const effLevel = effectiveLevel(storedLevel, certUntilStr, asOf);
        row.push(effLevel > 0 ? `L${effLevel}` : "0");
      }
      rows.push(row);
    }

    const csv = buildCsv(headers, rows);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="skillsforge_grid_${asOf}.csv"`,
      },
    });
  }
});
