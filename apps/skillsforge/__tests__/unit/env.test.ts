import { describe, it, expect, vi } from "vitest";
import { validateEnv } from "@/lib/env";

describe("lib/env startup validation", () => {
  it("throws a clear error in production when required variables are missing", () => {
    const mockEnv = {
      NODE_ENV: "production",
      NEXTAUTH_URL: "",
      NEXTAUTH_SECRET: undefined,
      DATABASE_URL: "file:./dev.db",
    };

    expect(() => validateEnv(mockEnv)).toThrowError(
      "[SkillsForge Startup] Missing required environment variable(s): NEXTAUTH_URL, NEXTAUTH_SECRET"
    );
  });

  it("passes without throwing in production when all required variables are present", () => {
    const mockEnv = {
      NODE_ENV: "production",
      NEXTAUTH_URL: "https://skillsforge.quikit.io",
      NEXTAUTH_SECRET: "super-secret-token",
      DATABASE_URL: "file:./dev.db",
    };

    const result = validateEnv(mockEnv);
    expect(result.valid).toBe(true);
    expect(result.missing).toHaveLength(0);
  });

  it("warns but does not throw in development when required variables are missing", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const mockEnv = {
      NODE_ENV: "development",
      NEXTAUTH_URL: undefined,
      NEXTAUTH_SECRET: undefined,
      DATABASE_URL: undefined,
    };

    const result = validateEnv(mockEnv);
    expect(result.valid).toBe(false);
    expect(result.missing).toEqual(["NEXTAUTH_URL", "NEXTAUTH_SECRET", "DATABASE_URL"]);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("[SkillsForge Startup] Missing required environment variable(s)")
    );
    warnSpy.mockRestore();
  });
});
