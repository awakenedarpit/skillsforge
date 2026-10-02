import { getLocale } from "./getLocale";
import { interpolate } from "./useT";
import enMessages from "../../messages/en.json";
import hiMessages from "../../messages/hi.json";

const messagesMap = {
  en: enMessages,
  hi: hiMessages,
};

function getNestedValue(obj: unknown, path: string): string | undefined {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return typeof current === "string" ? current : undefined;
}

export function getT(forcedLocale?: "en" | "hi") {
  const locale = forcedLocale ?? getLocale();
  const currentMessages = messagesMap[locale] ?? enMessages;

  function t(
    key: string,
    params?: Record<string, string | number | undefined>
  ): string {
    let str = getNestedValue(currentMessages, key);
    if (!str && locale !== "en") {
      str = getNestedValue(enMessages, key);
    }
    if (!str) {
      return key;
    }
    return interpolate(str, params);
  }

  return { t, locale };
}
