import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { DEMO_ORG, DEMO_USERS } from "./demo/seedData";

export const authOptions: NextAuthOptions = {
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
                isSuperAdmin: false,
              };
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.orgId = (user as any).orgId ?? DEMO_ORG.id;
        token.membershipRole = (user as any).membershipRole ?? "member";
        token.isSuperAdmin = (user as any).isSuperAdmin ?? false;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.orgId = (token.orgId as string) || DEMO_ORG.id;
        session.user.membershipRole = (token.membershipRole as string) || "member";
        session.user.isSuperAdmin = Boolean(token.isSuperAdmin);
      }
      return session;
    },
  },
};
