import { differenceInDays, isBefore, startOfDay } from 'date-fns';

export const QUALIFIED_MIN_LEVEL = 2;
export const MIN_COVERAGE = 2;
export const EXPIRY_WINDOW_DAYS = 30;

export function effectiveLevel(level: number, certifiedUntil: Date | null, onDate: Date): number {
  if (certifiedUntil !== null && isBefore(startOfDay(certifiedUntil), startOfDay(onDate))) {
    return 0;
  }
  return level;
}

export function isQualified(
  operatorActive: boolean,
  level: number,
  certifiedUntil: Date | null,
  onDate: Date,
  minLevel: number = QUALIFIED_MIN_LEVEL
): boolean {
  if (!operatorActive) return false;
  return effectiveLevel(level, certifiedUntil, onDate) >= minLevel;
}

export function daysToExpiry(certifiedUntil: Date | null, onDate: Date): number | null {
  if (!certifiedUntil) return null;
  return differenceInDays(startOfDay(certifiedUntil), startOfDay(onDate));
}
