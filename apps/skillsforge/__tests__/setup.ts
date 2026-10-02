import { vi } from "vitest";

// Lock timezone to Asia/Kolkata as required by platform rule 18
process.env.TZ = "Asia/Kolkata";
process.env.NEXTAUTH_SECRET = "test-secret-key";
process.env.SKILLSFORGE_DEV_AUTH = "true";

export let mockSession: any = {
  user: {
    id: "usr-admin-1",
    email: "rohit@skillsforge.quikit.io",
    name: "Rohit Kulkarni",
    orgId: "org-demo-1",
    membershipRole: "app_admin",
    isSuperAdmin: false,
  },
};

export function setSession(newSession: any) {
  mockSession = newSession;
}

export function resetSession() {
  mockSession = {
    user: {
      id: "usr-admin-1",
      email: "rohit@skillsforge.quikit.io",
      name: "Rohit Kulkarni",
      orgId: "org-demo-1",
      membershipRole: "app_admin",
      isSuperAdmin: false,
    },
  };
}

// Mock next-auth
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(async () => mockSession),
}));

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(() => ({ data: mockSession, status: mockSession ? "authenticated" : "unauthenticated" })),
  SessionProvider: ({ children }: any) => children,
  signIn: vi.fn(),
  signOut: vi.fn(),
}));
