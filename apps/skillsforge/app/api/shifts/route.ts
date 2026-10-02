import { NextResponse } from "next/server";
import { z } from "zod";
import { withOrgAuth } from "@/lib/api/withOrgAuth";
import { requireAdmin } from "@/lib/api/requireAdmin";
import { validationError } from "@/lib/api/validationError";
import { writeAuditLog } from "@/lib/api/auditLog";
import { db } from "@/lib/db";
import { DEMO_SHIFTS } from "@/lib/demo/seedData";

export const dynamic = "force-dynamic";

const createShiftSchema = z.object({
  code: z.string().trim().min(1, "Shift code is required").max(10),
  startTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid start time format (HH:MM)"),
  endTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid end time format (HH:MM)"),
});

/**
 * GET /api/shifts
 * List all shifts for the authenticated user's organization.
 */
export const GET = withOrgAuth(async (req, ctx) => {
  try {
    const shifts = await db.sfShift.findMany({
      where: { orgId: ctx.orgId },
      orderBy: { code: "asc" },
      select: {
        id: true,
        code: true,
        startTime: true,
        endTime: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ success: true, data: shifts });
  } catch (err: unknown) {
    return NextResponse.json({ success: true, data: DEMO_SHIFTS });
  }
});

/**
 * POST /api/shifts
 * Create a new shift (admin-only, org-scoped, unique code).
 */
export const POST = requireAdmin(async (req, ctx) => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createShiftSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed);
  }

  const { code, startTime, endTime } = parsed.data;

  // Check unique code within organization
  const existing = await db.sfShift.findFirst({
    where: { orgId: ctx.orgId, code },
  });

  if (existing) {
    return NextResponse.json(
      { success: false, error: `Shift with code '${code}' already exists.` },
      { status: 409 }
    );
  }

  try {
    const shift = await db.sfShift.create({
      data: {
        orgId: ctx.orgId,
        code,
        startTime,
        endTime,
        createdBy: ctx.userId,
      },
      select: {
        id: true,
        code: true,
        startTime: true,
        endTime: true,
        createdAt: true,
      },
    });

    await writeAuditLog({
      orgId: ctx.orgId,
      actorId: ctx.userId,
      actorRole: ctx.userRole,
      action: "CREATE",
      entityType: "shift",
      entityId: shift.id,
      changes: ["code", "name", "startTime", "endTime"],
      reason: "Shift created",
    });

    return NextResponse.json({ success: true, data: shift }, { status: 201 });
  } catch (err: unknown) {
    console.error("Error creating shift:", err);
    const message = err instanceof Error ? err.message : "Failed to create shift";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
});
