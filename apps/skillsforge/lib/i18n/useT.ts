"use client";

import { useLocale } from "./locale-provider";
import enMessages from "../../messages/en.json";
import hiMessages from "../../messages/hi.json";

const messagesMap = {
  en: enMessages,
  hi: hiMessages,
};

type Messages = typeof enMessages;

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

export function interpolate(
  template: string,
  params?: Record<string, string | number | undefined>
): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return params[key] !== undefined ? String(params[key]) : match;
  });
}

export function useT() {
  const { locale } = useLocale();
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
