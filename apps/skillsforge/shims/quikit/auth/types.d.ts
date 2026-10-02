import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      orgId: string;
      membershipRole: string;
      isSuperAdmin: boolean;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    orgId: string;
    membershipRole: string;
    isSuperAdmin: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    email: string;
    name: string;
    orgId: string;
    membershipRole: string;
    isSuperAdmin: boolean;
  }
}
