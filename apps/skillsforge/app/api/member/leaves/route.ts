import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withOrgAuth } from "@/lib/api/withOrgAuth";
import { validationError } from "@/lib/api/validationError";
import {
  getDemoLeaveRequests,
  createDemoLeaveRequest,
  cancelDemoLeaveRequest,
  DEMO_OPERATORS,
} from "@/lib/demo/seedData";
import { parseDate } from "@/lib/domain/rules";

export const dynamic = "force-dynamic";

const leaveSchema = z.object({
  operatorId: z.string().min(1),
  leaveType: z.enum(["CASUAL", "SICK", "ANNUAL", "TRAINING"]),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD"),
  reason: z.string().min(3, "Reason must be at least 3 characters").max(500),
});

export const GET = withOrgAuth(async (req, ctx) => {
  const { searchParams } = new URL(req.url);
  const operatorId = searchParams.get("operatorId") || ctx.operatorId;
  if (!operatorId) {
    return NextResponse.json({ success: true, data: [] });
  }
  const leaves = getDemoLeaveRequests(operatorId);
  return NextResponse.json({ success: true, data: leaves });
});

export const POST = withOrgAuth(async (req, ctx) => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = leaveSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed);
  }

  const { operatorId, leaveType, startDate, endDate, reason } = parsed.data;

  // Calculate days count
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  if (!start || !end) {
    return NextResponse.json({ success: false, error: "Invalid date format" }, { status: 400 });
  }
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const daysCount = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);

  const newLeave = createDemoLeaveRequest({
    operatorId,
    leaveType,
    startDate,
    endDate,
    daysCount,
    reason,
  });

  return NextResponse.json({ success: true, data: newLeave }, { status: 201 });
});

export const DELETE = withOrgAuth(async (req, ctx) => {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ success: false, error: "Leave ID is required" }, { status: 400 });
  }

  const cancelled = cancelDemoLeaveRequest(id);
  if (!cancelled) {
    return NextResponse.json(
      { success: false, error: "Leave request not found or cannot be cancelled" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: { cancelled: true } });
});
