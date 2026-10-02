import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withOrgAuth } from "@/lib/api/withOrgAuth";
import { validationError } from "@/lib/api/validationError";
import { db } from "@/lib/db";
import { today, formatDateStr, parseDate } from "@/lib/domain/rules";
import { simulateRemoval } from "@/lib/domain/coverage";
import {
  DEMO_MACHINES,
  DEMO_OPERATORS,
  DEMO_SHIFTS,
  getDemoSkillRecords,
} from "@/lib/demo/seedData";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  operatorId: z.string().min(1, "operatorId is required"),
  skillId: z.string().optional(),
  asOf: z.string().optional(),
});

/**
 * GET /api/simulate/resignation?operatorId=&skillId=&asOf=
 * MVP-1: Read-only simulation of an operator departure or skill qualification removal.
 * Returns before vs after coverage heatmaps, newly red cells, worsened cells,
 * and machines that lose their last qualified trainer.
 */
export const GET = withOrgAuth(async (req, ctx) => {
  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse(Object.fromEntries(searchParams.entries()));

  if (!parsed.success) {
    return validationError(parsed);
  }

  const { operatorId, skillId } = parsed.data;
  const asOf = parsed.data.asOf || today();

  try {
    const [shifts, skills, operators, records] = await Promise.all([
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

    const targetOp = operators.find((op) => op.id === operatorId);
    if (!targetOp) {
      return NextResponse.json(
        { success: false, error: "Operator not found" },
        { status: 404 }
      );
    }

    const domainRecords = records.map((r) => ({
      operatorId: r.operatorId,
      skillId: r.skillId,
      level: r.level,
      issuedOn: r.issuedOn ? formatDateStr(parseDate(r.issuedOn)) : null,
      certifiedUntil: r.certifiedUntil ? formatDateStr(parseDate(r.certifiedUntil)) : null,
    }));

    const result = simulateRemoval(
      operators,
      skills,
      shifts,
      domainRecords,
      operatorId,
      asOf,
      skillId || null
    );

    const skillsMap = new Map(skills.map((s) => [s.id, s]));
    const shiftsMap = new Map(shifts.map((s) => [s.id, s]));

    return NextResponse.json({
      success: true,
      data: {
        asOf,
        operator: targetOp,
        skill: skillId ? skillsMap.get(skillId) || null : null,
        summary: {
          newlyRedCount: result.newlyRed.length,
          worsenedCount: result.worsened.length,
          lostTrainersCount: result.lostAllTrainers.length,
        },
        newlyRed: result.newlyRed.map((nr) => ({
          ...nr,
          skill: skillsMap.get(nr.skillId),
          shift: shiftsMap.get(nr.shiftId),
        })),
        worsened: result.worsened.map((w) => ({
          ...w,
          skill: skillsMap.get(w.skillId),
          shift: shiftsMap.get(w.shiftId),
        })),
        lostAllTrainers: result.lostAllTrainers.map((sId) => skillsMap.get(sId)).filter(Boolean),
        before: result.before,
        after: result.after,
      },
    });
  } catch (err: unknown) {
    // In-memory fallback
    const targetOp = DEMO_OPERATORS.find((op) => op.id === operatorId);
    if (!targetOp) {
      return NextResponse.json(
        { success: false, error: "Operator not found" },
        { status: 404 }
      );
    }

    const result = simulateRemoval(
      DEMO_OPERATORS,
      DEMO_MACHINES,
      DEMO_SHIFTS,
      getDemoSkillRecords(asOf),
      operatorId,
      asOf,
      skillId || null
    );

    const skillsMap = new Map(DEMO_MACHINES.map((s) => [s.id, s]));
    const shiftsMap = new Map(DEMO_SHIFTS.map((s) => [s.id, s]));

    return NextResponse.json({
      success: true,
      data: {
        asOf,
        operator: targetOp,
        skill: skillId ? skillsMap.get(skillId) || null : null,
        summary: {
          newlyRedCount: result.newlyRed.length,
          worsenedCount: result.worsened.length,
          lostTrainersCount: result.lostAllTrainers.length,
        },
        newlyRed: result.newlyRed.map((nr) => ({
          ...nr,
          skill: skillsMap.get(nr.skillId),
          shift: shiftsMap.get(nr.shiftId),
        })),
        worsened: result.worsened.map((w) => ({
          ...w,
          skill: skillsMap.get(w.skillId),
          shift: shiftsMap.get(w.shiftId),
        })),
        lostAllTrainers: result.lostAllTrainers.map((sId) => skillsMap.get(sId)).filter(Boolean),
        before: result.before,
        after: result.after,
      },
    });
  }
});
