import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withOrgAuth } from "@/lib/api/withOrgAuth";
import { requireAdmin } from "@/lib/api/requireAdmin";
import { validationError } from "@/lib/api/validationError";
import { writeAuditLog } from "@/lib/api/auditLog";
import { db } from "@/lib/db";
import { parsePaginationParams, paginationToSkipTake, buildPaginationResponse } from "@quikit/shared";
import { DEMO_OPERATORS } from "@/lib/demo/seedData";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  shiftId: z.string().optional(),
  isActive: z.enum(["true", "false"]).optional(),
  q: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

const createOperatorSchema = z.object({
  employeeCode: z.string().trim().min(1, "Employee code is required"),
  name: z.string().trim().min(1, "Name is required"),
  shiftId: z.string().trim().min(1, "Shift is required"),
});

export const GET = withOrgAuth(async (req, ctx) => {
  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse(Object.fromEntries(searchParams.entries()));

  if (!parsed.success) {
    return validationError(parsed);
  }

  const { shiftId, isActive, q } = parsed.data;
  const pagination = parsePaginationParams(searchParams);
  const { skip, take } = paginationToSkipTake(pagination);

  try {
    const where: any = {
      orgId: ctx.orgId,
      ...(shiftId ? { shiftId } : {}),
      ...(isActive !== undefined ? { isActive: isActive === "true" } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { employeeCode: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      db.sfOperator.count({ where }),
      db.sfOperator.findMany({
        where,
        skip,
        take,
        orderBy: { employeeCode: "asc" },
        select: {
          id: true,
          employeeCode: true,
          name: true,
          shiftId: true,
          isActive: true,
          leftOn: true,
          shift: { select: { id: true, code: true, startTime: true, endTime: true } },
        },
      }),
    ]);

    const res = buildPaginationResponse(items, total, pagination);
    return NextResponse.json({ success: true, data: res });
  } catch (err: unknown) {
    // In-memory fallback if DB is unreachable
    let filtered = DEMO_OPERATORS;
    if (shiftId) filtered = filtered.filter((o) => o.shiftId === shiftId);
    if (isActive !== undefined) filtered = filtered.filter((o) => o.isActive === (isActive === "true"));
    if (q) {
      const qLower = q.toLowerCase();
      filtered = filtered.filter(
        (o) => o.name.toLowerCase().includes(qLower) || o.employeeCode.toLowerCase().includes(qLower)
      );
    }
    const total = filtered.length;
    const paged = filtered.slice(skip, skip + take);
    const res = buildPaginationResponse(paged, total, pagination);
    return NextResponse.json({ success: true, data: res });
  }
});

export const POST = requireAdmin(async (req, ctx) => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createOperatorSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed);
  }

  const { employeeCode, name, shiftId } = parsed.data;

  // Check unique employee code within org
  const existing = await db.sfOperator.findFirst({
    where: { orgId: ctx.orgId, employeeCode },
  });

  if (existing) {
    return NextResponse.json(
      { success: false, error: `Operator with code '${employeeCode}' already exists.` },
      { status: 409 }
    );
  }

  const operator = await db.sfOperator.create({
    data: {
      orgId: ctx.orgId,
      employeeCode,
      name,
      shiftId,
      isActive: true,
      createdBy: ctx.userId,
    },
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
    action: "CREATE",
    entityType: "operator",
    entityId: operator.id,
    changes: ["employeeCode", "name", "shiftId"],
  });

  return NextResponse.json({ success: true, data: operator }, { status: 201 });
});
