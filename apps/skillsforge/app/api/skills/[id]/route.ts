import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withOrgAuth } from "@/lib/api/withOrgAuth";
import { requireAdmin } from "@/lib/api/requireAdmin";
import { validationError } from "@/lib/api/validationError";
import { writeAuditLog } from "@/lib/api/auditLog";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const patchSkillSchema = z.object({
  name: z.string().trim().min(1).optional(),
  nameHi: z.string().trim().optional().nullable(),
  lineKey: z.enum(["MACHINING", "FORMING", "JOINING", "FINISHING"]).optional(),
  criticality: z.number().int().min(1).max(3).optional(),
  isActive: z.boolean().optional(),
});

interface RouteParams {
  id: string;
}

export const GET = withOrgAuth<RouteParams>(async (_req, ctx) => {
  const { id } = ctx.params;

  const skill = await db.sfSkill.findFirst({
    where: { id, orgId: ctx.orgId },
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

  if (!skill) {
    return NextResponse.json({ success: false, error: "Machine not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: skill });
});

export const PATCH = requireAdmin<RouteParams>(async (req, ctx) => {
  const { id } = ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = patchSkillSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed);
  }

  const existing = await db.sfSkill.findFirst({
    where: { id, orgId: ctx.orgId },
  });

  if (!existing) {
    return NextResponse.json({ success: false, error: "Machine not found" }, { status: 404 });
  }

  await db.sfSkill.updateMany({
    where: { id, orgId: ctx.orgId },
    data: {
      ...parsed.data,
      updatedBy: ctx.userId,
    },
  });

  const updated = await db.sfSkill.findFirst({
    where: { id, orgId: ctx.orgId },
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

  await writeAuditLog({
    orgId: ctx.orgId,
    actorId: ctx.userId,
    actorRole: ctx.userRole,
    action: "UPDATE",
    entityType: "skill",
    entityId: id,
    changes: Object.keys(parsed.data),
  });

  return NextResponse.json({ success: true, data: updated });
});

export const DELETE = requireAdmin<RouteParams>(async (_req, ctx) => {
  const { id } = ctx.params;

  const existing = await db.sfSkill.findFirst({
    where: { id, orgId: ctx.orgId },
  });

  if (!existing) {
    return NextResponse.json({ success: false, error: "Machine not found" }, { status: 404 });
  }

  await db.sfSkill.updateMany({
    where: { id, orgId: ctx.orgId },
    data: {
      isActive: false,
      updatedBy: ctx.userId,
    },
  });

  await writeAuditLog({
    orgId: ctx.orgId,
    actorId: ctx.userId,
    actorRole: ctx.userRole,
    action: "DELETE",
    entityType: "skill",
    entityId: id,
    changes: ["isActive"],
    reason: "Soft deactivate machine",
  });

  return NextResponse.json({
    success: true,
    data: { id, isActive: false },
  });
});
