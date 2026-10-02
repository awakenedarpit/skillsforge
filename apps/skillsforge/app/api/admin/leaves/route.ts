import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withOrgAuth } from "@/lib/api/withOrgAuth";
import { validationError } from "@/lib/api/validationError";
import {
  getDemoLeaveRequests,
  reviewDemoLeaveRequest,
  DEMO_OPERATORS,
  DEMO_SHIFTS,
} from "@/lib/demo/seedData";
import { canEditSkillGrid } from "@/lib/api/skillsforgePermissions";

export const dynamic = "force-dynamic";

const reviewSchema = z.object({
  leaveId: z.string().min(1, "Leave ID is required"),
  status: z.enum(["APPROVED", "REJECTED"]),
  notes: z.string().max(300).optional(),
});

export const GET = withOrgAuth(async (req, ctx) => {
  // Allow supervisor (app_admin) and admin (org_admin) to view all leaves
  const rawLeaves = getDemoLeaveRequests();

  // Enrich with operator details
  const enrichedLeaves = rawLeaves.map((leave) => {
    const operator = DEMO_OPERATORS.find((op) => op.id === leave.operatorId);
    const shift = DEMO_SHIFTS.find((s) => s.id === operator?.shiftId);

    return {
      ...leave,
      operator: {
        id: operator?.id || leave.operatorId,
        name: operator?.name || "Unknown Operator",
        employeeCode: operator?.employeeCode || "N/A",
        shiftCode: shift?.code || "A",
        shiftTimings: shift ? `${shift.startTime} - ${shift.endTime}` : "06:00 - 14:00",
      },
    };
  });

  return NextResponse.json({
    success: true,
    data: {
      leaves: enrichedLeaves,
      summary: {
        total: enrichedLeaves.length,
        pending: enrichedLeaves.filter((l) => l.status === "PENDING").length,
        approved: enrichedLeaves.filter((l) => l.status === "APPROVED").length,
        rejected: enrichedLeaves.filter((l) => l.status === "REJECTED").length,
      },
    },
  });
});

export const PATCH = withOrgAuth(async (req, ctx) => {
  // Check permission: only supervisors & admins can approve/reject leaves
  if (!canEditSkillGrid(ctx.userRole)) {
    return NextResponse.json(
      { success: false, error: "Forbidden: Supervisor or Administrator privilege required." },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed);
  }

  const { leaveId, status, notes } = parsed.data;
  const reviewerName = ctx.userName || "Shift Supervisor";

  const updated = reviewDemoLeaveRequest(leaveId, status, reviewerName, notes);
  if (!updated) {
    return NextResponse.json(
      { success: false, error: "Leave request not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: updated,
    message: `Leave request ${status.toLowerCase()} successfully`,
  });
});
