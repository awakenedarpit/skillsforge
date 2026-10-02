import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import middleware from "@/middleware";
import { getToken } from "next-auth/jwt";

vi.mock("next-auth/jwt", () => ({
  getToken: vi.fn(),
}));

describe("Middleware Protection and Public Whitelist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 for unauthenticated API requests", async () => {
    vi.mocked(getToken).mockResolvedValueOnce(null);

    const req = new NextRequest("http://localhost:3011/api/skills");
    const res = await middleware(req);

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toBe("Unauthenticated");
  });

  it("permits /api/health without authentication", async () => {
    const req = new NextRequest("http://localhost:3011/api/health");
    const res = await middleware(req);

    expect(res.status).toBe(200);
    expect(getToken).not.toHaveBeenCalled();
  });

  it("permits /api/auth routes without authentication", async () => {
    const req = new NextRequest("http://localhost:3011/api/auth/session");
    const res = await middleware(req);

    expect(res.status).toBe(200);
    expect(getToken).not.toHaveBeenCalled();
  });

  it("permits /login page without authentication", async () => {
    const req = new NextRequest("http://localhost:3011/login");
    const res = await middleware(req);

    expect(res.status).toBe(200);
    expect(getToken).not.toHaveBeenCalled();
  });

  it("redirects unauthenticated web requests to /login", async () => {
    vi.mocked(getToken).mockResolvedValueOnce(null);

    const req = new NextRequest("http://localhost:3011/grid");
    const res = await middleware(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
  });

  it("allows authenticated API requests through", async () => {
    vi.mocked(getToken).mockResolvedValueOnce({
      id: "usr-1",
      orgId: "org-1",
      membershipRole: "admin",
    } as any);

    const req = new NextRequest("http://localhost:3011/api/skills");
    const res = await middleware(req);

    expect(res.status).toBe(200);
  });
});
