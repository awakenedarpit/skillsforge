/**
 * Startup environment variable validation.
 * Checks NEXTAUTH_URL, NEXTAUTH_SECRET, and DATABASE_URL.
 * In production: throws a descriptive error naming the missing variables.
 * In development: logs a warning without crashing.
 */

export interface EnvValidationResult {
  valid: boolean;
  missing: string[];
}

export function validateEnv(env: Record<string, string | undefined> = process.env): EnvValidationResult {
  const required = ["NEXTAUTH_URL", "NEXTAUTH_SECRET", "DATABASE_URL"];
  const missing = required.filter((key) => !env[key] || env[key]?.trim() === "");

  const isProd = env.NODE_ENV === "production";

  if (missing.length > 0) {
    const errorMsg = `[SkillsForge Startup] Missing required environment variable(s): ${missing.join(", ")}`;
    if (isProd) {
      throw new Error(errorMsg);
    } else {
      console.warn(errorMsg);
    }
    return { valid: false, missing };
  }

  return { valid: true, missing: [] };
}

// Auto-run validation at server startup (unless in test runner)
if (typeof window === "undefined" && process.env.NODE_ENV !== "test") {
  validateEnv();
}
