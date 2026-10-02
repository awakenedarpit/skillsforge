import { NextResponse } from "next/server";
import { withOrgAuth } from "@/lib/api/withOrgAuth";
import { canEditSkillGrid, isOrgAdmin } from "@/lib/api/skillsforgePermissions";
import { db } from "@/lib/db";
import {
  today,
  QUALIFIED_MIN_LEVEL,
  MIN_COVERAGE,
  EXPIRY_WINDOW_DAYS,
  CRITICALITY_WEIGHT,
  LEVEL_LABELS,
} from "@/lib/domain/rules";
import { DEMO_MACHINES, DEMO_SHIFTS } from "@/lib/demo/seedData";

export const dynamic = "force-dynamic";

export const GET = withOrgAuth(async (_req, ctx) => {
  let shifts: unknown[] = [];
  let machines: unknown[] = [];

  try {
    shifts = await db.sfShift.findMany({
      where: { orgId: ctx.orgId },
      orderBy: { code: "asc" },
      select: { id: true, code: true, startTime: true, endTime: true },
    });

    machines = await db.sfSkill.findMany({
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
    });
  } catch (err: unknown) {
    // If DB is offline or table empty, fallback to demo constants
    shifts = DEMO_SHIFTS;
    machines = DEMO_MACHINES;
  }

  if (shifts.length === 0) shifts = DEMO_SHIFTS;
  if (machines.length === 0) machines = DEMO_MACHINES;

  return NextResponse.json({
    success: true,
    data: {
      today: today(),
      shifts,
      machines,
      rules: {
        qualifiedMinLevel: QUALIFIED_MIN_LEVEL,
        minCoverage: MIN_COVERAGE,
        expiryWindowDays: EXPIRY_WINDOW_DAYS,
        criticalityWeight: CRITICALITY_WEIGHT,
        levels: LEVEL_LABELS,
      },
      user: {
        id: ctx.userId,
        name: ctx.userName,
        role: ctx.userRole,
        isSuperAdmin: ctx.isSuperAdmin,
        canEdit: canEditSkillGrid(ctx.userRole),
        isAdmin: isOrgAdmin(ctx.userRole),
      },
    },
  });
});
