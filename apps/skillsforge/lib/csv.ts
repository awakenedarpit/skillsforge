/**
 * CSV Generation Utility
 * Features RFC 4180 compliance, quote escaping, and Formula Injection (CSV Injection) protection.
 */

const FORMULA_INJECTION_CHARS = ["=", "+", "-", "@", "\t", "\r"];

/**
 * Escapes and sanitizes an individual cell value against CSV formula injection.
 * If cell starts with '=', '+', '-', or '@', it is prepended with a single quote.
 * Quotes within values are escaped by doubling them (" -> "").
 */
export function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  let str = String(value);

  // Prefix formula injection characters with single quote
  if (FORMULA_INJECTION_CHARS.some((char) => str.startsWith(char))) {
    str = `'${str}`;
  }

  // Wrap in double quotes if string contains comma, quote, or newline
  if (str.includes('"') || str.includes(",") || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Converts a row of values into an RFC-compliant CSV line.
 */
export function formatCsvRow(cells: unknown[]): string {
  return cells.map(sanitizeCsvCell).join(",");
}

/**
 * Generates full CSV content from headers and data rows.
 */
export function buildCsv(headers: string[], rows: unknown[][]): string {
  const headerLine = formatCsvRow(headers);
  const dataLines = rows.map(formatCsvRow);
  return [headerLine, ...dataLines].join("\r\n");
}
