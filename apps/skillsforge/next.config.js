/** @type {import('next').NextConfig} */

// Set NEXTAUTH_URL from Vercel's auto-provided VERCEL_URL so the
// client-side next-auth signIn() function posts to the correct host.
// trustHost: true in authOptions handles the server-side URL resolution.
if (process.env.VERCEL_URL) {
  process.env.NEXTAUTH_URL = `https://${process.env.VERCEL_URL}`;
}

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@quikit/ui", "@quikit/shared", "@quikit/auth", "@quikit/database", "@quikit/redis"],
};

module.exports = nextConfig;
