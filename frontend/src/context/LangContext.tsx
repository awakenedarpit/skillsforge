import React, { createContext, useContext, useState } from "react";
import type { Lang } from "../i18n/translations";
import { tr, trLevel } from "../i18n/translations";

// ── Context ───────────────────────────────────────────────────────────────────

type TranslationKey = Parameters<typeof tr>[0];

interface LangContextValue {
  lang: Lang;
  toggle: () => void;
  /** Translate a key */
  t: (key: TranslationKey) => string;
  /** Translate a skill level number */
  tLevel: (level: number) => string;
}

const LangContext = createContext<LangContextValue | null>(null);

const STORAGE_KEY = "skillforge_lang";

// ── Provider ──────────────────────────────────────────────────────────────────

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "en" || stored === "hi" ? stored : "hi";
  });

  const toggle = () => {
    const next: Lang = lang === "hi" ? "en" : "hi";
    setLang(next);
    localStorage.setItem(STORAGE_KEY, next);
  };

  const tFn = (key: TranslationKey) => tr(key, lang);
  const tLevelFn = (level: number) => trLevel(level, lang);

  return (
    <LangContext.Provider value={{ lang, toggle, t: tFn, tLevel: tLevelFn }}>
      {children}
    </LangContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be inside LangProvider");
  return ctx;
}

// ── Floating language toggle button (used on every page) ─────────────────────

export function LangToggle() {
  const { lang, toggle } = useLang();
  return (
    <button
      onClick={toggle}
      title={lang === "hi" ? "Switch to English" : "हिंदी में बदलें"}
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "10px 18px",
        borderRadius: "99px",
        border: "1px solid rgba(99,102,241,0.4)",
        background: "rgba(13,21,41,0.85)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        color: "#a5b4fc",
        fontFamily: "inherit",
        fontSize: "13px",
        fontWeight: 700,
        cursor: "pointer",
        boxShadow: "0 4px 20px rgba(0,0,0,0.4), 0 0 0 1px rgba(99,102,241,0.2)",
        transition: "all 0.2s ease",
        letterSpacing: "0.02em",
        userSelect: "none",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.background = "rgba(99,102,241,0.25)";
        (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(99,102,241,0.7)";
        (e.currentTarget as HTMLButtonElement).style.color = "#c7d2fe";
        (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)";
        (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 8px 28px rgba(99,102,241,0.35)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.background = "rgba(13,21,41,0.85)";
        (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(99,102,241,0.4)";
        (e.currentTarget as HTMLButtonElement).style.color = "#a5b4fc";
        (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
        (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 20px rgba(0,0,0,0.4), 0 0 0 1px rgba(99,102,241,0.2)";
      }}
    >
      <span style={{ fontSize: "16px" }}>{lang === "hi" ? "🇬🇧" : "🇮🇳"}</span>
      <span style={{
        display: "flex",
        flexDirection: "column",
        lineHeight: 1.1,
      }}>
        <span style={{ fontSize: "10px", opacity: 0.7, fontWeight: 600 }}>
          {lang === "hi" ? "Switch to" : "बदलें"}
        </span>
        <span>{lang === "hi" ? "English" : "हिंदी"}</span>
      </span>
    </button>
  );
}
