import { createMiddleware } from "@quikit/auth";

export default createMiddleware({
  publicRoutes: ["/login", "/api/health"],
});

export const config = {
  matcher: ["/((?!api/|_next/static|_next/image|favicon.ico).*)"],
};
