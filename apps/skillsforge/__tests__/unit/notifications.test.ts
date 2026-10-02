import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  ConsoleNotificationChannel,
  EmailNotificationChannel,
  SmsNotificationChannel,
  dispatchExpiryNotification,
  setNotificationChannel,
  NotificationChannel,
} from "@/lib/notifications";
import { runExpiryCheck } from "@/lib/api/expiryJob";
import { mockDb } from "../helpers/mockDb";

describe("Notifications Service & Expiry Job Integration", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("console channel logs formatted notification", async () => {
    const consoleSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const channel = new ConsoleNotificationChannel();

    const result = await channel.send({
      orgId: "org-1",
      operatorId: "op-1",
      skillId: "sk-1",
      severity: "critical",
      daysRemaining: 5,
      certifiedUntil: new Date("2026-10-10"),
    });

    expect(result.success).toBe(true);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Expiry Alert for Operator op-1, Skill sk-1")
    );
  });

  it("email channel skips gracefully when SMTP_HOST is not set", async () => {
    delete process.env.SMTP_HOST;
    const channel = new EmailNotificationChannel();

    const result = await channel.send({
      orgId: "org-1",
      operatorId: "op-1",
      skillId: "sk-1",
      severity: "critical",
      daysRemaining: 5,
      certifiedUntil: new Date("2026-10-10"),
    });

    expect(result.success).toBe(true);
  });

  it("sms channel skips gracefully when SMS_WEBHOOK_URL is not set", async () => {
    delete process.env.SMS_WEBHOOK_URL;
    const channel = new SmsNotificationChannel();

    const result = await channel.send({
      orgId: "org-1",
      operatorId: "op-1",
      skillId: "sk-1",
      severity: "critical",
      daysRemaining: 5,
      certifiedUntil: new Date("2026-10-10"),
    });

    expect(result.success).toBe(true);
  });

  it("isolates channel exceptions so dispatchExpiryNotification never throws", async () => {
    const brokenChannel: NotificationChannel = {
      name: "broken",
      send: vi.fn().mockRejectedValue(new Error("Network connection reset")),
    };

    const result = await dispatchExpiryNotification(
      {
        orgId: "org-1",
        operatorId: "op-1",
        skillId: "sk-1",
        severity: "critical",
        daysRemaining: 5,
        certifiedUntil: new Date("2026-10-10"),
      },
      brokenChannel
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("Network connection reset");
  });

  it("sends notification once for new alert and does not re-send if notifiedAt exists", async () => {
    const mockChannel: NotificationChannel = {
      name: "mock",
      send: vi.fn().mockResolvedValue({ channel: "mock", success: true }),
    };
    setNotificationChannel(mockChannel);

    const certDate = new Date("2026-10-10");
    const mockRecord = {
      id: "os-1",
      operatorId: "op-1",
      skillId: "sk-1",
      level: 2,
      certifiedUntil: certDate,
    };

    // Case 1: Alert without notifiedAt -> notification IS sent
    (mockDb.sfOperatorSkill.findMany as any).mockResolvedValueOnce([mockRecord]);
    (mockDb.sfAlert.findMany as any).mockResolvedValueOnce([]); // No existing alert
    (mockDb.$transaction as any).mockResolvedValueOnce([]);
    (mockDb.sfJobRun.create as any).mockResolvedValueOnce({ id: "run-1" });

    await runExpiryCheck({
      orgId: "org-demo-1",
      asOf: "2026-10-02",
      triggeredBy: "manual",
    });

    expect(mockChannel.send).toHaveBeenCalledTimes(1);

    // Case 2: Alert already has notifiedAt -> notification is NOT re-sent
    (mockDb.sfOperatorSkill.findMany as any).mockResolvedValueOnce([mockRecord]);
    (mockDb.sfAlert.findMany as any).mockResolvedValueOnce([
      {
        operatorId: "op-1",
        skillId: "sk-1",
        certifiedUntil: certDate,
        notifiedAt: new Date("2026-10-01"), // Already notified
      },
    ]);
    (mockDb.$transaction as any).mockResolvedValueOnce([]);
    (mockDb.sfJobRun.create as any).mockResolvedValueOnce({ id: "run-2" });

    await runExpiryCheck({
      orgId: "org-demo-1",
      asOf: "2026-10-02",
      triggeredBy: "manual",
    });

    // Still only called once from Case 1
    expect(mockChannel.send).toHaveBeenCalledTimes(1);

    // Reset default channel
    setNotificationChannel(new ConsoleNotificationChannel());
  });

  it("isolates channel failure: job succeeds even if notification dispatch fails", async () => {
    const failingChannel: NotificationChannel = {
      name: "failing",
      send: vi.fn().mockRejectedValue(new Error("Delivery timeout")),
    };
    setNotificationChannel(failingChannel);

    const mockRecord = {
      id: "os-2",
      operatorId: "op-2",
      skillId: "sk-2",
      level: 2,
      certifiedUntil: new Date("2026-10-08"),
    };

    (mockDb.sfOperatorSkill.findMany as any).mockResolvedValueOnce([mockRecord]);
    (mockDb.sfAlert.findMany as any).mockResolvedValueOnce([]);
    (mockDb.$transaction as any).mockResolvedValueOnce([]);
    (mockDb.sfJobRun.create as any).mockResolvedValueOnce({ id: "run-fail" });

    const result = await runExpiryCheck({
      orgId: "org-demo-1",
      asOf: "2026-10-02",
      triggeredBy: "manual",
    });

    // Job completed successfully despite notification error
    expect(result.flaggedTotal).toBe(1);
    expect(result.newlyFlagged).toBe(1);

    setNotificationChannel(new ConsoleNotificationChannel());
  });
});
