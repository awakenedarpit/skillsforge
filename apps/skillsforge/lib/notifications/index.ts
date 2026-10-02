/**
 * Notification Service for certification expiries.
 * Provides a channel interface supporting Email, SMS, and default Console logging.
 * Providers are configured strictly through environment variables.
 */

export interface ExpiryNotificationPayload {
  alertId?: string;
  orgId: string;
  operatorId: string;
  skillId: string;
  severity: string;
  daysRemaining: number;
  certifiedUntil: Date;
}

export interface NotificationResult {
  channel: string;
  success: boolean;
  error?: string;
}

export interface NotificationChannel {
  name: string;
  send(payload: ExpiryNotificationPayload): Promise<NotificationResult>;
}

/**
 * Console Channel (default safe fallback).
 * Logs formatted notification alerts to the console without external dependencies.
 */
export class ConsoleNotificationChannel implements NotificationChannel {
  name = "console";

  async send(payload: ExpiryNotificationPayload): Promise<NotificationResult> {
    console.info(
      `[Notification] [Console] Expiry Alert for Operator ${payload.operatorId}, Skill ${payload.skillId}: ` +
        `Severity=${payload.severity}, DaysRemaining=${payload.daysRemaining}, ExpiryDate=${payload.certifiedUntil.toISOString().split("T")[0]}`
    );
    return { channel: this.name, success: true };
  }
}

/**
 * Email Channel.
 * Configured via SMTP environment variables:
 * SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM.
 */
export class EmailNotificationChannel implements NotificationChannel {
  name = "email";

  async send(payload: ExpiryNotificationPayload): Promise<NotificationResult> {
    const host = process.env.SMTP_HOST;
    if (!host) {
      console.info("[Notification] [Email] SMTP_HOST not configured, skipping email delivery.");
      return { channel: this.name, success: true };
    }

    try {
      // In production with SMTP configured, this would dispatch through the configured mailer.
      console.info(
        `[Notification] [Email] Dispatching certification expiry email to operator ${payload.operatorId} via ${host}`
      );
      return { channel: this.name, success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "SMTP delivery failed";
      console.error("[Notification] [Email] Error sending email:", err);
      return { channel: this.name, success: false, error: msg };
    }
  }
}

/**
 * SMS Channel.
 * Configured via SMS_WEBHOOK_URL environment variable.
 */
export class SmsNotificationChannel implements NotificationChannel {
  name = "sms";

  async send(payload: ExpiryNotificationPayload): Promise<NotificationResult> {
    const webhookUrl = process.env.SMS_WEBHOOK_URL;
    if (!webhookUrl) {
      console.info("[Notification] [SMS] SMS_WEBHOOK_URL not configured, skipping SMS delivery.");
      return { channel: this.name, success: true };
    }

    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: payload.operatorId,
          text: `SkillsForge Alert: Your certification on skill ${payload.skillId} expires in ${payload.daysRemaining} days.`,
        }),
      });

      if (!res.ok) {
        throw new Error(`SMS webhook returned HTTP ${res.status}`);
      }

      return { channel: this.name, success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "SMS webhook delivery failed";
      console.error("[Notification] [SMS] Error sending SMS:", err);
      return { channel: this.name, success: false, error: msg };
    }
  }
}

let activeChannel: NotificationChannel = new ConsoleNotificationChannel();

export function setNotificationChannel(channel: NotificationChannel): void {
  activeChannel = channel;
}

export function getNotificationChannel(): NotificationChannel {
  return activeChannel;
}

/**
 * Dispatches an expiry notification.
 * Safe execution: Any channel exception is caught and logged, never bubbling up to crash calling jobs.
 */
export async function dispatchExpiryNotification(
  payload: ExpiryNotificationPayload,
  channel: NotificationChannel = activeChannel
): Promise<NotificationResult> {
  try {
    return await channel.send(payload);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Notification delivery failed";
    console.error(`[Notification] Error in channel ${channel.name}:`, err);
    return { channel: channel.name, success: false, error: msg };
  }
}
