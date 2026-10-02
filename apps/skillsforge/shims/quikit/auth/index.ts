// LOCAL STAND-IN for @quikit/auth: delete at integration

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export interface QuikITSession {
  user: {
    id: string;
    email: string;
    name: string;
    orgId: string;
    membershipRole: string;
    isSuperAdmin: boolean;
  };
}

export function createMiddleware(options?: { publicRoutes?: string[] }) {
  const publicRoutes = options?.publicRoutes ?? ["/login", "/api/health", "/api/auth"];

  return async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;
    
    // Always permit public routes and health
    if (
      publicRoutes.some((route) => pathname === route || pathname.startsWith(route + "/") || pathname.startsWith(route)) ||
      pathname === "/api/health" ||
      pathname.startsWith("/api/auth")
    ) {
      return NextResponse.next();
    }

    // Type cast required due to Next.js version-specific Request internals
    const token = await getToken({
      req: req as unknown as Parameters<typeof getToken>[0]["req"],
      secret: process.env.NEXTAUTH_SECRET || "insecure-dev-secret-for-skillsforge",
    });

    if (!token) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 });
      }
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", req.url);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  };
}

export function createGetOrgId() {
  return function getOrgId(session: QuikITSession | null): string | null {
    return session?.user?.orgId ?? null;
  };
}

export const createGetTenantId = createGetOrgId;

export function createRequireAdmin() {
  return function requireAdmin(session: QuikITSession | null): boolean {
    if (!session?.user) return false;
    const role = session.user.membershipRole;
    return role === "super_admin" || role === "org_admin" || role === "admin";
  };
}
