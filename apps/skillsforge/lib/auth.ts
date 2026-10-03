import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { DEMO_ORG, DEMO_USERS } from "./demo/seedData";

export const authOptions: NextAuthOptions = {
  // trustHost: true tells NextAuth to derive the base URL from the
  // x-forwarded-host header that Vercel sets on every request.
  // Exists at runtime in next-auth 4.22+ but missing from its TS types
  // in 4.24.x — cast required (as unknown as NextAuthOptions per rule 1).
  ...(({ trustHost: true } as unknown) as NextAuthOptions),
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET || "insecure-dev-secret-for-skillsforge",
  pages: {
    signIn: "/login",
  },
  providers: [
    ...(process.env.SKILLSFORGE_DEV_AUTH === "true" || process.env.NODE_ENV !== "production"
      ? [
          CredentialsProvider({
            id: "dev-login",
            name: "Dev Demo Login",
            credentials: {
              email: { label: "Email", type: "text" },
              userId: { label: "User ID", type: "text" },
            },
            async authorize(credentials) {
              if (!credentials?.email && !credentials?.userId) return null;

              const user = DEMO_USERS.find(
                (u) =>
                  (credentials.email && u.email.toLowerCase() === credentials.email.toLowerCase()) ||
                  (credentials.userId && u.id === credentials.userId)
              );

              if (!user) return null;

              return {
                id: user.id,
                email: user.email,
                name: user.name,
                orgId: DEMO_ORG.id,
                membershipRole: user.role,
                isSuperAdmin: ("isSuperAdmin" in user && Boolean(user.isSuperAdmin)) || user.role === "super_admin",
                operatorId: ("operatorId" in user && typeof user.operatorId === "string") ? user.operatorId : null,
              };
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    async redirect({ url, baseUrl }) {
      // On Vercel, baseUrl is correctly derived from x-forwarded-host (via trustHost).
      // If the incoming url is relative, use baseUrl.
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Allow same-origin redirects through.
      if (url.startsWith(baseUrl)) return url;
      // Fallback to the baseUrl root.
      return baseUrl;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.orgId = user.orgId ?? DEMO_ORG.id;
        token.membershipRole = user.membershipRole ?? "member";
        token.isSuperAdmin = user.isSuperAdmin ?? false;
        token.operatorId = user.operatorId ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) || session.user.id;
        session.user.email = token.email ?? session.user.email;
        session.user.name = token.name ?? session.user.name;
        session.user.orgId = (token.orgId as string) || DEMO_ORG.id;
        session.user.membershipRole = (token.membershipRole as string) || "member";
        session.user.isSuperAdmin = Boolean(token.isSuperAdmin);
        session.user.operatorId = (token.operatorId as string | null) ?? null;
      }
      return session;
    },
  },
};
