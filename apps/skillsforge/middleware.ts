import { createMiddleware } from "@quikit/auth";

export default createMiddleware({
  publicRoutes: ["/login", "/api/health", "/api/auth"],
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
