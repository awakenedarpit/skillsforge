import type { Metadata } from "next";
import { Providers } from "../components/providers";
import { getLocale } from "../lib/i18n/getLocale";
import "../lib/env";
import "@fontsource-variable/inter";
import "@fontsource/noto-sans-devanagari";
import "./globals.css";

export const metadata: Metadata = {
  title: "SkillsForge — Operator Skill Matrix & Certification Tracker",
  description:
    "Bilingual Operator Skill Matrix, Coverage Heatmap & Certification Tracker for Manufacturing",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = getLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className="min-h-screen antialiased"
        style={{
          backgroundColor: "rgb(var(--bg))",
          color: "rgb(var(--text))",
        }}
      >
        <Providers initialLocale={locale}>{children}</Providers>
      </body>
    </html>
  );
}
