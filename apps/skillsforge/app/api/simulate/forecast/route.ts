import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withOrgAuth } from "@/lib/api/withOrgAuth";
import { validationError } from "@/lib/api/validationError";
import { db } from "@/lib/db";
import { today, formatDateStr, parseDate } from "@/lib/domain/rules";
import {
  projectCoverageForecast,
  type ShiftDomainView,
  type SkillDomainView,
  type OperatorDomainView,
  type SkillRecordDomain,
} from "@/lib/domain/coverage";
import {
  DEMO_MACHINES,
  DEMO_OPERATORS,
  DEMO_SHIFTS,
  getDemoSkillRecords,
} from "@/lib/demo/seedData";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  horizon: z.coerce.number().int().min(1).max(365).default(30),
  asOf: z.string().optional(),
});

interface ShiftRow {
  id: string;
  code: string;
  startTime: string;
  endTime: string;
}

interface SkillRow {
  id: string;
  code: string;
  name: string;
  nameHi: string | null;
  lineKey: string;
  criticality: number;
  isActive: boolean;
}

interface OperatorRow {
  id: string;
  name: string;
  employeeCode: string;
  shiftId: string;
  isActive: boolean;
}

interface RecordRow {
  operatorId: string;
  skillId: string;
  level: number;
  issuedOn: Date | string | null;
  certifiedUntil: Date | string | null;
}

export const GET = withOrgAuth(async (req: NextRequest, ctx) => {
  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse(Object.fromEntries(searchParams.entries()));

  if (!parsed.success) {
    return validationError(parsed);
  }

  const { horizon } = parsed.data;
  const asOf = parsed.data.asOf || today();

  try {
    const [shifts, skills, operators, records]: [
      ShiftRow[],
      SkillRow[],
      OperatorRow[],
      RecordRow[]
    ] = await Promise.all([
      db.sfShift.findMany({
        where: { orgId: ctx.orgId },
        orderBy: { code: "asc" },
        select: { id: true, code: true, startTime: true, endTime: true },
      }),
      db.sfSkill.findMany({
        where: { orgId: ctx.orgId, isActive: true },
        orderBy: [{ criticality: "desc" }, { code: "asc" }],
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
        select: { id: true, name: true, employeeCode: true, shiftId: true, isActive: true },
      }),
      db.sfOperatorSkill.findMany({
        where: { orgId: ctx.orgId },
        take: 1000,
        select: {
          operatorId: true,
          skillId: true,
          level: true,
          issuedOn: true,
          certifiedUntil: true,
        },
      }),
    ]);

    const domainRecords: SkillRecordDomain[] = records.map((r: RecordRow) => ({
      operatorId: r.operatorId,
      skillId: r.skillId,
      level: r.level,
      issuedOn: r.issuedOn ? formatDateStr(parseDate(r.issuedOn)) : null,
      certifiedUntil: r.certifiedUntil ? formatDateStr(parseDate(r.certifiedUntil)) : null,
    }));

    const result = projectCoverageForecast(
      operators as OperatorDomainView[],
      skills as SkillDomainView[],
      shifts as ShiftDomainView[],
      domainRecords,
      asOf,
      horizon
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err: unknown) {
    console.error("Simulation forecast DB error, falling back to demo data:", err);

    const demoRecords = getDemoSkillRecords(asOf);

    const result = projectCoverageForecast(
      DEMO_OPERATORS,
      DEMO_MACHINES,
      DEMO_SHIFTS,
      demoRecords,
      asOf,
      horizon
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  }
});
