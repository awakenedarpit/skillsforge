"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useT } from "@/lib/i18n/useT";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Card, Button, Badge } from "@quikit/ui";
import { ShieldCheck, UserCheck, Eye, Factory, ArrowRight, Loader2 } from "lucide-react";
import { DEMO_USERS } from "@/lib/demo/seedData";

export default function LoginPage() {
  const { t } = useT();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);

  const personas = [
    {
      ...DEMO_USERS[0],
      roleLabelKey: "login.roles.orgAdmin",
      badgeVariant: "blue" as const,
      icon: ShieldCheck,
      description: "Full administrative access to operators, machines, and configuration.",
    },
    {
      ...DEMO_USERS[1],
      roleLabelKey: "login.roles.appAdmin",
      badgeVariant: "green" as const,
      icon: UserCheck,
      description: "Shift supervisor with cell editing, assignment checking, and simulation.",
    },
    {
      ...DEMO_USERS[2],
      roleLabelKey: "login.roles.member",
      badgeVariant: "neutral" as const,
      icon: Eye,
      description: "Read-only access to view matrices, coverage heatmaps, and audit reports.",
    },
  ];

  const handleSignIn = async (userId: string) => {
    try {
      setLoadingUserId(userId);
      await signIn("dev-login", {
        userId,
        callbackUrl,
      });
    } catch (err) {
      console.error("Sign-in failed:", err);
      setLoadingUserId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-between p-4 sm:p-8">
      {/* Top Header */}
      <header className="flex items-center justify-between max-w-4xl w-full mx-auto pb-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
            <Factory className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-slate-100">
              SkillsForge
            </span>
            <span className="text-xs text-slate-500 block -mt-1 font-mono">PS 22 · QuikIT</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />
        </div>
      </header>

      {/* Main Login Card */}
      <main className="max-w-xl w-full mx-auto my-auto py-6">
        <Card className="p-6 sm:p-8 shadow-md border-slate-200 dark:border-slate-800">
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {t("login.title")}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
              {t("login.subtitle")}
            </p>
          </div>

          <div className="mb-6 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-lg p-3.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                {t("login.devLoginTitle")}
              </span>
              <span className="text-[10px] bg-blue-200 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded font-mono">
                Mode B
              </span>
            </div>
            <p className="text-xs text-blue-800 dark:text-blue-300/90 leading-relaxed">
              {t("login.devLoginSubtitle")}
            </p>
          </div>

          <div className="space-y-3.5">
            {personas.map((p) => {
              const Icon = p.icon;
              const isLoading = loadingUserId === p.id;

              return (
                <button
                  key={p.id}
                  onClick={() => handleSignIn(p.id)}
                  disabled={Boolean(loadingUserId)}
                  className="w-full text-left p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500/80 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-all group flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="mt-0.5 w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 flex items-center justify-center text-slate-600 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                      ) : (
                        <Icon className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                          {p.name}
                        </span>
                        <Badge variant={p.badgeVariant}>
                          {t(p.roleLabelKey)}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {p.email}
                      </p>
                    </div>
                  </div>

                  <div className="text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-transform group-hover:translate-x-1">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 text-center">
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              QuikIT Monorepo · Operator Skill Matrix & Certification Tracker
            </p>
          </div>
        </Card>
      </main>

      {/* Footer */}
      <footer className="text-center py-4 text-xs text-slate-400 dark:text-slate-600">
        SkillsForge © 2026 · Mode B Stand-in Architecture
      </footer>
    </div>
  );
}
