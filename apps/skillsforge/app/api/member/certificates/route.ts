import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withOrgAuth } from "@/lib/api/withOrgAuth";
import { validationError } from "@/lib/api/validationError";
import {
  getDemoCertificateSubmissions,
  createDemoCertificateSubmission,
  recordDemoHistory,
  DEMO_OPERATORS,
  DEMO_MACHINES,
} from "@/lib/demo/seedData";

export const dynamic = "force-dynamic";

const certSchema = z.object({
  operatorId: z.string().min(1),
  skillId: z.string().min(1),
  certificateNumber: z.string().min(3).max(100),
  level: z.number().int().min(1).max(4),
  issuedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD"),
  certifiedUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD"),
  fileName: z.string().optional(),
  notes: z.string().max(500).optional(),
});

export const GET = withOrgAuth(async (req, ctx) => {
  const { searchParams } = new URL(req.url);
  const operatorId = searchParams.get("operatorId") || ctx.operatorId;
  if (!operatorId) {
    return NextResponse.json({ success: true, data: [] });
  }
  const submissions = getDemoCertificateSubmissions(operatorId);
  return NextResponse.json({ success: true, data: submissions });
});

export const POST = withOrgAuth(async (req, ctx) => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = certSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed);
  }

  const { operatorId, skillId, certificateNumber, level, issuedOn, certifiedUntil, fileName, notes } = parsed.data;

  const operator = DEMO_OPERATORS.find((o) => o.id === operatorId);
  const machine = DEMO_MACHINES.find((m) => m.id === skillId);

  const submission = createDemoCertificateSubmission({
    operatorId,
    skillId,
    certificateNumber,
    level,
    issuedOn,
    certifiedUntil,
    fileName: fileName || `${skillId}_certification_${certificateNumber}.pdf`,
    notes: notes || "Employee self-service submission",
  });

  // Log in system audit history
  recordDemoHistory({
    operatorId,
    skillId,
    action: level >= 4 ? "PROMOTE" : "CERTIFY",
    oldLevel: 0,
    newLevel: level,
    oldIssuedOn: null,
    newIssuedOn: issuedOn,
    oldCertifiedUntil: null,
    newCertifiedUntil: certifiedUntil,
    changedBy: ctx.userId,
    changedByName: operator?.name || ctx.userName,
    reason: `Certificate submitted by operator: ${certificateNumber}`,
  });

  return NextResponse.json({ success: true, data: submission }, { status: 201 });
});
