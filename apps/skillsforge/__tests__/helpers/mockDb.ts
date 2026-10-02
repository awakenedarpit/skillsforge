import { PrismaClient } from "@prisma/client";
import { mockDeep, mockReset, DeepMockProxy } from "vitest-mock-extended";
import { vi, beforeEach } from "vitest";

export const mockDb = mockDeep<PrismaClient>() as unknown as DeepMockProxy<PrismaClient>;

beforeEach(() => {
  mockReset(mockDb);
});

vi.mock("@quikit/database", () => ({
  db: mockDb,
}));

vi.mock("@/lib/db", () => ({
  db: mockDb,
  default: mockDb,
}));
