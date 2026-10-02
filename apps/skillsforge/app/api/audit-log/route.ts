import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api/requireAdmin";
import { validationError } from "@/lib/api/validationError";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  action: z.string().trim().optional(),
  entityType: z.string().trim().optional(),
  entity: z.string().trim().optional(),
  startDate: z.string().trim().optional(),
  endDate: z.string().trim().optional(),
});

interface AuditLogRecord {
  id: string;
  actorId: string | null;
  actorRole: string | null;
  action: string;
  entityType: string;
  entityId: string;
  changesJson: string | null;
  reason: string | null;
  createdAt: Date;
}

/**
 * GET /api/audit-log
 * Read-only, admin-only endpoint returning audit logs for the authenticated tenant.
 * Paginated and filterable by action, entity type, and date range.
 * Never exposes sensitive secrets or credentials.
 */
export const GET = requireAdmin(async (req, ctx) => {
  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse(Object.fromEntries(searchParams.entries()));

  if (!parsed.success) {
    return validationError(parsed);
  }

  const { page, limit, action, entityType, entity, startDate, endDate } = parsed.data;
  const targetEntity = entityType || entity;

  const createdAtFilter: { gte?: Date; lte?: Date } = {};
  if (startDate) {
    const sDate = new Date(startDate);
    if (!isNaN(sDate.getTime())) createdAtFilter.gte = sDate;
  }
  if (endDate) {
    const eDate = new Date(endDate);
    if (!isNaN(eDate.getTime())) createdAtFilter.lte = eDate;
  }

  const where = {
    orgId: ctx.orgId,
    ...(action ? { action } : {}),
    ...(targetEntity ? { entityType: targetEntity } : {}),
    ...(Object.keys(createdAtFilter).length > 0 ? { createdAt: createdAtFilter } : {}),
  };

  try {
    const [total, itemsRaw] = await Promise.all([
      db.auditLog.count({ where }),
      db.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          actorId: true,
          actorRole: true,
          action: true,
          entityType: true,
          entityId: true,
          changesJson: true,
          reason: true,
          createdAt: true,
        },
      }),
    ]);

    const items = itemsRaw as AuditLogRecord[];
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return NextResponse.json({
      success: true,
      data: {
        items,
        pagination: {
          total,
          page,
          limit,
          totalPages,
        },
      },
    });
  } catch (err: unknown) {
    console.error("Error fetching audit logs:", err);
    return NextResponse.json(
      {
        success: true,
        data: {
          items: [],
          pagination: { total: 0, page: 1, limit, totalPages: 1 },
        },
      },
      { status: 200 }
    );
  }
});
