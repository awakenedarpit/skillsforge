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
  RefreshCw,
  Zap,
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
  const [feedbackType, setFeedbackType] = useState<"success" | "error">("success");

  const { data: alerts, isLoading, isError } = useQuery<AlertItem[]>({
    queryKey: ["alerts"],
    queryFn: async () => {
      const res = await fetch("/api/alerts?status=open");
      if (!res.ok) throw new Error("Failed to load alerts");
      const json = await res.json();
      return json.data;
    },
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
      setFeedbackType("success");
      setFeedback(
        `Checked ${res.data.flaggedTotal} certs · ${res.data.newlyFlagged} newly flagged · ${res.data.resolvedCount} resolved`
      );
      setTimeout(() => setFeedback(null), 4500);
    },
    onError: (err: unknown) => {
      setFeedbackType("error");
      setFeedback(err instanceof Error ? err.message : "Error executing check");
      setTimeout(() => setFeedback(null), 4500);
    },
  });

  if (isLoading) {
    return (
      <div
        className="rounded-xl overflow-hidden shadow-token-sm"
        style={{
          backgroundColor: "rgb(var(--surface))",
          border: "1px solid rgb(var(--border))",
        }}
      >
        <div className="p-5 space-y-3" style={{ borderBottom: "1px solid rgb(var(--border))" }}>
          <Skeleton className="h-5 w-44 rounded-lg" />
          <Skeleton className="h-3.5 w-32 rounded" />
        </div>
        <div className="p-4 space-y-2.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg p-3.5 space-y-2"
              style={{ backgroundColor: "rgb(var(--surface-raised))", border: "1px solid rgb(var(--border))" }}>
              <Skeleton className="h-3.5 w-36 rounded" />
              <Skeleton className="h-3 w-28 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError || !alerts) {
    return (
      <div
        className="rounded-xl p-5"
        style={{
          backgroundColor: "rgb(220 38 38 / 0.05)",
          border: "1px solid rgb(220 38 38 / 0.2)",
        }}
      >
        <AlertCircle className="w-5 h-5 mb-2" style={{ color: "rgb(220 38 38)" }} />
        <p className="font-semibold text-sm" style={{ color: "rgb(220 38 38)" }}>
          {t("common.error")}
        </p>
        <p className="text-xs mt-0.5" style={{ color: "rgb(var(--text-muted))" }}>
          Unable to load live alerts.
        </p>
      </div>
    );
  }

  const safeAlerts = Array.isArray(alerts) ? alerts : [];
  const overdueCount = safeAlerts.filter((a) => a.daysRemaining < 0).length;
  const criticalCount = safeAlerts.filter((a) => a.severity === "critical").length;

  return (
    <div
      className="rounded-xl shadow-token-sm flex flex-col overflow-hidden"
      style={{
        backgroundColor: "rgb(var(--surface))",
        border: "1px solid rgb(var(--border))",
      }}
    >
      {/* Header */}
      <div
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-5 gap-3"
        style={{ borderBottom: "1px solid rgb(var(--border))" }}
      >
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: "rgb(var(--accent-500) / 0.1)" }}
            >
              <Clock className="w-3.5 h-3.5" style={{ color: "rgb(var(--accent-600))" }} />
            </div>
            <h2
              className="text-sm font-bold"
              style={{ color: "rgb(var(--text))" }}
            >
              {t("alerts.title")}
            </h2>

            {safeAlerts.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Badge variant={overdueCount > 0 ? "red" : "amber"}>
                  {safeAlerts.length}
                </Badge>
                {overdueCount > 0 && (
                  <span
                    className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-full"
                    style={{
                      backgroundColor: "rgb(220 38 38 / 0.1)",
                      color: "rgb(185 28 28)",
                      border: "1px solid rgb(220 38 38 / 0.2)",
                    }}
                  >
                    {overdueCount} overdue
                  </span>
                )}
              </div>
            )}
          </div>
          <p
            className="text-xs"
            style={{ color: "rgb(var(--text-muted))" }}
          >
            {t("alerts.subtitle")}
          </p>
        </div>

        {/* Run check action */}
        <div className="flex items-center gap-2 shrink-0">
          {feedback && (
            <span
              className="text-xs font-medium font-mono animate-fade-in"
              style={{
                color: feedbackType === "success"
                  ? "rgb(var(--accent-700))"
                  : "rgb(220 38 38)",
              }}
            >
              {feedback}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => checkMutation.mutate()}
            disabled={checkMutation.isPending}
            className="gap-1.5"
          >
            {checkMutation.isPending ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Zap className="w-3.5 h-3.5" style={{ color: "rgb(var(--accent-600))" }} />
            )}
            {checkMutation.isPending ? t("alerts.running") : t("alerts.runCheck")}
          </Button>
        </div>
      </div>

      {/* Alert list */}
      <div className="p-4 flex-1">
        {safeAlerts.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 className="w-10 h-10" style={{ color: "rgb(22 163 74)" }} />}
            title={t("alerts.empty")}
            description="All active operators hold valid certifications beyond the 30-day window."
          />
        ) : (
          <div
            className="divide-y max-h-[440px] overflow-y-auto scrollbar-hide"
            style={{ borderColor: "rgb(var(--border))" }}
          >
            {safeAlerts.map((alert) => {
              const isOverdue = alert.daysRemaining < 0;
              const isCritical = alert.severity === "critical";
              const skillName =
                locale === "hi" && alert.skill.nameHi
                  ? alert.skill.nameHi
                  : alert.skill.name;

              const severityConfig = isOverdue
                ? {
                    bg: "rgb(220 38 38 / 0.08)",
                    text: "rgb(220 38 38)",
                    badgeBg: "rgb(220 38 38 / 0.1)",
                    badgeText: "rgb(185 28 28)",
                    badgeBorder: "rgb(220 38 38 / 0.2)",
                  }
                : isCritical
                ? {
                    bg: "rgb(var(--accent-500) / 0.08)",
                    text: "rgb(var(--accent-700))",
                    badgeBg: "rgb(var(--accent-500) / 0.1)",
                    badgeText: "rgb(var(--accent-700))",
                    badgeBorder: "rgb(var(--accent-500) / 0.2)",
                  }
                : {
                    bg: "rgb(37 99 235 / 0.07)",
                    text: "rgb(37 99 235)",
                    badgeBg: "rgb(37 99 235 / 0.08)",
                    badgeText: "rgb(37 99 235)",
                    badgeBorder: "rgb(37 99 235 / 0.15)",
                  };

              return (
                <div
                  key={alert.id}
                  className="py-3 px-2 flex items-center justify-between gap-3 rounded-lg transition-colors duration-[80ms]"
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor =
                      "rgb(var(--surface-raised))";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                  }}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    {/* Severity icon pill */}
                    <div
                      className="mt-0.5 p-1.5 rounded-lg shrink-0"
                      style={{
                        backgroundColor: severityConfig.bg,
                        color: severityConfig.text,
                      }}
                    >
                      {isOverdue ? (
                        <ShieldAlert className="w-3.5 h-3.5" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className="font-semibold text-xs"
                          style={{ color: "rgb(var(--text))" }}
                        >
                          {alert.operator.name}
                        </span>
                        <span
                          className="text-[10px] font-mono"
                          style={{ color: "rgb(var(--text-muted))" }}
                        >
                          ({alert.operator.employeeCode})
                        </span>
                      </div>
                      <div
                        className="text-xs mt-0.5 truncate"
                        style={{ color: "rgb(var(--text-secondary))" }}
                      >
                        <span className="font-mono font-semibold">{alert.skill.code}</span>{" "}
                        — {skillName}
                      </div>
                      <div
                        className="text-[10px] font-mono mt-1"
                        style={{ color: "rgb(var(--text-muted))" }}
                      >
                        {t("common.certifiedUntil")}: {alert.certifiedUntil}
                      </div>
                    </div>
                  </div>

                  {/* Days badge + link */}
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span
                      className="text-[11px] font-bold font-mono px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: severityConfig.badgeBg,
                        color: severityConfig.badgeText,
                        border: `1px solid ${severityConfig.badgeBorder}`,
                      }}
                    >
                      {isOverdue
                        ? t("alerts.overdueBy", { days: Math.abs(alert.daysRemaining) })
                        : t("alerts.daysLeft", { days: alert.daysRemaining })}
                    </span>
                    <Link
                      href={`/grid?shiftId=${alert.operator.shiftId}`}
                      className="text-[10px] font-medium inline-flex items-center gap-0.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-500 rounded"
                      style={{ color: "rgb(var(--accent-600))" }}
                    >
                      Grid <ExternalLink className="w-3 h-3" />
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
