/**
 * Resolves the canonical base URL for the running app.
 *
 * Priority:
 *   1. NEXTAUTH_URL (if set and non-empty – authoritative override)
 *   2. VERCEL_URL   (auto-provided by Vercel on every deployment)
 *   3. localhost:3011 fallback for local dev
 *
 * The returned URL never has a trailing slash.
 */
export function getBaseUrl(): string {
  // NEXTAUTH_URL wins unless it's a localhost value on Vercel
  if (process.env.NEXTAUTH_URL && !process.env.NEXTAUTH_URL.includes("localhost")) {
    return process.env.NEXTAUTH_URL.replace(/\/+$/, "");
  }

  // Vercel auto-sets VERCEL_URL (without protocol)
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // NEXTAUTH_URL with localhost (local dev)
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL.replace(/\/+$/, "");
  }

  // Final fallback for local dev
  return `http://localhost:${process.env.PORT || 3011}`;
}
