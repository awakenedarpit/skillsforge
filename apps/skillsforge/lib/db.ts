import { db as prismaDb } from "@quikit/database";

/**
 * Use the Prisma client directly. A TCP probe against 127.0.0.1 cannot tell whether
 * a database URL is reachable, and it incorrectly marks remote databases offline.
 * Let Prisma perform the real query and surface genuine connection errors to the
 * route handler instead of silently switching data sources.
 */
export const db = prismaDb;

export default db;
