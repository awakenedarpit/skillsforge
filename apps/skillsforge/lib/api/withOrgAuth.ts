import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth";

export interface OrgAuthContext<TParams = Record<string, string | string[]>> {
  orgId: string;
  userId: string;
  userName: string;
  userRole: string;
  isSuperAdmin: boolean;
  operatorId: string | null;
  params: TParams;
}

export type OrgAuthHandler<TParams = Record<string, string | string[]>> = (
  req: NextRequest,
  ctx: OrgAuthContext<TParams>
) => Promise<NextResponse>;

/**
 * Higher-order function wrapping Next.js route handlers with tenant authentication.
 * Guarantees that every request is signed in and provides tenant orgId strictly from session.
 */
export function withOrgAuth<TParams = Record<string, string | string[]>>(
  handler: OrgAuthHandler<TParams>
) {
  return async function orgAuthRouteHandler(
    req: NextRequest,
    context?: { params?: TParams }
  ): Promise<NextResponse> {
    try {
      const session = await getServerSession(authOptions);

      if (!session?.user?.id || !session.user.orgId) {
        return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 });
      }

      const ctx: OrgAuthContext<TParams> = {
        orgId: session.user.orgId,
        userId: session.user.id,
        userName: session.user.name || "Unknown User",
        userRole: session.user.membershipRole || "member",
        isSuperAdmin: Boolean(session.user.isSuperAdmin),
        operatorId: session.user.operatorId ?? null,
        params: (context?.params ?? {}) as TParams,
      };

      return await handler(req, ctx);
    } catch (error: unknown) {
      console.error("Unhandled error in route handler:", error);
      const message = error instanceof Error ? error.message : "Internal server error";
      return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
  };
}
