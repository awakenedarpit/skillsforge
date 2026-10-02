import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withOrgAuth } from "@/lib/api/withOrgAuth";
import { validationError } from "@/lib/api/validationError";
import { canEditSkillGrid } from "@/lib/api/skillsforgePermissions";
import { writeAuditLog } from "@/lib/api/auditLog";
import { db } from "@/lib/db";
import { today, formatDateStr, parseDate, addDaysToStr } from "@/lib/domain/rules";
import { checkAssignment, rankAlternatives, WorkloadMap } from "@/lib/domain/verdict";
import {
  parsePaginationParams,
  paginationToSkipTake,
  buildPaginationResponse,
} from "@quikit/shared";
import {
  DEMO_MACHINES,
  DEMO_OPERATORS,
  getDemoSkillRecords,
  getDemoAssignments,
} from "@/lib/demo/seedData";

export const dynamic = "force-dynamic";

const postSchema = z.object({
  operatorId: z.string().min(1),
  skillId: z.string().min(1),
  assignmentDate: z.string().min(1),
  shiftId: z.string().optional(),
});

/**
 * GET /api/assignments?page=&limit=&operatorId=&skillId=&from=&to=
 * Returns paginated list of assignments for tenant org.
 */
export const GET = withOrgAuth(async (req, ctx) => {
  const { searchParams } = new URL(req.url);
  const paginationParams = parsePaginationParams(searchParams);
  const { skip, take } = paginationToSkipTake(paginationParams);

  const operatorId = searchParams.get("operatorId") || undefined;
  const skillId = searchParams.get("skillId") || undefined;
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where: any = {
    orgId: ctx.orgId,
    ...(operatorId ? { operatorId } : {}),
    ...(skillId ? { skillId } : {}),
  };

  if (from || to) {
    where.assignmentDate = {
      ...(from ? { gte: parseDate(from)! } : {}),
      ...(to ? { lte: parseDate(to)! } : {}),
    };
  }

  try {
    const [total, items] = await Promise.all([
      db.sfAssignment.count({ where }),
      db.sfAssignment.findMany({
        where,
        orderBy: { assignmentDate: "desc" },
        skip,
        take,
        select: {
          id: true,
          operatorId: true,
          skillId: true,
          shiftId: true,
          assignmentDate: true,
          status: true,
          verdict: true,
          reasonsJson: true,
          assignedBy: true,
          createdAt: true,
          operator: { select: { id: true, name: true, employeeCode: true } },
          skill: { select: { id: true, code: true, name: true, nameHi: true } },
          shift: { select: { id: true, code: true } },
        },
      }),
    ]);

    const formatted = items.map((item) => ({
      ...item,
      assignmentDate: formatDateStr(parseDate(item.assignmentDate))!,
    }));

    return NextResponse.json({
      success: true,
      data: buildPaginationResponse(formatted, total, paginationParams),
    });
  } catch (err: unknown) {
    // In-memory fallback
    const demo = getDemoAssignments(today());
    const opMap = new Map(DEMO_OPERATORS.map((o) => [o.id, o]));
    const skMap = new Map(DEMO_MACHINES.map((s) => [s.id, s]));

    const formatted = demo.map((d, i) => ({
      id: `demo-assign-${i}`,
      operatorId: d.operatorId,
      skillId: d.skillId,
      shiftId: d.shiftId,
      assignmentDate: d.assignmentDate,
      status: d.status,
      verdict: d.verdict,
      reasonsJson: null,
      assignedBy: "usr-rohit-2",
      createdAt: new Date().toISOString(),
      operator: opMap.get(d.operatorId),
      skill: skMap.get(d.skillId),
      shift: { id: d.shiftId, code: d.shiftId.split("-")[1].toUpperCase() },
    }));

    return NextResponse.json({
      success: true,
      data: buildPaginationResponse(formatted.slice(skip, skip + take), formatted.length, paginationParams),
    });
  }
});

/**
 * POST /api/assignments
 * Deploys an operator to a machine.
 * Status 201 Created if approved (green).
 * Status 409 Conflict if rejected (red), storing rejected row with reasons.
 */
export const POST = withOrgAuth(async (req, ctx) => {
  if (!canEditSkillGrid(ctx.userRole)) {
    return NextResponse.json({ success: false, error: "Forbidden: insufficient permissions" }, { status: 403 });
  }

  let body = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed);
  }

  const { operatorId, skillId, assignmentDate } = parsed.data;

  try {
    const [targetOperator, targetSkill, targetRecord, allOperators, allShifts, allRecords, assignments] =
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

    const shiftCodes: Record<string, string> = {};
    for (const s of allShifts) {
      shiftCodes[s.id] = s.code;
    }

    const counts: Record<string, number> = {};
    for (const a of assignments) {
      counts[a.operatorId] = (counts[a.operatorId] || 0) + 1;
    }
    const countValues = Object.values(counts);
    const sorted = [...countValues].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length === 0 ? 0 : sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    const workload: WorkloadMap = { counts, median };

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
      shiftCodes
    );

    const isGreen = verdictPayload.verdict === "green";

    const createdAssignment = await db.sfAssignment.create({
      data: {
        orgId: ctx.orgId,
        operatorId,
        skillId,
        shiftId,
        assignmentDate: parseDate(assignmentDate)!,
        status: isGreen ? "accepted" : "rejected",
        verdict: verdictPayload.verdict,
        reasonsJson: isGreen ? null : ({ blocking: verdictPayload.blocking, warnings: verdictPayload.warnings } as any),
        assignedBy: ctx.userId,
      },
      select: {
        id: true,
        operatorId: true,
        skillId: true,
        shiftId: true,
        assignmentDate: true,
        status: true,
        verdict: true,
        assignedBy: true,
      },
    });

    await writeAuditLog({
      orgId: ctx.orgId,
      actorId: ctx.userId,
      actorRole: ctx.userRole,
      action: "CREATE",
      entityType: "assignment",
      entityId: createdAssignment.id,
      changes: ["operatorId", "skillId", "status", "verdict"],
      reason: isGreen ? "Operator deployment accepted" : "Operator deployment rejected",
    });

    if (isGreen) {
      return NextResponse.json(
        {
          success: true,
          data: {
            ...createdAssignment,
            assignmentDate: formatDateStr(parseDate(createdAssignment.assignmentDate))!,
          },
        },
        { status: 201 }
      );
    } else {
      const summaryReason =
        verdictPayload.blocking.map((b) => b.message).join("; ") || "Assignment rejected due to qualification failure";
      return NextResponse.json({ success: false, error: summaryReason }, { status: 409 });
    }
  } catch (err: unknown) {
    // In-memory fallback
    const targetOperator = DEMO_OPERATORS.find((o) => o.id === operatorId);
    const targetSkill = DEMO_MACHINES.find((s) => s.id === skillId);

    if (!targetOperator || !targetSkill) {
      return NextResponse.json({ success: false, error: "Resource not found" }, { status: 404 });
    }

    const shiftId = parsed.data.shiftId || targetOperator.shiftId;
    const allRecords = getDemoSkillRecords(assignmentDate);
    const targetRecord = allRecords.find((r) => r.operatorId === operatorId && r.skillId === skillId) || null;

    const verdictPayload = checkAssignment(
      targetOperator,
      targetSkill,
      targetRecord,
      assignmentDate,
      shiftId
    );

    if (verdictPayload.verdict === "green") {
      return NextResponse.json(
        {
          success: true,
          data: {
            id: `demo-assign-${Date.now()}`,
            operatorId,
            skillId,
            shiftId,
            assignmentDate,
            status: "accepted",
            verdict: "green",
            assignedBy: ctx.userId,
          },
        },
        { status: 201 }
      );
    } else {
      const summaryReason =
        verdictPayload.blocking.map((b) => b.message).join("; ") || "Assignment rejected due to qualification failure";
      return NextResponse.json({ success: false, error: summaryReason }, { status: 409 });
    }
  }
});
