import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withOrgAuth } from "@/lib/api/withOrgAuth";
import { validationError } from "@/lib/api/validationError";
import { db } from "@/lib/db";
import { today, addDaysToStr, parseDate } from "@/lib/domain/rules";
import { workloadStats } from "@/lib/domain/workload";
import { DEMO_OPERATORS, getDemoAssignments } from "@/lib/demo/seedData";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  days: z.coerce.number().min(1).max(90).default(14).optional(),
});

/**
 * GET /api/workload?days=14
 * Returns accepted assignments distribution, median, overload flags,
 * and top 3 share percentage over the specified trailing window.
 */
export const GET = withOrgAuth(async (req, ctx) => {
  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse(Object.fromEntries(searchParams.entries()));

  if (!parsed.success) {
    return validationError(parsed);
  }

  const days = parsed.data.days || 14;
  const asOf = today();
  const cutoffDate = parseDate(addDaysToStr(asOf, -days))!;

  try {
    const [operators, assignments] = await Promise.all([
      db.sfOperator.findMany({
        where: { orgId: ctx.orgId, isActive: true },
        select: { id: true, name: true, employeeCode: true, shiftId: true },
      }),
      db.sfAssignment.findMany({
        where: {
          orgId: ctx.orgId,
          status: "accepted",
          assignmentDate: {
            gte: cutoffDate,
            lte: parseDate(asOf)!,
          },
        },
        select: { operatorId: true, status: true },
      }),
    ]);

    const result = workloadStats(operators, assignments);

    return NextResponse.json({
      success: true,
      data: {
        days,
        asOf,
        ...result,
      },
    });
  } catch (err: unknown) {
    // In-memory fallback
    const demo = getDemoAssignments(asOf);
    const result = workloadStats(DEMO_OPERATORS, demo);

    return NextResponse.json({
      success: true,
      data: {
        days,
        asOf,
        ...result,
      },
    });
  }
});
