import React, { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LocaleProvider } from "../../lib/i18n/locale-provider";
import { Locale } from "../../lib/i18n/config";

export function TestProviders({
  children,
  locale = "en",
}: {
  children: ReactNode;
  locale?: Locale;
}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <LocaleProvider initialLocale={locale}>{children}</LocaleProvider>
    </QueryClientProvider>
  );
}
