import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/health/route";
import { mockDb } from "../helpers/mockDb";

describe("GET /api/health", () => {
  it("returns ok, version, and db status without auth", async () => {
    (mockDb.$queryRaw as any).mockResolvedValueOnce([{ 1: 1 }]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.version).toBe("1.0.0");
    expect(data.db).toBe("up");
  });

  it("reports db: down gracefully when db query throws", async () => {
    (mockDb.$queryRaw as any).mockRejectedValueOnce(new Error("DB offline"));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.db).toBe("down");
  });
});
