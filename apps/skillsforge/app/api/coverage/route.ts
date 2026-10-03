import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withOrgAuth } from "@/lib/api/withOrgAuth";
import { validationError } from "@/lib/api/validationError";
import { db } from "@/lib/db";
import { today, parseDate } from "@/lib/domain/rules";
import { buildCoverage } from "@/lib/domain/coverage";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  asOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD").optional(),
});

/**
 * GET /api/coverage?asOf=YYYY-MM-DD
 * Builds the skill/shift coverage heatmap from Prisma-backed organization data.
 */
export const GET = withOrgAuth(async (req: NextRequest, ctx) => {
  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse(Object.fromEntries(searchParams.entries()));
  if (!parsed.success) return validationError(parsed.error);

  const asOf = parsed.data.asOf || today();
  if (!parseDate(asOf)) {
    return NextResponse.json({ success: false, error: "Invalid date" }, { status: 400 });
  }

  const [shifts, skills, operators, records] = await Promise.all([
    db.sfShift.findMany({
      where: { orgId: ctx.orgId },
      orderBy: { code: "asc" },
      select: { id: true, code: true, startTime: true, endTime: true },
    }),
    db.sfSkill.findMany({
      where: { orgId: ctx.orgId, isActive: true },
      orderBy: { code: "asc" },
      select: {
        id: true,
        code: true,
        name: true,
        nameHi: true,
        lineKey: true,
        criticality: true,
        isActive: true,
      },
    }),
    db.sfOperator.findMany({
      where: { orgId: ctx.orgId, isActive: true },
      orderBy: [{ shiftId: "asc" }, { employeeCode: "asc" }],
      select: { id: true, employeeCode: true, name: true, shiftId: true, isActive: true },
    }),
    db.sfOperatorSkill.findMany({
      where: { orgId: ctx.orgId },
      select: { operatorId: true, skillId: true, level: true, issuedOn: true, certifiedUntil: true },
    }),
  ]);

  const data = buildCoverage(operators, skills, shifts, records, asOf);
  return NextResponse.json({ success: true, data });
});
