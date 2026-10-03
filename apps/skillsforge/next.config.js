/** @type {import('next').NextConfig} */

// Auto-resolve NEXTAUTH_URL on Vercel:
// - If not set, derive from VERCEL_URL
// - If set to localhost but running on Vercel, override with VERCEL_URL
if (process.env.VERCEL_URL) {
  const current = process.env.NEXTAUTH_URL || "";
  if (!current || current.includes("localhost")) {
    process.env.NEXTAUTH_URL = `https://${process.env.VERCEL_URL}`;
  }
}

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@quikit/ui", "@quikit/shared", "@quikit/auth", "@quikit/database", "@quikit/redis"],
};

module.exports = nextConfig;
