import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withOrgAuth } from "@/lib/api/withOrgAuth";
import { requireAdmin } from "@/lib/api/requireAdmin";
import { validationError } from "@/lib/api/validationError";
import { writeAuditLog } from "@/lib/api/auditLog";
import { db } from "@/lib/db";
import { parsePaginationParams, paginationToSkipTake, buildPaginationResponse } from "@quikit/shared";
import { DEMO_MACHINES } from "@/lib/demo/seedData";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  lineKey: z.string().optional(),
  isActive: z.enum(["true", "false"]).optional(),
  q: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

const createSkillSchema = z.object({
  code: z.string().trim().min(1, "Code is required"),
  name: z.string().trim().min(1, "Name is required"),
  nameHi: z.string().trim().optional(),
  lineKey: z.enum(["MACHINING", "FORMING", "JOINING", "FINISHING"]),
  criticality: z.number().int().min(1).max(3).default(2),
});

export const GET = withOrgAuth(async (req, ctx) => {
  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse(Object.fromEntries(searchParams.entries()));

  if (!parsed.success) {
    return validationError(parsed);
  }

  const { lineKey, isActive, q } = parsed.data;
  const pagination = parsePaginationParams(searchParams);
  const { skip, take } = paginationToSkipTake(pagination);

  try {
    const where: any = {
      orgId: ctx.orgId,
      ...(lineKey ? { lineKey } : {}),
      ...(isActive !== undefined ? { isActive: isActive === "true" } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { code: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      db.sfSkill.count({ where }),
      db.sfSkill.findMany({
        where,
        skip,
        take,
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
      }),
    ]);

    const res = buildPaginationResponse(items, total, pagination);
    return NextResponse.json({ success: true, data: res });
  } catch (err: unknown) {
    // In-memory fallback if DB is unreachable
    let filtered = DEMO_MACHINES;
    if (lineKey) filtered = filtered.filter((s) => s.lineKey === lineKey);
    if (isActive !== undefined) filtered = filtered.filter((s) => s.isActive === (isActive === "true"));
    if (q) {
      const qLower = q.toLowerCase();
      filtered = filtered.filter(
        (s) => s.name.toLowerCase().includes(qLower) || s.code.toLowerCase().includes(qLower)
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

  const parsed = createSkillSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed);
  }

  const { code, name, nameHi, lineKey, criticality } = parsed.data;

  // Check unique code within org
  const existing = await db.sfSkill.findFirst({
    where: { orgId: ctx.orgId, code },
  });

  if (existing) {
    return NextResponse.json(
      { success: false, error: `Machine with code '${code}' already exists.` },
      { status: 409 }
    );
  }

  const skill = await db.sfSkill.create({
    data: {
      orgId: ctx.orgId,
      code,
      name,
      nameHi: nameHi || null,
      lineKey,
      criticality,
      isActive: true,
      createdBy: ctx.userId,
    },
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
    action: "CREATE",
    entityType: "skill",
    entityId: skill.id,
    changes: ["code", "name", "nameHi", "lineKey", "criticality"],
  });

  return NextResponse.json({ success: true, data: skill }, { status: 201 });
});
