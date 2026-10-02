import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { validationError } from "@/lib/api/validationError";
import { canEditSkillGrid } from "@/lib/api/skillsforgePermissions";
import { writeAuditLog } from "@/lib/api/auditLog";
import { runExpiryCheck } from "@/lib/api/expiryJob";
import { checkRateLimit } from "@/lib/api/rateLimiter";
import { DEMO_ORG } from "@/lib/demo/seedData";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  asOf: z.string().optional(),
});

/**
 * POST /api/jobs/expiry-check
 * Runs the daily certification expiry check and records an SfJobRun.
 * Auth: Signed-in user with rank >= app_admin OR x-internal-secret matching INTERNAL_SECRET.
 * Status: 201 Created.
 */
export async function POST(req: NextRequest) {
  const internalSecret = req.headers.get("x-internal-secret");
  const expectedSecret = process.env.INTERNAL_SECRET || "shared-secret-for-internal-calls";
  const isInternal = Boolean(internalSecret && internalSecret === expectedSecret);

  let orgId = DEMO_ORG.id;
  let actorId: string | null = null;
  let actorRole: string | null = null;

  const session = await getServerSession(authOptions);

  if (isInternal) {
    // Internal scheduler call
    const queryOrgId = req.nextUrl.searchParams.get("orgId");
    if (queryOrgId) {
      orgId = queryOrgId;
    } else if (session?.user?.orgId) {
      orgId = session.user.orgId;
    }
  } else {
    // User session check
    if (!session?.user?.id || !session.user.orgId) {
      return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 });
    }

    if (!canEditSkillGrid(session.user.membershipRole)) {
      return NextResponse.json({ success: false, error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    orgId = session.user.orgId;
    actorId = session.user.id;
    actorRole = session.user.membershipRole || "app_admin";
  }

  // Rate limiting check: keyed by user id plus route (or internal:route), limit 5 reqs per minute
  const rateLimitKey = `${actorId || "internal"}:/api/jobs/expiry-check`;
  const rateLimit = checkRateLimit(rateLimitKey, 5, 60);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please wait before retrying." },
      {
        status: 429,
        headers: {
          "Retry-After": rateLimit.retryAfterSeconds.toString(),
        },
      }
    );
  }

  let body = {};
  try {
    const raw = await req.json();
    body = raw;
  } catch {
    // Body is optional
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed);
  }

  try {
    const result = await runExpiryCheck({
      orgId,
      asOf: parsed.data.asOf,
      triggeredBy: isInternal ? "external" : "manual",
    });

    if (actorId && actorRole) {
      await writeAuditLog({
        orgId,
        actorId,
        actorRole,
        action: "CREATE",
        entityType: "job_run",
        entityId: "expiry_check",
        changes: ["jobName", "asOfDate"],
        reason: "Manual certification expiry check triggered",
      });
    }

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error("Error executing expiry check job:", err);
    const message = err instanceof Error ? err.message : "Internal job execution error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
