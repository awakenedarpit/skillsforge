"use client";

import React from "react";
import { useLocale } from "../lib/i18n/locale-provider";
import { Segmented } from "@quikit/ui";
import { Locale } from "../lib/i18n/config";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale } = useLocale();

  return (
    <div className={className} role="region" aria-label="Language Selector">
      <Segmented<Locale>
        value={locale}
        onChange={(val) => setLocale(val)}
        options={[
          { label: "EN", value: "en" },
          { label: "हिं", value: "hi" },
        ]}
      />
    </div>
  );
}
