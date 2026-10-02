import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api/requireAdmin";
import { validationError } from "@/lib/api/validationError";
import { writeAuditLog } from "@/lib/api/auditLog";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const updateShiftSchema = z.object({
  code: z.string().trim().min(1).max(10).optional(),
  startTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid start time format (HH:MM)")
    .optional(),
  endTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid end time format (HH:MM)")
    .optional(),
});

interface RouteParams {
  params: { id: string };
}

/**
 * PATCH /api/shifts/[id]
 * Updates an existing shift (admin-only, org-scoped).
 */
export const PATCH = requireAdmin<RouteParams["params"]>(async (req, ctx) => {
  const shiftId = ctx.params.id;

  const existing = await db.sfShift.findFirst({
    where: { id: shiftId, orgId: ctx.orgId },
  });

  if (!existing) {
    return NextResponse.json({ success: false, error: "Shift not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = updateShiftSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed);
  }

  const { code, startTime, endTime } = parsed.data;

  // If code is being updated, verify it is not in use by another shift in this org
  if (code && code !== existing.code) {
    const codeConflict = await db.sfShift.findFirst({
      where: {
        orgId: ctx.orgId,
        code,
        NOT: { id: shiftId },
      },
    });

    if (codeConflict) {
      return NextResponse.json(
        { success: false, error: `Shift with code '${code}' already exists.` },
        { status: 409 }
      );
    }
  }

  try {
    const updated = await db.sfShift.update({
      where: { id: shiftId },
      data: {
        ...(code ? { code } : {}),
        ...(startTime ? { startTime } : {}),
        ...(endTime ? { endTime } : {}),
        updatedBy: ctx.userId,
      },
      select: {
        id: true,
        code: true,
        startTime: true,
        endTime: true,
        updatedAt: true,
      },
    });

    await writeAuditLog({
      orgId: ctx.orgId,
      actorId: ctx.userId,
      actorRole: ctx.userRole,
      action: "UPDATE",
      entityType: "shift",
      entityId: shiftId,
      changes: Object.keys(parsed.data),
      reason: "Shift updated",
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err: unknown) {
    console.error("Error updating shift:", err);
    const message = err instanceof Error ? err.message : "Failed to update shift";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
});

/**
 * DELETE /api/shifts/[id]
 * Deletes a shift (admin-only, org-scoped).
 * Blocks deletion if the shift is referenced by assignments (returns 409 Conflict).
 */
export const DELETE = requireAdmin<RouteParams["params"]>(async (req, ctx) => {
  const shiftId = ctx.params.id;

  const existing = await db.sfShift.findFirst({
    where: { id: shiftId, orgId: ctx.orgId },
  });

  if (!existing) {
    return NextResponse.json({ success: false, error: "Shift not found" }, { status: 404 });
  }

  // Check if shift is referenced by any assignments (Conflict 409)
  const assignmentCount = await db.sfAssignment.count({
    where: { orgId: ctx.orgId, shiftId },
  });

  if (assignmentCount > 0) {
    return NextResponse.json(
      {
        success: false,
        error: "Cannot delete shift: shift is referenced by existing assignments.",
      },
      { status: 409 }
    );
  }

  // Check if shift is assigned to active operators
  const operatorCount = await db.sfOperator.count({
    where: { orgId: ctx.orgId, shiftId },
  });

  if (operatorCount > 0) {
    return NextResponse.json(
      {
        success: false,
        error: "Cannot delete shift: shift is currently assigned to one or more operators.",
      },
      { status: 409 }
    );
  }

  try {
    await db.sfShift.delete({
      where: { id: shiftId },
    });

    await writeAuditLog({
      orgId: ctx.orgId,
      actorId: ctx.userId,
      actorRole: ctx.userRole,
      action: "DELETE",
      entityType: "shift",
      entityId: shiftId,
      changes: ["deleted"],
      reason: "Shift deleted",
    });

    return NextResponse.json({ success: true, data: { id: shiftId } });
  } catch (err: unknown) {
    console.error("Error deleting shift:", err);
    const message = err instanceof Error ? err.message : "Failed to delete shift";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
});
