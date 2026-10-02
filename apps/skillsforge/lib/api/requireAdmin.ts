import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth";
import { isOrgAdmin } from "./skillsforgePermissions";
import { OrgAuthContext, OrgAuthHandler } from "./withOrgAuth";

/**
 * Higher-order function wrapping Next.js route handlers requiring Admin access.
 * Rejects with 401 if unauthenticated, 403 if user lacks admin privileges.
 */
export function requireAdmin<TParams = Record<string, string | string[]>>(
  handler: OrgAuthHandler<TParams>
) {
  return async function adminRouteHandler(
    req: NextRequest,
    context?: { params?: TParams }
  ): Promise<NextResponse> {
    try {
      const session = await getServerSession(authOptions);

      if (!session?.user?.id || !session.user.orgId) {
        return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 });
      }

      const role = session.user.membershipRole || "member";
      if (!isOrgAdmin(role) && !session.user.isSuperAdmin) {
        return NextResponse.json(
          { success: false, error: "Forbidden: Admin access required" },
          { status: 403 }
        );
      }

      const ctx: OrgAuthContext<TParams> = {
        orgId: session.user.orgId,
        userId: session.user.id,
        userName: session.user.name || "Unknown User",
        userRole: role,
        isSuperAdmin: Boolean(session.user.isSuperAdmin),
        operatorId: session.user.operatorId ?? null,
        params: (context?.params ?? {}) as TParams,
      };

      return await handler(req, ctx);
    } catch (error: unknown) {
      console.error("Unhandled error in admin route handler:", error);
      const message = error instanceof Error ? error.message : "Internal server error";
      return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
  };
}
