"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useT } from "@/lib/i18n/useT";
import { manifest } from "@/manifest";
import { Badge, Button } from "@quikit/ui";
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
  User,
} from "lucide-react";

const NAV_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  grid: Grid,
  assign: CheckSquare,
  simulator: GitCompare,
  workload: BarChart3,
  reports: FileSpreadsheet,
  history: History,
  admin: Settings,
};

export function AppSidebar() {
  const pathname = usePathname();
  const { t } = useT();
  const { data: session } = useSession();

  const userRole = session?.user?.membershipRole || "member";
  const userName = session?.user?.name || "Operator";

  return (
    <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between shrink-0 select-none">
      <div>
        {/* Brand */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-slate-200 dark:border-slate-800">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm shrink-0">
            <Factory className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-base tracking-tight text-slate-900 dark:text-slate-100 block">
              SkillsForge
            </span>
            <span className="text-[10px] text-slate-500 font-mono tracking-wider uppercase block">
              PS 22 · QuikIT
            </span>
          </div>
        </div>

        {/* Navigation items */}
        <nav className="p-3 space-y-1">
          {manifest.navigation.map((item) => {
            const Icon = NAV_ICONS[item.key] || LayoutDashboard;
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname.startsWith(item.href + "/");

            return (
              <Link
                key={item.key}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-semibold"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-blue-600 dark:text-blue-400" : ""}`} />
                <span>{t(`nav.${item.key}`)}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User profile & Logout */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 shrink-0">
              <User className="w-3.5 h-3.5" />
            </div>
            <div className="truncate">
              <span className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate block">
                {userName}
              </span>
              <span className="text-[10px] text-slate-500 uppercase font-mono block">
                {userRole}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-md text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>{t("nav.logout")}</span>
        </button>
      </div>
    </aside>
  );
}
