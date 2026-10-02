"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useT } from "@/lib/i18n/useT";
import { Badge, Button, EmptyState, Skeleton } from "@quikit/ui";
import {
  AlertCircle,
  AlertTriangle,
  Clock,
  Play,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";

export interface AlertItem {
  id: string;
  operatorId: string;
  skillId: string;
  certifiedUntil: string;
  severity: "expired" | "critical" | "warning" | "notice";
  daysRemaining: number;
  status: "open" | "resolved";
  operator: {
    id: string;
    employeeCode: string;
    name: string;
    shiftId: string;
  };
  skill: {
    id: string;
    code: string;
    name: string;
    nameHi?: string | null;
  };
}

export function AlertPanel() {
  const { t, locale } = useT();
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<string | null>(null);

  const { data: alerts, isLoading, isError } = useQuery<AlertItem[]>({
    queryKey: ["alerts"],
    queryFn: async () => {
      const res = await fetch("/api/alerts?status=open");
      if (!res.ok) throw new Error("Failed to load alerts");
      const json = await res.json();
      return json.data;
    },
    refetchInterval: 15000,
  });

  const checkMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/jobs/expiry-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to run expiry check");
      }
      return await res.json();
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      queryClient.invalidateQueries({ queryKey: ["coverage"] });
      queryClient.invalidateQueries({ queryKey: ["grid"] });
      setFeedback(`Checked ${res.data.flaggedTotal} certs (${res.data.newlyFlagged} newly flagged, ${res.data.resolvedCount} resolved)`);
      setTimeout(() => setFeedback(null), 4000);
    },
    onError: (err: unknown) => {
      setFeedback(err instanceof Error ? err.message : "Error executing check");
      setTimeout(() => setFeedback(null), 4000);
    },
  });

  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (isError || !alerts) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400">
        <AlertCircle className="w-6 h-6 mb-2" />
        <p className="font-semibold">{t("common.error")}</p>
        <p className="text-sm">Unable to load live alerts.</p>
      </div>
    );
  }

  const overdueCount = alerts.filter((a) => a.daysRemaining < 0).length;
  const expiringCount = alerts.filter((a) => a.daysRemaining >= 0 && a.daysRemaining <= 30).length;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-5 border-b border-slate-100 dark:border-slate-800/80 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-accent-600 dark:text-accent-400" />
              {t("alerts.title")}
            </h2>
            {alerts.length > 0 && (
              <Badge variant={overdueCount > 0 ? "red" : "amber"}>
                {alerts.length}
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t("alerts.subtitle")}
          </p>
        </div>

        {/* Action: Run check now */}
        <div className="flex items-center gap-2">
          {feedback && (
            <span className="text-xs font-medium text-accent-700 dark:text-accent-400 animate-fade-in">
              {feedback}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => checkMutation.mutate()}
            disabled={checkMutation.isPending}
            className="shrink-0"
          >
            <Play className={`w-3.5 h-3.5 mr-1.5 ${checkMutation.isPending ? "animate-spin" : ""}`} />
            {checkMutation.isPending ? t("alerts.running") : t("alerts.runCheck")}
          </Button>
        </div>
      </div>

      {/* Body: List of alerts */}
      <div className="p-5 flex-1">
        {alerts.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 className="w-10 h-10 text-emerald-500" />}
            title={t("alerts.empty")}
            description="All active operators hold valid certifications beyond the 30-day window."
          />
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-[460px] overflow-y-auto pr-1">
            {alerts.map((alert) => {
              const isOverdue = alert.daysRemaining < 0;
              const skillName =
                locale === "hi" && alert.skill.nameHi ? alert.skill.nameHi : alert.skill.name;

              return (
                <div
                  key={alert.id}
                  className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-850/40 px-2 rounded-lg transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`mt-0.5 p-2 rounded-lg shrink-0 ${
                        isOverdue
                          ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                          : alert.severity === "critical"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                          : "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                      }`}
                    >
                      {isOverdue ? (
                        <ShieldAlert className="w-4 h-4" />
                      ) : (
                        <AlertTriangle className="w-4 h-4" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                          {alert.operator.name}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">
                          ({alert.operator.employeeCode})
                        </span>
                      </div>

                      <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 truncate">
                        <span className="font-semibold font-mono text-slate-700 dark:text-slate-200">
                          {alert.skill.code}
                        </span>{" "}
                        - {skillName}
                      </div>

                      <div className="text-[11px] text-slate-400 mt-1 font-mono">
                        {t("common.certifiedUntil")}: {alert.certifiedUntil}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        isOverdue
                          ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border border-red-300 dark:border-red-800"
                          : alert.severity === "critical"
                          ? "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200"
                          : alert.severity === "warning"
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300"
                          : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                      }`}
                    >
                      {isOverdue
                        ? t("alerts.overdueBy", { days: Math.abs(alert.daysRemaining) })
                        : t("alerts.daysLeft", { days: alert.daysRemaining })}
                    </span>

                    <Link
                      href={`/grid?shiftId=${alert.operator.shiftId}`}
                      className="text-[11px] text-accent-600 hover:text-accent-800 dark:text-accent-400 font-medium inline-flex items-center gap-0.5 mt-1"
                    >
                      View in Grid <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
