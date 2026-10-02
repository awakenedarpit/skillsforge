import { NextRequest, NextResponse } from "next/server";
import { withOrgAuth } from "@/lib/api/withOrgAuth";
import { syncBiometricAttendance } from "@/lib/demo/seedData";
import { today } from "@/lib/domain/rules";
import { canEditSkillGrid } from "@/lib/api/skillsforgePermissions";

export const dynamic = "force-dynamic";

export const POST = withOrgAuth(async (req, ctx) => {
  // Only supervisor and admin can trigger biometric machine sync
  if (!canEditSkillGrid(ctx.userRole)) {
    return NextResponse.json(
      { success: false, error: "Forbidden: Only supervisors and admins can sync biometric terminal" },
      { status: 403 }
    );
  }

  let body: { date?: string } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const syncResult = syncBiometricAttendance(body.date || today());

  return NextResponse.json({
    success: true,
    data: syncResult,
  });
});
