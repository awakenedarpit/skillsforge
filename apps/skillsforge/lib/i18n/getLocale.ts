import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, Locale, LOCALES } from "./config";

export function getLocale(): Locale {
  try {
    const cookieStore = cookies();
    const cookieVal = cookieStore.get(LOCALE_COOKIE)?.value;
    if (cookieVal && (LOCALES as readonly string[]).includes(cookieVal)) {
      return cookieVal as Locale;
    }

    const headersList = headers();
    const acceptLang = headersList.get("accept-language") || "";
    if (acceptLang.toLowerCase().startsWith("hi")) {
      return "hi";
    }
  } catch {
    // If called outside of request context
  }

  return DEFAULT_LOCALE;
}
