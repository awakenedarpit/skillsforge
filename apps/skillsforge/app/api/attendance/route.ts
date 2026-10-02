import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withOrgAuth } from "@/lib/api/withOrgAuth";
import { validationError } from "@/lib/api/validationError";
import {
  getDemoAttendance,
  updateDemoAttendance,
  DEMO_OPERATORS,
  DEMO_SHIFTS,
} from "@/lib/demo/seedData";
import { today } from "@/lib/domain/rules";
import { canEditSkillGrid } from "@/lib/api/skillsforgePermissions";

export const dynamic = "force-dynamic";

const updateAttendanceSchema = z.object({
  operatorId: z.string().min(1, "Operator ID is required"),
  status: z.enum(["PRESENT", "ABSENT", "ON_LEAVE", "HALF_DAY", "LATE"]),
  notes: z.string().max(300).optional(),
});

export const GET = withOrgAuth(async (req, ctx) => {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") || today();

  const rawRecords = getDemoAttendance(date);

  // Enrich with operator metadata
  const records = rawRecords.map((rec) => {
    const operator = DEMO_OPERATORS.find((op) => op.id === rec.operatorId);
    const shift = DEMO_SHIFTS.find((s) => s.id === operator?.shiftId);

    return {
      ...rec,
      operator: {
        id: operator?.id || rec.operatorId,
        name: operator?.name || "Unknown Operator",
        employeeCode: operator?.employeeCode || "N/A",
        shiftCode: shift?.code || "A",
        shiftTimings: shift ? `${shift.startTime} - ${shift.endTime}` : "06:00 - 14:00",
      },
    };
  });

  const presentCount = records.filter((r) => r.status === "PRESENT").length;
  const absentCount = records.filter((r) => r.status === "ABSENT").length;
  const onLeaveCount = records.filter((r) => r.status === "ON_LEAVE").length;
  const biometricSyncedCount = records.filter((r) => r.biometricVerified).length;

  return NextResponse.json({
    success: true,
    data: {
      date,
      summary: {
        total: records.length,
        present: presentCount,
        absent: absentCount,
        onLeave: onLeaveCount,
        biometricSynced: biometricSyncedCount,
        biometricRate: records.length > 0 ? Math.round((biometricSyncedCount / records.length) * 100) : 0,
      },
      records,
    },
  });
});

export const PATCH = withOrgAuth(async (req, ctx) => {
  // Only supervisor (app_admin) and org_admin can update employee attendance
  if (!canEditSkillGrid(ctx.userRole)) {
    return NextResponse.json(
      { success: false, error: "Forbidden: Only supervisors and admins can update employee attendance" },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = updateAttendanceSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const { operatorId, status, notes } = parsed.data;

  const updatedRecord = updateDemoAttendance(
    operatorId,
    status,
    notes,
    ctx.userName || "Supervisor"
  );

  return NextResponse.json({
    success: true,
    data: updatedRecord,
  });
});
