import { Locale } from "./config";

export function formatNumber(value: number, locale: Locale = "en"): string {
  const intlLocale = locale === "hi" ? "hi-IN-u-nu-latn" : "en-IN-u-nu-latn";
  return new Intl.NumberFormat(intlLocale).format(value);
}

export function formatDateLocale(
  date: string | Date | null | undefined,
  locale: Locale = "en",
  options?: Intl.DateTimeFormatOptions
): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";

  const intlLocale = locale === "hi" ? "hi-IN-u-nu-latn" : "en-IN-u-nu-latn";
  const defaultOpts: Intl.DateTimeFormatOptions = options ?? {
    year: "numeric",
    month: "short",
    day: "numeric",
  };

  return new Intl.DateTimeFormat(intlLocale, defaultOpts).format(d);
}
