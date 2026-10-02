import { QUALIFIED_MIN_LEVEL, parseDate, diffDays, formatDateStr } from "./rules";

export type AlertSeverity = "expired" | "critical" | "warning" | "notice";

/**
 * Effective level on date D = stored level,
 * unless certifiedUntil is set and strictly earlier than D, then 0.
 */
export function effectiveLevel(
  level: number,
  certifiedUntil: string | Date | null | undefined,
  onDate: string | Date
): number {
  if (certifiedUntil) {
    const certDate = parseDate(certifiedUntil);
    const targetDate = parseDate(onDate);
    if (certDate && targetDate && certDate.getTime() < targetDate.getTime()) {
      return 0;
    }
  }
  return level;
}

/**
 * Qualified on date D = operator is active AND effective level >= minLevel (default 2).
 */
export function isQualified(
  operatorActive: boolean,
  level: number,
  certifiedUntil: string | Date | null | undefined,
  onDate: string | Date,
  minLevel: number = QUALIFIED_MIN_LEVEL
): boolean {
  if (!operatorActive) return false;
  return effectiveLevel(level, certifiedUntil, onDate) >= minLevel;
}

/**
 * Days until certification expiry relative to onDate.
 * Null if no certification date recorded.
 */
export function daysToExpiry(
  certifiedUntil: string | Date | null | undefined,
  onDate: string | Date
): number | null {
  if (!certifiedUntil) return null;
  const certStr = formatDateStr(parseDate(certifiedUntil));
  const onStr = formatDateStr(parseDate(onDate));
  if (!certStr || !onStr) return null;
  return diffDays(certStr, onStr);
}

/**
 * Maps days remaining to alert severity.
 * d < 0 -> expired
 * 0 to 7 -> critical
 * 8 to 14 -> warning
 * 15 to 30 -> notice
 */
export function severityFor(daysRemaining: number): AlertSeverity {
  if (daysRemaining < 0) return "expired";
  if (daysRemaining <= 7) return "critical";
  if (daysRemaining <= 14) return "warning";
  return "notice";
}
