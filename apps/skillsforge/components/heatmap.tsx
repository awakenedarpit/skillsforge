"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useT } from "@/lib/i18n/useT";
import { today, addDaysToStr } from "@/lib/domain/rules";
import { daysToExpiry } from "@/lib/domain/qualification";
import { CoveragePayload, CoverageCellView, SkillDomainView, ShiftDomainView } from "@/lib/domain/coverage";
import { riskScore } from "@/lib/domain/risk";
import { Badge, Button, Modal, Skeleton, Slider } from "@quikit/ui";
import { AlertTriangle, CheckCircle2, AlertCircle, Users, Award, ShieldAlert, Calendar } from "lucide-react";

interface HeatmapProps {
  asOf?: string;
  compact?: boolean;
  showForecastSlider?: boolean;
  overrideData?: CoveragePayload;
}

export function CoverageHeatmap({
  asOf = today(),
  compact = false,
  showForecastSlider = true,
  overrideData,
}: HeatmapProps) {
  const { t, locale } = useT();
  const [forecastDays, setForecastDays] = useState<number>(0);
  const [workstationFilter, setWorkstationFilter] = useState<"ALL" | "RED" | "SPOF">("ALL");
  const [selectedCell, setSelectedCell] = useState<{
    cell: CoverageCellView;
    skill: SkillDomainView;
    shift: ShiftDomainView;
  } | null>(null);

  const effectiveAsOf = forecastDays > 0 ? addDaysToStr(asOf, forecastDays) : asOf;

  const { data: fetchedData, isLoading, isError } = useQuery<CoveragePayload>({
    queryKey: ["coverage", effectiveAsOf],
    queryFn: async () => {
      const res = await fetch(`/api/coverage?asOf=${effectiveAsOf}`);
      if (!res.ok) throw new Error("Failed to load coverage");
      const json = await res.json();
      return json.data;
    },
    enabled: !overrideData,
    refetchInterval: false,
  });

  const data = overrideData || fetchedData;

  if (isLoading && !overrideData) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-6 text-center rounded-lg border border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400">
        <AlertCircle className="w-8 h-8 mx-auto mb-2" />
        <p className="font-semibold">{t("common.error")}</p>
        <p className="text-sm">Unable to load coverage heatmap data.</p>
      </div>
    );
  }

  const { skills, shifts, cells, totals } = data;

  const cellMap = new Map<string, CoverageCellView>();
  for (const c of cells) {
    cellMap.set(`${c.skillId}_${c.shiftId}`, c);
  }

  const totalsMap = new Map(totals.map((tot) => [tot.skillId, tot]));

  return (
    <div className="space-y-4">
      {/* Forecast Slider Banner (MVP-2) */}
      {showForecastSlider && (
        <div className="rounded-xl p-4 shadow-token-sm" style={{ backgroundColor: "rgb(var(--surface))", border: "1px solid rgb(var(--border))" }}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
            <div>
              <span className="text-sm font-bold flex items-center gap-1.5" style={{ color: "rgb(var(--text))" }}>
                <Calendar className="w-4 h-4 text-accent-600 dark:text-accent-400" />
                {t("dashboard.forecast")}
              </span>
              <span className="text-xs block mt-0.5" style={{ color: "rgb(var(--text-muted))" }}>
                {forecastDays === 0
                  ? t("common.today") + ` (${asOf})`
                  : `+${forecastDays} days (${effectiveAsOf})`}
              </span>
            </div>

            {/* Presets */}
            <div className="flex items-center gap-1.5">
              {[0, 30, 60, 90].map((days) => (
                <Button
                  key={days}
                  variant={forecastDays === days ? "primary" : "outline"}
                  size="sm"
                  onClick={() => setForecastDays(days)}
                >
                  {days === 0 ? t("common.today") : `+${days}d`}
                </Button>
              ))}
            </div>
          </div>

          <div className="px-2 pt-1 pb-2">
            <Slider
              value={[forecastDays]}
              onValueChange={([val]) => setForecastDays(val)}
              min={0}
              max={90}
              step={1}
              aria-label="Coverage forecast slider"
            />
            <div className="flex justify-between text-[11px] mt-2 font-mono" style={{ color: "rgb(var(--text-muted))" }}>
              <span>{t("common.today")}</span>
              <span>+30d</span>
              <span>+60d</span>
              <span>+90d</span>
            </div>
          </div>

          {forecastDays > 0 && (
            <div className="mt-3 flex items-center justify-between rounded-lg p-2.5 text-xs" style={{ backgroundColor: "rgb(var(--accent-500) / 0.08)", color: "rgb(var(--accent-700))", border: "1px solid rgb(var(--accent-500) / 0.2)" }}>
              <span className="flex items-center gap-1.5 font-medium">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                {t("dashboard.forecastBanner")}
              </span>
              <button
                type="button"
                onClick={() => setForecastDays(0)}
                className="underline font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-500 rounded"
              >
                {t("dashboard.resetToday")}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Workstation Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={workstationFilter === "ALL" ? "primary" : "outline"}
            onClick={() => setWorkstationFilter("ALL")}
            className="text-xs"
          >
            {t("dashboard.allStations")} ({skills.length})
          </Button>

          <Button
            size="sm"
            variant={workstationFilter === "RED" ? "primary" : "outline"}
            onClick={() => setWorkstationFilter("RED")}
            className={`text-xs ${
              workstationFilter !== "RED"
                ? "text-red-700 bg-red-50 hover:bg-red-100 border-red-200 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
                : ""
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 mr-1 text-red-500" />
            {t("dashboard.redCellsOnly")}
          </Button>

          <Button
            size="sm"
            variant={workstationFilter === "SPOF" ? "primary" : "outline"}
            onClick={() => setWorkstationFilter("SPOF")}
            className={`text-xs ${
              workstationFilter !== "SPOF"
                ? "text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-200 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300"
                : ""
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 mr-1 text-amber-500" />
            {t("dashboard.spofsOnly")}
          </Button>
        </div>

        {workstationFilter !== "ALL" && (
          <button
            type="button"
            onClick={() => setWorkstationFilter("ALL")}
            className="text-xs underline font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-500 rounded" style={{ color: "rgb(var(--text-muted))" }}
          >
            {t("common.close")}
          </button>
        )}
      </div>

      {/* Heatmap Table */}
      <div className="w-full overflow-x-auto rounded-xl shadow-token-sm" style={{ backgroundColor: "rgb(var(--surface))", border: "1px solid rgb(var(--border))" }}>
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="text-xs font-semibold uppercase tracking-wider" style={{ borderBottom: "1px solid rgb(var(--border))", backgroundColor: "rgb(var(--surface-raised))", color: "rgb(var(--text-muted))" }}>
              <th className={compact ? "p-2 min-w-[140px]" : "p-3.5 min-w-[180px]"}>
                {t("common.machine")}
              </th>
              {shifts.map((shift) => (
                <th
                  key={shift.id}
                  className={compact ? "p-2 text-center min-w-[80px]" : "p-3.5 text-center min-w-[120px]"}
                >
                  <span className="font-bold" style={{ color: "rgb(var(--text))" }}>
                    {t("common.shift")} {shift.code}
                  </span>
                  {!compact && (
                    <span className="block text-[10px] font-normal lowercase font-mono" style={{ color: "rgb(var(--text-muted))" }}>
                      {shift.startTime} - {shift.endTime}
                    </span>
                  )}
                </th>
              ))}
              <th className={compact ? "p-2 text-center min-w-[80px]" : "p-3.5 text-center min-w-[110px]"}>
                {t("heatmap.total")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y text-sm" style={{ borderColor: "rgb(var(--border))" }}>
            {skills
              .filter((skill) => {
                if (workstationFilter === "ALL") return true;
                if (workstationFilter === "SPOF") {
                  const tot = totalsMap.get(skill.id);
                  return tot?.isSpof;
                }
                if (workstationFilter === "RED") {
                  return shifts.some((shift) => {
                    const cell = cellMap.get(`${skill.id}_${shift.id}`);
                    return cell && cell.status === "RED";
                  });
                }
                return true;
              })
              .map((skill) => {
              const skillCells = shifts
                .map((shift) => cellMap.get(`${skill.id}_${shift.id}`))
                .filter((c): c is CoverageCellView => Boolean(c));

              const { score } = riskScore(skill.criticality, skillCells);
              const totalView = totalsMap.get(skill.id);
              const displayName = locale === "hi" && skill.nameHi ? skill.nameHi : skill.name;

              return (
                <tr
                  key={skill.id}
                  className="transition-colors duration-[80ms]"
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "rgb(var(--surface-raised))"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
                >
                  {/* Machine details */}
                  <td className={compact ? "p-2" : "p-3.5"}>
                    <div className="flex items-center gap-2">
                      <span className="font-bold font-mono text-xs" style={{ color: "rgb(var(--text))" }}>
                        {skill.code}
                      </span>
                      <Badge
                        variant={
                          score >= 70 ? "red" : score >= 30 ? "amber" : "neutral"
                        }
                      >
                        Risk {score}
                      </Badge>
                    </div>
                    <span className="text-xs block truncate max-w-[170px] mt-0.5" style={{ color: "rgb(var(--text-secondary))" }}>
                      {displayName}
                    </span>
                  </td>

                  {/* Shift cells */}
                  {shifts.map((shift) => {
                    const cell = cellMap.get(`${skill.id}_${shift.id}`);
                    const count = cell ? cell.qualifiedCount : 0;
                    const status = cell ? cell.status : "RED";

                    const isRed = status === "RED";
                    const isAmber = status === "AMBER";
                    const isGreen = status === "GREEN";

                    return (
                      <td key={shift.id} className={compact ? "p-1.5" : "p-2.5"}>
                        <button
                          type="button"
                          onClick={() => {
                            if (cell) {
                              setSelectedCell({ cell, skill, shift });
                            }
                          }}
                          className={`w-full text-center rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-accent-500 ${compact ? "p-2" : "p-3"} ${isRed ? "cell-glow-red" : ""}`}
                          style={isRed
                            ? { backgroundColor: "rgb(220 38 38 / 0.08)", color: "rgb(185 28 28)", border: "1px solid rgb(220 38 38 / 0.25)" }
                            : isAmber
                            ? { backgroundColor: "rgb(var(--accent-500) / 0.08)", color: "rgb(var(--accent-700))", border: "1px solid rgb(var(--accent-500) / 0.2)" }
                            : { backgroundColor: "rgb(22 163 74 / 0.08)", color: "rgb(21 128 61)", border: "1px solid rgb(22 163 74 / 0.2)" }
                          }
                        >
                          <div className="flex items-center justify-center gap-1">
                            {isRed && (
                              <AlertTriangle className="w-3.5 h-3.5 text-red-600 dark:text-red-400 shrink-0" />
                            )}
                            {isGreen && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            )}
                            <span
                              className={`font-black font-mono tracking-tight ${
                                compact ? "text-lg" : "text-2xl"
                              }`}
                            >
                              {count}
                            </span>
                          </div>

                          <span className="block text-[10px] font-semibold uppercase tracking-wider mt-0.5 opacity-85">
                            {isRed
                              ? "SPOF (<2)"
                              : isAmber
                              ? "Thin (2)"
                              : "Safe (3+)"}
                          </span>

                          {/* Trainer badge in cell */}
                          {cell && cell.trainerCount > 0 && !compact && (
                            <span className="inline-block mt-1 px-1.5 py-0.5 text-[9px] font-bold rounded" style={{ backgroundColor: "rgb(var(--surface-raised))", color: "rgb(var(--text-muted))", border: "1px solid rgb(var(--border))" }}>
                              ★ {cell.trainerCount}
                            </span>
                          )}

                          {/* Future turn red notice */}
                          {cell?.turnsRedOn && !compact && (() => {
                            const days = daysToExpiry(cell.turnsRedOn, effectiveAsOf);
                            return (
                              <span className="block text-[9px] font-medium mt-1" style={{ color: "rgb(220 38 38)" }}>
                                {locale === "hi"
                                  ? `${days !== null && days >= 0 ? `${days}d में` : cell.turnsRedOn} लाल होगा`
                                  : `turns red ${days !== null && days >= 0 ? `in ${days}d` : cell.turnsRedOn}`}
                              </span>
                            );
                          })()}
                        </button>
                      </td>
                    );
                  })}

                  {/* Totals column */}
                  <td className={compact ? "p-2 text-center" : "p-3.5 text-center"}>
                    <div className="font-extrabold font-mono text-base" style={{ color: "rgb(var(--text))" }}>
                      {totalView?.totalQualified ?? 0}
                    </div>
                    {totalView?.isSpof && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase mt-0.5" style={{ color: "rgb(220 38 38)" }}>
                        <ShieldAlert className="w-3 h-3" /> SPOF
                      </span>
                    )}
                    {!compact && totalView && totalView.trainerCount > 0 && (
                      <span className="block text-[10px]" style={{ color: "rgb(var(--text-muted))" }}>
                        {totalView.trainerCount} trainer{totalView.trainerCount > 1 ? "s" : ""}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Heatmap Legend */}
      <div className="flex flex-wrap items-center justify-between text-xs px-1 pt-1 gap-3" style={{ color: "rgb(var(--text-muted))" }}>
        <span className="font-semibold" style={{ color: "rgb(var(--text-secondary))" }}>
          {t("heatmap.legendTitle")}:
        </span>
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full bg-red-500 cell-glow-red" />
            {t("heatmap.status.red")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full bg-amber-500" />
            {t("heatmap.status.amber")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full bg-emerald-500" />
            {t("heatmap.status.green")}
          </span>
        </div>
      </div>

      {/* Operator Drilldown Modal */}
      {selectedCell && (
        <Modal
          open={Boolean(selectedCell)}
          onOpenChange={(open) => {
            if (!open) setSelectedCell(null);
          }}
          title={`${t("heatmap.cellDetail")}: ${selectedCell.skill.code} (${t("common.shift")} ${selectedCell.shift.code})`}
          description={selectedCell.skill.name}
        >
          <div className="space-y-3 mt-2">
            {selectedCell.cell.operators.length === 0 ? (
              <div className="p-4 text-center text-sm rounded-lg" style={{ color: "rgb(220 38 38)", backgroundColor: "rgb(220 38 38 / 0.06)", border: "1px solid rgb(220 38 38 / 0.2)" }}>
                <AlertTriangle className="w-5 h-5 mx-auto mb-1" />
                No qualified operators assigned to this shift.
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: "rgb(var(--border))" }}>
                {selectedCell.cell.operators.map((op) => (
                  <div key={op.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-sm block" style={{ color: "rgb(var(--text))" }}>
                        {op.name}
                      </span>
                      <span className="text-xs font-mono" style={{ color: "rgb(var(--text-muted))" }}>
                        {op.certifiedUntil
                          ? `${t("common.certifiedUntil")}: ${op.certifiedUntil}`
                          : "No expiry recorded"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          op.level >= 4
                            ? "blue"
                            : op.level === 3
                            ? "green"
                            : "neutral"
                        }
                      >
                        {op.level >= 4 ? "Trainer (L4)" : `Level ${op.level}`}
                      </Badge>

                      {op.daysToExpiry !== null && (
                        <span
                          className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={op.daysToExpiry < 0
                            ? { backgroundColor: "rgb(220 38 38 / 0.1)", color: "rgb(185 28 28)" }
                            : op.daysToExpiry <= 30
                            ? { backgroundColor: "rgb(var(--accent-500) / 0.1)", color: "rgb(var(--accent-700))" }
                            : { backgroundColor: "rgb(var(--surface-raised))", color: "rgb(var(--text-muted))" }
                          }
                        >
                          {op.daysToExpiry < 0
                            ? `Overdue by ${Math.abs(op.daysToExpiry)}d`
                            : `${op.daysToExpiry}d left`}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedCell(null)}
              >
                {t("common.close")}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
