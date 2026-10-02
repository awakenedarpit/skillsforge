"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { useT } from "@/lib/i18n/useT";
import { LanguageSwitcher } from "./language-switcher";
import { Badge } from "@quikit/ui";
import { Calendar } from "lucide-react";
import { today } from "@/lib/domain/rules";

export function AppHeader() {
  const { t, locale } = useT();
  const { data: session } = useSession();
  const currentDate = today();

  const role = session?.user?.membershipRole || "member";
  const roleBadgeVariant =
    role === "org_admin" || role === "super_admin"
      ? "blue"
      : role === "app_admin"
      ? "green"
      : "neutral";

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-md font-mono">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>{t("common.asOf")}: {currentDate}</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Badge variant={roleBadgeVariant}>
          {role}
        </Badge>
        <div className="h-5 w-px bg-slate-200 dark:bg-slate-700" />
        <LanguageSwitcher />
      </div>
    </header>
  );
}
