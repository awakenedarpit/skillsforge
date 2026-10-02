"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { useT } from "@/lib/i18n/useT";
import { LanguageSwitcher } from "./language-switcher";
import { Badge } from "@quikit/ui";
import { Calendar, Bell, Activity } from "lucide-react";
import { today } from "@/lib/domain/rules";
import { useQuery } from "@tanstack/react-query";

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

  // Fetch alert count for badge
  const { data: alerts } = useQuery({
    queryKey: ["alerts"],
    queryFn: async () => {
      const res = await fetch("/api/alerts?status=open");
      if (!res.ok) return [];
      const json = await res.json();
      return json.data;
    },
    staleTime: 60_000,
  });

  const alertCount = Array.isArray(alerts) ? alerts.length : 0;
  const overdueCount = Array.isArray(alerts)
    ? alerts.filter((a: { daysRemaining: number }) => a.daysRemaining < 0).length
    : 0;

  return (
    <header
      className="h-14 px-5 flex items-center justify-between shrink-0 relative"
      style={{
        backgroundColor: "rgb(var(--surface))",
        borderBottom: "1px solid rgb(var(--border))",
      }}
    >
      {/* Left: system status + date */}
      <div className="flex items-center gap-3">
        {/* System status pill */}
        <div
          className="hidden sm:flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-lg"
          style={{
            backgroundColor: "rgb(22 163 74 / 0.08)",
            color: "rgb(22 163 74)",
            border: "1px solid rgb(22 163 74 / 0.15)",
          }}
        >
          <Activity className="w-3 h-3" />
          <span className="text-[10px] font-semibold uppercase tracking-wide">Live</span>
        </div>

        {/* Date chip */}
        <div
          className="flex items-center gap-1.5 text-xs font-mono px-2.5 py-1.5 rounded-lg"
          style={{
            backgroundColor: "rgb(var(--surface-raised))",
            color: "rgb(var(--text-muted))",
            border: "1px solid rgb(var(--border))",
          }}
        >
          <Calendar className="w-3 h-3" style={{ color: "rgb(var(--accent-600))" }} />
          <span>
            {t("common.asOf")}:{" "}
            <span
              className="font-semibold"
              style={{ color: "rgb(var(--text-secondary))" }}
            >
              {currentDate}
            </span>
          </span>
        </div>
      </div>

      {/* Right: alert bell + role + language */}
      <div className="flex items-center gap-3">
        {/* Alert bell with badge */}
        {alertCount > 0 && (
          <button
            className="relative w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-[120ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            style={{
              backgroundColor: "rgb(var(--surface-raised))",
              border: "1px solid rgb(var(--border))",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = "rgb(var(--accent-500) / 0.08)";
              (e.currentTarget as HTMLElement).style.borderColor = "rgb(var(--accent-500) / 0.3)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = "rgb(var(--surface-raised))";
              (e.currentTarget as HTMLElement).style.borderColor = "rgb(var(--border))";
            }}
            aria-label={`${alertCount} active alerts`}
          >
            <Bell
              className="w-3.5 h-3.5"
              style={{
                color: overdueCount > 0 ? "rgb(var(--signal-red))" : "rgb(var(--accent-600))",
              }}
            />
            {/* Badge dot */}
            <span
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
              style={{
                backgroundColor: overdueCount > 0
                  ? "rgb(var(--signal-red))"
                  : "rgb(var(--accent-600))",
                color: "rgb(14 13 11)",
              }}
            >
              {alertCount > 9 ? "9+" : alertCount}
            </span>
          </button>
        )}

        {/* Role badge */}
        <Badge variant={roleBadgeVariant}>{role}</Badge>

        {/* Divider */}
        <div
          className="w-px h-4"
          style={{ backgroundColor: "rgb(var(--border))" }}
          aria-hidden="true"
        />

        <LanguageSwitcher />
      </div>
    </header>
  );
}
