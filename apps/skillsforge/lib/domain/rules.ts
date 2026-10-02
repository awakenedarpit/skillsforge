// Domain rules constants and business date helper (no timezone drift)

export const QUALIFIED_MIN_LEVEL = 2;
export const MIN_COVERAGE = 2;
export const EXPIRY_WINDOW_DAYS = 30;

export const LEVELS: Record<number, string> = {
  0: "None",
  1: "Learning (supervised only)",
  2: "Can operate independently",
  3: "Proficient",
  4: "Can train others",
};

export const CRITICALITY_WEIGHT: Record<number, number> = {
  1: 1.0,
  2: 1.15,
  3: 1.3,
};

/**
 * Returns the business "today" as a YYYY-MM-DD string.
 * Reads APP_TODAY if provided (for demo repeatability and tests),
 * otherwise computes the current date in APP_TIMEZONE (default Asia/Kolkata).
 */
export function today(): string {
  if (process.env.APP_TODAY && /^\d{4}-\d{2}-\d{2}$/.test(process.env.APP_TODAY)) {
    return process.env.APP_TODAY;
  }

  const timeZone = process.env.APP_TIMEZONE || "Asia/Kolkata";
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(now);
}

/**
 * Helper to parse a YYYY-MM-DD or ISO string into a normalized Date object at UTC midnight.
 */
export function parseDate(dateStr: string | Date | null | undefined): Date | null {
  if (!dateStr) return null;
  if (dateStr instanceof Date) {
    if (isNaN(dateStr.getTime())) return null;
    const y = dateStr.getUTCFullYear();
    const m = String(dateStr.getUTCMonth() + 1).padStart(2, "0");
    const d = String(dateStr.getUTCDate()).padStart(2, "0");
    return new Date(`${y}-${m}-${d}T00:00:00.000Z`);
  }
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00.000Z`);
}

/**
 * Helper to format a Date into YYYY-MM-DD string.
 */
export function formatDateStr(date: Date | null | undefined): string | null {
  if (!date || isNaN(date.getTime())) return null;
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Adds days to a YYYY-MM-DD date string.
 */
export function addDaysToStr(dateStr: string, days: number): string {
  const d = parseDate(dateStr);
  if (!d) return dateStr;
  d.setUTCDate(d.getUTCDate() + days);
  return formatDateStr(d)!;
}

/**
 * Difference in days (targetDate - baseDate).
 */
export function diffDays(targetDateStr: string, baseDateStr: string): number {
  const t = parseDate(targetDateStr);
  const b = parseDate(baseDateStr);
  if (!t || !b) return 0;
  const diffMs = t.getTime() - b.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}
