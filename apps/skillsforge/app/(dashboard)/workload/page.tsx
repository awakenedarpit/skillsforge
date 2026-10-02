"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useT } from "@/lib/i18n/useT";
import { Badge, Button, Skeleton } from "@quikit/ui";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import {
  Scale,
  AlertTriangle,
  Users,
  CheckCircle2,
  Calendar,
  TrendingUp,
  Activity,
} from "lucide-react";

interface OperatorWorkloadStat {
  operatorId: string;
  name: string;
  count: number;
  isOverloaded: boolean;
}

interface WorkloadData {
  days: number;
  asOf: string;
  median: number;
  totalAssignments: number;
  top3SharePct: number;
  top3Count: number;
  stats: OperatorWorkloadStat[];
}

export default function WorkloadPage() {
  const { t, locale } = useT();
  const [daysWindow, setDaysWindow] = useState<number>(14);

  const { data, isLoading, isError } = useQuery<WorkloadData>({
    queryKey: ["workload", daysWindow],
    queryFn: async () => {
      const res = await fetch(`/api/workload?days=${daysWindow}`);
      if (!res.ok) throw new Error("Failed to load workload data");
      const json = await res.json();
      return json.data;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-8 text-center rounded-xl border border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400">
        <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
        <p className="font-bold">{t("common.error")}</p>
        <p className="text-sm">Unable to load workload distribution statistics.</p>
      </div>
    );
  }

  const overloadedCount = data.stats.filter((s) => s.isOverloaded).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <Scale className="w-7 h-7 text-accent-600 dark:text-accent-400" />
            {t("workload.title")}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t("workload.subtitle")}
          </p>
        </div>

        {/* Window Selector */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg dark:bg-slate-800 self-start md:self-auto">
          {[7, 14, 30].map((d) => (
            <Button
              key={d}
              variant={daysWindow === d ? "primary" : "ghost"}
              size="sm"
              onClick={() => setDaysWindow(d)}
            >
              {d} {locale === "hi" ? "दिन" : "Days"}
            </Button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Accepted Assignments */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {locale === "hi" ? "कुल आवंटन" : "Total Deployments"}
            </span>
            <Activity className="w-4 h-4 text-accent-600" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-slate-100 mt-2">
            {data.totalAssignments}
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {locale === "hi"
              ? `पिछले ${data.days} दिनों में स्वीकृत`
              : `Accepted in last ${data.days} days`}
          </span>
        </div>

        {/* Median */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t("workload.median")}
            </span>
            <Scale className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-2">
            {data.median}
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {locale === "hi" ? "प्रति ऑपरेटर मध्यक" : "Per operator benchmark"}
          </span>
        </div>

        {/* Overloaded Operators */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {locale === "hi" ? "अतिभारित ऑपरेटर" : "Overloaded"}
            </span>
            <AlertTriangle className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-2xl font-black font-mono text-red-600 dark:text-red-400 mt-2">
            {overloadedCount}
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            &gt; 1.5× {locale === "hi" ? "मध्यक और ≥ 3 कार्य" : "median and ≥ 3 tasks"}
          </span>
        </div>

        {/* Top 3 Share */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {locale === "hi" ? "शीर्ष 3 का हिस्सा" : "Top 3 Share"}
            </span>
            <TrendingUp className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400 mt-2">
            {data.top3SharePct}%
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {data.top3Count} / {data.totalAssignments} {locale === "hi" ? "आवंटन" : "assignments"}
          </span>
        </div>
      </div>

      {/* Localized Concentration Summary Banner */}
      <div className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-5 shadow-sm dark:border-amber-900/50 dark:from-amber-950/30 dark:to-orange-950/20">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {t("workload.summary", {
                topCount: 3,
                pct: data.top3SharePct,
              })}
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              {locale === "hi"
                ? "यह विसंगति दर्शाती है कि कुछ ही प्रमुख ऑपरेटरों पर अत्यधिक निर्भरता है। कार्यभार वितरण संतुलित करने के लिए अनुशंसित विकल्पों का उपयोग करें।"
                : "This concentration indicates single-point fatigue and reliance on a small cluster. Use smart alternatives to distribute assignments evenly."}
            </p>
          </div>
        </div>
      </div>

      {/* Workload Distribution Bar Chart (Recharts) */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {locale === "hi" ? "ऑपरेटर कार्यभार तुलना" : "Operator Deployment Distribution"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {locale === "hi"
                ? "लाल रंग मध्यक से 1.5 गुना अधिक कार्यभार वाले ऑपरेटरों को दर्शाता है"
                : "Red bars highlight operators exceeding 1.5× median workload threshold"}
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-red-500" />
              {locale === "hi" ? "अतिभारित (>1.5×)" : "Overloaded"}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-accent-500" />
              {locale === "hi" ? "संतुलित" : "Balanced"}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 border-t-2 border-dashed border-emerald-500" />
              {t("workload.median")} ({data.median})
            </span>
          </div>
        </div>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data.stats}
              margin={{ top: 20, right: 20, left: -10, bottom: 40 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis
                dataKey="name"
                interval={0}
                angle={-45}
                textAnchor="end"
                height={60}
                tick={{ fontSize: 11, fill: "currentColor" }}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 12, fill: "currentColor" }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload as OperatorWorkloadStat;
                    return (
                      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-800 dark:bg-slate-900 text-xs">
                        <span className="font-bold text-slate-900 dark:text-slate-100 block mb-1">
                          {d.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500">
                            {locale === "hi" ? "आवंटन:" : "Assignments:"}
                          </span>
                          <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                            {d.count}
                          </span>
                        </div>
                        {d.isOverloaded ? (
                          <div className="mt-1 text-red-600 font-semibold flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {locale === "hi" ? "अतिभारित ऑपरेटर" : "Overloaded Operator"}
                          </div>
                        ) : (
                          <div className="mt-1 text-emerald-600 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            {locale === "hi" ? "सामान्य कार्यभार" : "Balanced Workload"}
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <ReferenceLine
                y={data.median}
                stroke="#10b981"
                strokeDasharray="4 4"
                strokeWidth={2}
                label={{
                  value: `${t("workload.median")}: ${data.median}`,
                  position: "insideTopRight",
                  fill: "#10b981",
                  fontSize: 11,
                  fontWeight: "bold",
                }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {data.stats.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.isOverloaded ? "#ef4444" : "#3b82f6"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Operator Rankings Breakdown Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            {locale === "hi" ? "ऑपरेटर कार्यभार सूची" : "Operator Deployment Roster"}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-950 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">{t("common.operator")}</th>
                <th className="py-3 px-4 text-center">
                  {locale === "hi" ? "स्वीकृत कार्य" : "Accepted Tasks"}
                </th>
                <th className="py-3 px-4 text-center">
                  {locale === "hi" ? "मध्यक तुलना" : "vs Median"}
                </th>
                <th className="py-3 px-4 text-right">
                  {locale === "hi" ? "स्थिति" : "Fairness Status"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.stats.map((op, idx) => {
                const diff = data.median > 0 ? ((op.count - data.median) / data.median) * 100 : 0;
                return (
                  <tr
                    key={op.operatorId}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-850/50"
                  >
                    <td className="py-3 px-4 font-mono text-slate-400 text-xs">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                      {op.name}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold">
                      {op.count}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-xs">
                      {diff > 0 ? (
                        <span className="text-red-600 font-semibold">
                          +{Math.round(diff)}%
                        </span>
                      ) : diff < 0 ? (
                        <span className="text-slate-400">
                          {Math.round(diff)}%
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-semibold">0%</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {op.isOverloaded ? (
                        <Badge variant="red">
                          {locale === "hi" ? "अतिभारित" : "Overloaded"}
                        </Badge>
                      ) : op.count === 0 ? (
                        <Badge variant="neutral">
                          {locale === "hi" ? "उपलब्ध" : "Idle"}
                        </Badge>
                      ) : (
                        <Badge variant="green">
                          {locale === "hi" ? "संतुलित" : "Balanced"}
                        </Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
