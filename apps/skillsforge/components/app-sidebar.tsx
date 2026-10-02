"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useT } from "@/lib/i18n/useT";
import { manifest } from "@/manifest";
import {
  Factory,
  LayoutDashboard,
  Grid,
  CheckSquare,
  GitCompare,
  BarChart3,
  FileSpreadsheet,
  History,
  Settings,
  LogOut,
  UserCheck,
  CalendarCheck,
  Fingerprint,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";

const NAV_ICONS: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  dashboard: LayoutDashboard,
  portal: UserCheck,
  grid: Grid,
  assign: CheckSquare,
  simulator: GitCompare,
  workload: BarChart3,
  reports: FileSpreadsheet,
  history: History,
  leaves: CalendarCheck,
  attendance: Fingerprint,
  admin: Settings,
  superadmin: ShieldCheck,
};

// Section groupings for nav items
const NAV_SECTIONS: Record<string, string> = {
  dashboard: "Overview",
  portal: "Overview",
  grid: "Operations",
  assign: "Operations",
  simulator: "Operations",
  workload: "Operations",
  leaves: "Workforce",
  attendance: "Workforce",
  reports: "Analytics",
  history: "Analytics",
  admin: "System",
  superadmin: "System",
};

export function AppSidebar() {
  const pathname = usePathname();
  const { t } = useT();
  const { data: session } = useSession();

  const userRole = session?.user?.membershipRole || "member";
  const userName = session?.user?.name || "Operator";
  const isSuperAdmin = Boolean(session?.user?.isSuperAdmin);

  const baseItems = manifest.navigation.filter((item) => {
    if (userRole === "member") {
      return item.key === "portal" || item.key === "grid";
    }
    if (userRole === "app_admin") {
      return item.key !== "admin" && item.key !== "portal";
    }
    return item.key !== "portal";
  });

  const navItems = isSuperAdmin
    ? [
        ...baseItems,
        {
          key: "superadmin",
          href: "/superadmin",
          label: t("nav.superadmin"),
        },
      ]
    : baseItems;

  const roleLabel =
    userRole === "org_admin" || userRole === "super_admin"
      ? "Plant Head"
      : userRole === "app_admin"
      ? "Supervisor"
      : "Operator";

  const roleColor =
    userRole === "org_admin" || userRole === "super_admin"
      ? { bg: "rgb(37 99 235 / 0.12)", text: "rgb(96 165 250)", border: "rgb(37 99 235 / 0.2)" }
      : userRole === "app_admin"
      ? { bg: "rgb(22 163 74 / 0.12)", text: "rgb(74 222 128)", border: "rgb(22 163 74 / 0.2)" }
      : { bg: "rgb(var(--accent-500) / 0.1)", text: "rgb(var(--accent-600))", border: "rgb(var(--accent-500) / 0.2)" };

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Group nav items by section
  const sections: Record<string, typeof navItems> = {};
  for (const item of navItems) {
    const section = NAV_SECTIONS[item.key] || "Other";
    if (!sections[section]) sections[section] = [];
    sections[section].push(item);
  }

  // Ordered sections
  const sectionOrder = ["Overview", "Operations", "Workforce", "Analytics", "System"];
  const orderedSections = sectionOrder.filter((s) => sections[s]);

  return (
    <aside
      className="w-60 flex flex-col shrink-0 select-none overflow-hidden"
      style={{
        backgroundColor: "rgb(var(--surface))",
        borderRight: "1px solid rgb(var(--border))",
      }}
    >
      {/* ─── Brand lockup ─── */}
      <div
        className="h-14 flex items-center gap-3 px-4 shrink-0"
        style={{ borderBottom: "1px solid rgb(var(--border))" }}
      >
        {/* Logo mark */}
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 relative"
          style={{
            background: "linear-gradient(135deg, rgb(var(--accent-500)), rgb(var(--accent-700)))",
            boxShadow: "0 2px 8px -2px rgb(var(--accent-600) / 0.5)",
          }}
        >
          <Factory
            className="w-[18px] h-[18px]"
            style={{ color: "rgb(14 13 11)" }}
            strokeWidth={2.2}
          />
        </div>

        <div className="min-w-0">
          <span
            className="font-bold text-sm tracking-tight block leading-none mb-0.5"
            style={{ color: "rgb(var(--text))" }}
          >
            SkillsForge
          </span>
          <span
            className="text-[9px] font-mono tracking-widest uppercase block"
            style={{ color: "rgb(var(--text-muted))" }}
          >
            Enterprise Suite
          </span>
        </div>

        {/* Live indicator */}
        <div className="ml-auto flex items-center gap-1.5 shrink-0">
          <span className="relative flex h-1.5 w-1.5">
            <span
              className="animate-ping-ring absolute inline-flex h-full w-full rounded-full opacity-75"
              style={{ backgroundColor: "rgb(22 163 74)" }}
            />
            <span
              className="relative inline-flex rounded-full h-1.5 w-1.5"
              style={{ backgroundColor: "rgb(22 163 74)" }}
            />
          </span>
        </div>
      </div>

      {/* ─── Navigation ─── */}
      <nav className="flex-1 overflow-y-auto py-4 px-2.5 space-y-5 scrollbar-hide">
        {orderedSections.map((sectionName, sIdx) => (
          <div key={sectionName}>
            {/* Section label */}
            <p
              className="text-[9px] font-mono font-semibold uppercase tracking-[0.12em] px-3 mb-1.5"
              style={{ color: "rgb(var(--text-muted))" }}
            >
              {sectionName}
            </p>

            <div className="space-y-0.5">
              {sections[sectionName].map((item, iIdx) => {
                const Icon = NAV_ICONS[item.key] || LayoutDashboard;
                const isActive =
                  userRole === "member" && item.key === "portal" && pathname === "/"
                    ? true
                    : item.href === "/"
                    ? pathname === "/"
                    : pathname === item.href || pathname.startsWith(item.href + "/");

                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    prefetch={true}
                    className="relative flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-[120ms] group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1 animate-slide-in-left"
                    style={{
                      animationDelay: `${(sIdx * 3 + iIdx) * 30}ms`,
                      ...(isActive
                        ? {
                            backgroundColor: "rgb(var(--accent-500) / 0.1)",
                            color: "rgb(var(--accent-600))",
                            fontWeight: 600,
                          }
                        : {
                            color: "rgb(var(--text-secondary))",
                          }),
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.backgroundColor =
                          "rgb(var(--surface-raised))";
                        (e.currentTarget as HTMLElement).style.color = "rgb(var(--text))";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                        (e.currentTarget as HTMLElement).style.color = "rgb(var(--text-secondary))";
                      }
                    }}
                  >
                    {/* Active indicator stripe */}
                    {isActive && (
                      <span
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r"
                        style={{ backgroundColor: "rgb(var(--accent-500))" }}
                        aria-hidden="true"
                      />
                    )}

                    {/* Icon with colored bg when active */}
                    <span
                      className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all duration-[120ms]"
                      style={
                        isActive
                          ? {
                              backgroundColor: "rgb(var(--accent-500) / 0.15)",
                            }
                          : {}
                      }
                    >
                      <Icon
                        className="w-3.5 h-3.5"
                        style={
                          isActive
                            ? { color: "rgb(var(--accent-600))" }
                            : { color: "rgb(var(--text-muted))" }
                        }
                      />
                    </span>

                    <span className="flex-1 truncate">{t(`nav.${item.key}`)}</span>

                    {isActive && (
                      <ChevronRight
                        className="w-3 h-3 shrink-0 opacity-50"
                        style={{ color: "rgb(var(--accent-600))" }}
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ─── User profile ─── */}
      <div
        className="p-3 shrink-0"
        style={{ borderTop: "1px solid rgb(var(--border))" }}
      >
        {/* User card */}
        <div
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg mb-2"
          style={{ backgroundColor: "rgb(var(--surface-raised))" }}
        >
          {/* Avatar */}
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-bold"
            style={{
              background: "linear-gradient(135deg, rgb(var(--accent-500) / 0.25), rgb(var(--accent-700) / 0.2))",
              color: "rgb(var(--accent-600))",
              border: "1px solid rgb(var(--accent-500) / 0.2)",
            }}
          >
            {initials}
          </div>

          <div className="min-w-0 flex-1">
            <span
              className="text-xs font-semibold truncate block"
              style={{ color: "rgb(var(--text))" }}
            >
              {userName}
            </span>
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-mono font-semibold uppercase tracking-wider mt-0.5"
              style={{
                backgroundColor: roleColor.bg,
                color: roleColor.text,
                border: `1px solid ${roleColor.border}`,
              }}
            >
              {roleLabel}
            </span>
          </div>
        </div>

        {/* Sign out */}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs transition-all duration-[120ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          style={{ color: "rgb(var(--text-muted))" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = "rgb(220 38 38 / 0.07)";
            (e.currentTarget as HTMLElement).style.color = "rgb(var(--signal-red))";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
            (e.currentTarget as HTMLElement).style.color = "rgb(var(--text-muted))";
          }}
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>{t("nav.logout")}</span>
        </button>
      </div>
    </aside>
  );
}
