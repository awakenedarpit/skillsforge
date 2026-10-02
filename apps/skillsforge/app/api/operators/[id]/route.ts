import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withOrgAuth } from "@/lib/api/withOrgAuth";
import { requireAdmin } from "@/lib/api/requireAdmin";
import { validationError } from "@/lib/api/validationError";
import { writeAuditLog } from "@/lib/api/auditLog";
import { db } from "@/lib/db";
import { today, parseDate } from "@/lib/domain/rules";

export const dynamic = "force-dynamic";

const patchOperatorSchema = z.object({
  name: z.string().trim().min(1).optional(),
  shiftId: z.string().trim().min(1).optional(),
  isActive: z.boolean().optional(),
});

interface RouteParams {
  id: string;
}

export const GET = withOrgAuth<RouteParams>(async (_req, ctx) => {
  const { id } = ctx.params;

  const operator = await db.sfOperator.findFirst({
    where: { id, orgId: ctx.orgId },
    select: {
      id: true,
      employeeCode: true,
      name: true,
      shiftId: true,
      isActive: true,
      leftOn: true,
      shift: { select: { id: true, code: true, startTime: true, endTime: true } },
    },
  });

  if (!operator) {
    return NextResponse.json({ success: false, error: "Operator not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: operator });
});

export const PATCH = requireAdmin<RouteParams>(async (req, ctx) => {
  const { id } = ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = patchOperatorSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed);
  }

  const existing = await db.sfOperator.findFirst({
    where: { id, orgId: ctx.orgId },
  });

  if (!existing) {
    return NextResponse.json({ success: false, error: "Operator not found" }, { status: 404 });
  }

  const dataToUpdate: any = {
    ...parsed.data,
    updatedBy: ctx.userId,
  };

  if (parsed.data.isActive === false && existing.isActive) {
    dataToUpdate.leftOn = parseDate(today());
  } else if (parsed.data.isActive === true) {
    dataToUpdate.leftOn = null;
  }

  await db.sfOperator.updateMany({
    where: { id, orgId: ctx.orgId },
    data: dataToUpdate,
  });

  const updated = await db.sfOperator.findFirst({
    where: { id, orgId: ctx.orgId },
    select: {
      id: true,
      employeeCode: true,
      name: true,
      shiftId: true,
      isActive: true,
      leftOn: true,
    },
  });

  await writeAuditLog({
    orgId: ctx.orgId,
    actorId: ctx.userId,
    actorRole: ctx.userRole,
    action: "UPDATE",
    entityType: "operator",
    entityId: id,
    changes: Object.keys(parsed.data),
  });

  return NextResponse.json({ success: true, data: updated });
});

export const DELETE = requireAdmin<RouteParams>(async (_req, ctx) => {
  const { id } = ctx.params;

  const existing = await db.sfOperator.findFirst({
    where: { id, orgId: ctx.orgId },
  });

  if (!existing) {
    return NextResponse.json({ success: false, error: "Operator not found" }, { status: 404 });
  }

  const leftOnDate = parseDate(today());

  await db.sfOperator.updateMany({
    where: { id, orgId: ctx.orgId },
    data: {
      isActive: false,
      leftOn: leftOnDate,
      updatedBy: ctx.userId,
    },
  });

  await writeAuditLog({
    orgId: ctx.orgId,
    actorId: ctx.userId,
    actorRole: ctx.userRole,
    action: "DELETE",
    entityType: "operator",
    entityId: id,
    changes: ["isActive", "leftOn"],
    reason: "Soft deactivate operator",
  });

  return NextResponse.json({
    success: true,
    data: { id, isActive: false, leftOn: today() },
  });
});
