/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@quikit/ui", "@quikit/shared", "@quikit/auth", "@quikit/database", "@quikit/redis"],
};

module.exports = nextConfig;
