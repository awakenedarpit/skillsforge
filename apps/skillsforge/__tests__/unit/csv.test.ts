import { describe, it, expect } from "vitest";
import { sanitizeCsvCell, formatCsvRow, buildCsv } from "@/lib/csv";

describe("lib/csv", () => {
  it("guards against formula injection triggers (=, +, -, @, \\t, \\r)", () => {
    expect(sanitizeCsvCell("=SUM(A1:A10)")).toBe("'=SUM(A1:A10)");
    expect(sanitizeCsvCell("+12345")).toBe("'+12345");
    expect(sanitizeCsvCell("-10")).toBe("'-10");
    expect(sanitizeCsvCell("@alert")).toBe("'@alert");
  });

  it("escapes quotes and wraps values with commas, quotes, or newlines", () => {
    expect(sanitizeCsvCell('He said "Hello"')).toBe('"He said ""Hello"""');
    expect(sanitizeCsvCell("Pune, Maharashtra")).toBe('"Pune, Maharashtra"');
    expect(sanitizeCsvCell("Line 1\nLine 2")).toBe('"Line 1\nLine 2"');
  });

  it("handles null and undefined safely", () => {
    expect(sanitizeCsvCell(null)).toBe("");
    expect(sanitizeCsvCell(undefined)).toBe("");
  });

  it("formats rows and builds complete RFC-compliant CSVs", () => {
    const headers = ["Code", "Name", "Formula"];
    const rows = [
      ["OP-01", "Ravi Kumar", "=1+1"],
      ["OP-02", 'Suresh "Tech" Patil', "Standard"],
    ];

    const csv = buildCsv(headers, rows);
    const lines = csv.split("\r\n");

    expect(lines[0]).toBe("Code,Name,Formula");
    expect(lines[1]).toBe("OP-01,Ravi Kumar,'=1+1");
    expect(lines[2]).toBe('OP-02,"Suresh ""Tech"" Patil",Standard');
  });
});
