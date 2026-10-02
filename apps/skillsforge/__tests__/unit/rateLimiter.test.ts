import { describe, it, expect, beforeEach, vi } from "vitest";
import { checkRateLimit, resetRateLimitStore } from "@/lib/api/rateLimiter";

describe("lib/api/rateLimiter", () => {
  beforeEach(() => {
    resetRateLimitStore();
    vi.useRealTimers();
  });

  it("allows requests under the limit", () => {
    const res1 = checkRateLimit("user-1:test", 3, 60);
    expect(res1.allowed).toBe(true);
    expect(res1.remaining).toBe(2);

    const res2 = checkRateLimit("user-1:test", 3, 60);
    expect(res2.allowed).toBe(true);
    expect(res2.remaining).toBe(1);

    const res3 = checkRateLimit("user-1:test", 3, 60);
    expect(res3.allowed).toBe(true);
    expect(res3.remaining).toBe(0);
  });

  it("blocks requests exceeding the limit with retryAfterSeconds", () => {
    for (let i = 0; i < 3; i++) {
      checkRateLimit("user-2:test", 3, 60);
    }

    const blocked = checkRateLimit("user-2:test", 3, 60);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(60);
  });

  it("resets after the window expires", () => {
    vi.useFakeTimers();
    const baseTime = new Date("2026-10-02T12:00:00Z").getTime();
    vi.setSystemTime(baseTime);

    for (let i = 0; i < 2; i++) {
      checkRateLimit("user-3:test", 2, 30);
    }
    const blocked = checkRateLimit("user-3:test", 2, 30);
    expect(blocked.allowed).toBe(false);

    // Fast-forward past window (31 seconds)
    vi.setSystemTime(baseTime + 31000);

    const resAfterExpiry = checkRateLimit("user-3:test", 2, 30);
    expect(resAfterExpiry.allowed).toBe(true);
    expect(resAfterExpiry.remaining).toBe(1);
  });
});
