import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withOrgAuth } from "@/lib/api/withOrgAuth";
import { validationError } from "@/lib/api/validationError";
import { db } from "@/lib/db";
import { parsePaginationParams, paginationToSkipTake, buildPaginationResponse } from "@quikit/shared";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  operatorId: z.string().optional(),
  skillId: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

export const GET = withOrgAuth(async (req, ctx) => {
  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse(Object.fromEntries(searchParams.entries()));

  if (!parsed.success) {
    return validationError(parsed);
  }

  const { operatorId, skillId } = parsed.data;
  const pagination = parsePaginationParams(searchParams);
  const { skip, take } = paginationToSkipTake(pagination);

  const where: any = {
    orgId: ctx.orgId,
    ...(operatorId ? { operatorId } : {}),
    ...(skillId ? { skillId } : {}),
  };

  try {
    const [total, items] = await Promise.all([
      db.sfSkillHistory.count({ where }),
      db.sfSkillHistory.findMany({
        where,
        skip,
        take,
        orderBy: { changedAt: "desc" },
        select: {
          id: true,
          operatorId: true,
          skillId: true,
          action: true,
          oldLevel: true,
          newLevel: true,
          oldIssuedOn: true,
          newIssuedOn: true,
          oldCertifiedUntil: true,
          newCertifiedUntil: true,
          changedBy: true,
          changedByName: true,
          changedAt: true,
          reason: true,
        },
      }),
    ]);

    const res = buildPaginationResponse(items, total, pagination);
    return NextResponse.json({ success: true, data: res });
  } catch (err: unknown) {
    const { getDemoHistory } = await import("@/lib/demo/seedData");
    let list = getDemoHistory();
    if (operatorId) list = list.filter((h: any) => h.operatorId === operatorId);
    if (skillId) list = list.filter((h: any) => h.skillId === skillId);

    const total = list.length;
    const paged = list.slice(skip, skip + take);
    const res = buildPaginationResponse(paged, total, pagination);
    return NextResponse.json({ success: true, data: res });
  }
});
