import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  let dbStatus: "up" | "down" = "down";
  try {
    await db.org.count();
    dbStatus = "up";
  } catch {
    dbStatus = "down";
  }

  return NextResponse.json({
    ok: true,
    version: "1.0.0",
    db: dbStatus,
    provider: "SQLite",
  });
}
