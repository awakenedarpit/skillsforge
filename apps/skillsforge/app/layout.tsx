import type { Metadata } from "next";
import { Providers } from "../components/providers";
import { getLocale } from "../lib/i18n/getLocale";
import "./globals.css";
import "@fontsource-variable/inter";
import "@fontsource/noto-sans-devanagari";

export const metadata: Metadata = {
  title: "SkillsForge - Operator Skill Matrix & Certification Tracker",
  description: "Bilingual Operator Skill Matrix, Coverage Heatmap & Certification Tracker for Manufacturing",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = getLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
        <Providers initialLocale={locale}>{children}</Providers>
      </body>
    </html>
  );
}
