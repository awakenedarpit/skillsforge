import { describe, it, expect } from "vitest";
import enMessages from "../../messages/en.json";
import hiMessages from "../../messages/hi.json";
import { interpolate } from "../../lib/i18n/useT";
import { formatNumber, formatDateLocale } from "../../lib/i18n/format";

function getAllKeysAndPlaceholders(obj: Record<string, any>, prefix = ""): Map<string, { value: string; placeholders: string[] }> {
  const result = new Map<string, { value: string; placeholders: string[] }>();
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const val = obj[key];
    if (val && typeof val === "object" && !Array.isArray(val)) {
      const nested = getAllKeysAndPlaceholders(val, fullKey);
      for (const [k, v] of nested) {
        result.set(k, v);
      }
    } else if (typeof val === "string") {
      const matches = Array.from(val.matchAll(/\{(\w+)\}/g)).map((m) => m[1]);
      result.set(fullKey, { value: val, placeholders: matches.sort() });
    }
  }
  return result;
}

describe("i18n Key Parity and Integrity", () => {
  const enMap = getAllKeysAndPlaceholders(enMessages);
  const hiMap = getAllKeysAndPlaceholders(hiMessages);

  it("should have exact same keys in en.json and hi.json", () => {
    const enKeys = Array.from(enMap.keys()).sort();
    const hiKeys = Array.from(hiMap.keys()).sort();
    expect(enKeys).toEqual(hiKeys);
  });

  it("should have non-empty strings for all keys", () => {
    for (const [key, data] of enMap) {
      expect(data.value.trim().length, `en key ${key} is empty`).toBeGreaterThan(0);
    }
    for (const [key, data] of hiMap) {
      expect(data.value.trim().length, `hi key ${key} is empty`).toBeGreaterThan(0);
    }
  });

  it("should have matching placeholders in en and hi strings", () => {
    for (const [key, enData] of enMap) {
      const hiData = hiMap.get(key);
      expect(hiData, `Missing hi key for ${key}`).toBeDefined();
      expect(enData.placeholders, `Placeholders mismatch for key ${key}`).toEqual(hiData!.placeholders);
    }
  });

  it("should properly interpolate parameters", () => {
    const template = "Level {level} on {skill}; needs at least {required}.";
    const res = interpolate(template, { level: 1, skill: "CNC-L1", required: 2 });
    expect(res).toBe("Level 1 on CNC-L1; needs at least 2.");
  });

  it("should format numbers with Latin numerals for shop floor", () => {
    const enNum = formatNumber(1250, "en");
    const hiNum = formatNumber(1250, "hi");
    expect(enNum).toMatch(/[0-9]/);
    expect(hiNum).toMatch(/[0-9]/);
  });

  it("should format dates cleanly in both locales", () => {
    const testDate = new Date("2026-10-02T00:00:00Z");
    const enDate = formatDateLocale(testDate, "en");
    const hiDate = formatDateLocale(testDate, "hi");
    expect(enDate.length).toBeGreaterThan(0);
    expect(hiDate.length).toBeGreaterThan(0);
  });

  it("should translate core domain terms consistently according to specification glossary", () => {
    expect(enMessages.common.operator).toBe("Operator");
    expect(hiMessages.common.operator).toBe("ऑपरेटर");
    expect(enMessages.common.machine).toBe("Machine");
    expect(hiMessages.common.machine).toBe("मशीन");
    expect(enMessages.common.shift).toBe("Shift");
    expect(hiMessages.common.shift).toBe("शिफ्ट");
    expect(enMessages.levels["0"]).toBe("None");
    expect(hiMessages.levels["0"]).toBe("कोई नहीं");
    expect(enMessages.levels["4"]).toBe("Can train others");
    expect(hiMessages.levels["4"]).toBe("प्रशिक्षक (दूसरों को सिखा सकते हैं)");
  });
});
