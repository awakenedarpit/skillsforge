import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  let dbStatus: "up" | "down" = "down";
  try {
    // Attempt a light query to test DB status
    await db.$queryRaw`SELECT 1`;
    dbStatus = "up";
  } catch {
    dbStatus = "down";
  }

  return NextResponse.json({
    ok: true,
    version: "1.0.0",
    db: dbStatus,
  });
}
