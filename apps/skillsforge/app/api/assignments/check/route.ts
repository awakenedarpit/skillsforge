import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withOrgAuth } from "@/lib/api/withOrgAuth";
import { validationError } from "@/lib/api/validationError";
import { db } from "@/lib/db";
import { today, formatDateStr, parseDate, addDaysToStr } from "@/lib/domain/rules";
import { checkAssignment, rankAlternatives, WorkloadMap } from "@/lib/domain/verdict";
import {
  DEMO_MACHINES,
  DEMO_OPERATORS,
  DEMO_SHIFTS,
  getDemoSkillRecords,
  getDemoAssignments,
} from "@/lib/demo/seedData";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  operatorId: z.string().min(1),
  skillId: z.string().min(1),
  assignmentDate: z.string().optional(),
  shiftId: z.string().optional(),
});

/**
 * GET /api/assignments/check?operatorId=&skillId=&assignmentDate=&shiftId=
 * Returns a read-only qualification verdict (green/red), blocking reasons, warnings,
 * and top 3 qualified alternatives.
 */
export const GET = withOrgAuth(async (req, ctx) => {
  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse(Object.fromEntries(searchParams.entries()));

  if (!parsed.success) {
    return validationError(parsed);
  }

  const { operatorId, skillId } = parsed.data;
  const assignmentDate = parsed.data.assignmentDate || today();

  try {
    const [targetOperator, targetSkill, targetRecord, allOperators, allSkills, allShifts, allRecords, assignments] =
      await Promise.all([
        db.sfOperator.findFirst({
          where: { id: operatorId, orgId: ctx.orgId },
          select: { id: true, name: true, shiftId: true, isActive: true },
        }),
        db.sfSkill.findFirst({
          where: { id: skillId, orgId: ctx.orgId, isActive: true },
          select: { id: true, code: true, name: true, nameHi: true, lineKey: true, criticality: true, isActive: true },
        }),
        db.sfOperatorSkill.findFirst({
          where: { operatorId, skillId, orgId: ctx.orgId },
          select: { operatorId: true, skillId: true, level: true, issuedOn: true, certifiedUntil: true },
        }),
        db.sfOperator.findMany({
          where: { orgId: ctx.orgId, isActive: true },
          select: { id: true, name: true, shiftId: true, isActive: true },
        }),
        db.sfSkill.findMany({
          where: { orgId: ctx.orgId, isActive: true },
          select: { id: true, code: true, name: true, nameHi: true, lineKey: true, criticality: true, isActive: true },
        }),
        db.sfShift.findMany({
          where: { orgId: ctx.orgId },
          select: { id: true, code: true, startTime: true, endTime: true },
        }),
        db.sfOperatorSkill.findMany({
          where: { orgId: ctx.orgId },
          take: 1000,
          select: { operatorId: true, skillId: true, level: true, issuedOn: true, certifiedUntil: true },
        }),
        db.sfAssignment.findMany({
          where: {
            orgId: ctx.orgId,
            status: "accepted",
            assignmentDate: {
              gte: parseDate(addDaysToStr(assignmentDate, -14))!,
              lte: parseDate(assignmentDate)!,
            },
          },
          select: { operatorId: true, status: true },
        }),
      ]);

    if (!targetOperator) {
      return NextResponse.json({ success: false, error: "Operator not found" }, { status: 404 });
    }
    if (!targetSkill) {
      return NextResponse.json({ success: false, error: "Machine not found" }, { status: 404 });
    }

    const shiftId = parsed.data.shiftId || targetOperator.shiftId;

    // Shift lookup
    const shiftCodes: Record<string, string> = {};
    for (const s of allShifts) {
      shiftCodes[s.id] = s.code;
    }

    // Workload calculation
    const counts: Record<string, number> = {};
    for (const a of assignments) {
      counts[a.operatorId] = (counts[a.operatorId] || 0) + 1;
    }
    const countValues = Object.values(counts);
    const sorted = [...countValues].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length === 0 ? 0 : sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    const workload: WorkloadMap = { counts, median };

    const mappedRecords = allRecords.map((r: any) => ({
      operatorId: r.operatorId,
      skillId: r.skillId,
      level: r.level,
      issuedOn: r.issuedOn ? formatDateStr(parseDate(r.issuedOn)) : null,
      certifiedUntil: r.certifiedUntil ? formatDateStr(parseDate(r.certifiedUntil)) : null,
    }));

    const alternatives = rankAlternatives(
      allOperators,
      targetSkill,
      mappedRecords,
      assignmentDate,
      shiftId,
      workload,
      operatorId,
      shiftCodes
    );

    const recordForTarget = targetRecord
      ? {
          operatorId: targetRecord.operatorId,
          skillId: targetRecord.skillId,
          level: targetRecord.level,
          issuedOn: targetRecord.issuedOn ? formatDateStr(parseDate(targetRecord.issuedOn)) : null,
          certifiedUntil: targetRecord.certifiedUntil ? formatDateStr(parseDate(targetRecord.certifiedUntil)) : null,
        }
      : null;

    const verdictPayload = checkAssignment(
      targetOperator,
      targetSkill,
      recordForTarget,
      assignmentDate,
      shiftId,
      workload,
      shiftCodes,
      alternatives
    );

    return NextResponse.json({
      success: true,
      data: verdictPayload,
    });
  } catch (err: unknown) {
    // Offline demo fallback
    const targetOperator = DEMO_OPERATORS.find((o) => o.id === operatorId);
    const targetSkill = DEMO_MACHINES.find((s) => s.id === skillId);

    if (!targetOperator) {
      return NextResponse.json({ success: false, error: "Operator not found" }, { status: 404 });
    }
    if (!targetSkill) {
      return NextResponse.json({ success: false, error: "Machine not found" }, { status: 404 });
    }

    const shiftId = parsed.data.shiftId || targetOperator.shiftId;
    const allRecords = getDemoSkillRecords(assignmentDate);
    const targetRecord = allRecords.find((r) => r.operatorId === operatorId && r.skillId === skillId) || null;

    const shiftCodes: Record<string, string> = {
      "shift-a": "A",
      "shift-b": "B",
      "shift-c": "C",
    };

    const demoAssignments = getDemoAssignments(assignmentDate);
    const counts: Record<string, number> = {};
    for (const a of demoAssignments) {
      counts[a.operatorId] = (counts[a.operatorId] || 0) + 1;
    }
    const countValues = Object.values(counts);
    const sorted = [...countValues].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length === 0 ? 0 : sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    const workload: WorkloadMap = { counts, median };

    const alternatives = rankAlternatives(
      DEMO_OPERATORS,
      targetSkill,
      allRecords,
      assignmentDate,
      shiftId,
      workload,
      operatorId,
      shiftCodes
    );

    const verdictPayload = checkAssignment(
      targetOperator,
      targetSkill,
      targetRecord,
      assignmentDate,
      shiftId,
      workload,
      shiftCodes,
      alternatives
    );

    return NextResponse.json({
      success: true,
      data: verdictPayload,
    });
  }
});
