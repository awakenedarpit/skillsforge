/** @type {import('next').NextConfig} */

// Auto-resolve NEXTAUTH_URL on Vercel when not explicitly set
if (!process.env.NEXTAUTH_URL && process.env.VERCEL_URL) {
  process.env.NEXTAUTH_URL = `https://${process.env.VERCEL_URL}`;
}

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@quikit/ui", "@quikit/shared", "@quikit/auth", "@quikit/database", "@quikit/redis"],
};

module.exports = nextConfig;
