import type { DefaultSession, DefaultUser } from "next-auth";
import type { JWT as DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      orgId: string;
      membershipRole: string;
      isSuperAdmin: boolean;
      operatorId: string | null;
    };
  }

  interface User extends DefaultUser {
    orgId: string;
    membershipRole: string;
    isSuperAdmin: boolean;
    operatorId: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id?: string;
    orgId?: string;
    membershipRole?: string;
    isSuperAdmin?: boolean;
    operatorId?: string | null;
  }
}
