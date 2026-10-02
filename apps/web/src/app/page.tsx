'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import {
  ShieldCheck, TrendingUp, Beaker, AlertTriangle, CheckCircle2,
  XCircle, Clock, ChevronRight, Users, Star, Zap, Activity,
  BookOpen, ArrowRight, RefreshCw, Calendar
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: 'RED' | 'AMBER' | 'GREEN' }) {
  if (status === 'GREEN') return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold status-green">
      <CheckCircle2 className="w-3 h-3" /> Green
    </span>
  );
  if (status === 'AMBER') return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold status-amber">
      <AlertTriangle className="w-3 h-3" /> Amber
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold status-red">
      <XCircle className="w-3 h-3" /> Red
    </span>
  );
}

function LevelBar({ level }: { level: number }) {
  const colors = ['bg-slate-700', 'bg-red-500', 'bg-amber-500', 'bg-blue-500', 'bg-emerald-500'];
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className={`w-2.5 h-2.5 rounded-sm ${i <= level ? colors[level] : 'bg-slate-700'}`} />
      ))}
    </div>
  );
}

function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; color: string;
}) {
  return (
    <div className="glass rounded-2xl p-5 card-hover">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">{label}</p>
          <p className={`text-3xl font-black ${color}`}>{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </div>
        <div className={`p-2.5 rounded-xl ${color.replace('text-', 'bg-').replace('-400', '-500/15')}`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const OPERATORS = [
  { id: 'op-1', name: 'Alice Smith',   shift: 'A' },
  { id: 'op-2', name: 'Bob Johnson',   shift: 'A' },
  { id: 'op-3', name: 'Carol White',   shift: 'A' },
  { id: 'op-4', name: 'David Lee',     shift: 'B' },
  { id: 'op-5', name: 'Eve Martinez',  shift: 'B' },
  { id: 'op-6', name: 'Frank Garcia',  shift: 'B' },
  { id: 'op-7', name: 'Grace Kim',     shift: 'C' },
  { id: 'op-8', name: 'Henry Wilson',  shift: 'C' },
  { id: 'op-9', name: 'Ivan Chen',     shift: 'C' },
];

type Tab = 'coverage' | 'training' | 'forecast' | 'simulator';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('coverage');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [forecastDays, setForecastDays] = useState(30);
  const [selectedOp, setSelectedOp] = useState('op-1');
  const [simTriggered, setSimTriggered] = useState(false);

  const coverageQ = useQuery({
    queryKey: ['coverage', date],
    queryFn: async () => (await fetch(`/api/coverage?date=${date}`)).json(),
  });

  const trainingQ = useQuery({
    queryKey: ['training', date],
    queryFn: async () => (await fetch(`/api/training?date=${date}`)).json(),
  });

  const forecastQ = useQuery({
    queryKey: ['forecast', date, forecastDays],
    queryFn: async () => (await fetch(`/api/forecast?date=${date}&daysAhead=${forecastDays}`)).json(),
    enabled: activeTab === 'forecast',
  });

  const simQ = useQuery({
    queryKey: ['simulate', date, selectedOp],
    queryFn: async () => (await fetch(`/api/simulate?date=${date}&operatorId=${selectedOp}`)).json(),
    enabled: simTriggered,
  });

  // ── Derived stats ────────────────────────────────────────────────────────
  const cells: any[] = coverageQ.data?.coverage?.cells ?? [];
  const redCount   = cells.filter(c => c.status === 'RED').length;
  const amberCount = cells.filter(c => c.status === 'AMBER').length;
  const greenCount = cells.filter(c => c.status === 'GREEN').length;
  const suggestions: any[] = trainingQ.data?.suggestions ?? [];
  const skills: any[]  = coverageQ.data?.meta?.skills  ?? [];
  const shifts: any[]  = coverageQ.data?.meta?.shifts  ?? [];

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'coverage',  label: 'Coverage Matrix', icon: ShieldCheck   },
    { id: 'training',  label: 'Training Plan',   icon: BookOpen      },
    { id: 'forecast',  label: 'Forecast',         icon: TrendingUp    },
    { id: 'simulator', label: 'Simulator',        icon: Beaker        },
  ];

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-7xl mx-auto">

      {/* ─── Header ──────────────────────────────────────────────────── */}
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
              <Zap className="w-5 h-5 text-blue-400" />
            </div>
            <h1 className="text-2xl md:text-3xl font-black gradient-text">SkillForge</h1>
          </div>
          <p className="text-muted-foreground text-sm ml-13">
            Operator Skill Matrix &amp; Certification Tracker
            <span className="ml-2 px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 text-xs font-medium">PS-22</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 glass rounded-xl px-4 py-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="bg-transparent text-sm text-foreground focus:outline-none"
            />
          </div>
          <button
            onClick={() => { coverageQ.refetch(); trainingQ.refetch(); }}
            className="glass rounded-xl p-2.5 hover:bg-blue-500/10 transition-colors group"
          >
            <RefreshCw className="w-4 h-4 text-muted-foreground group-hover:text-blue-400 transition-colors" />
          </button>
        </div>
      </header>

      {/* ─── KPI Stats ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Cells" value={cells.length || '—'} sub={`${skills.length} skills × ${shifts.length} shifts`} icon={Activity} color="text-blue-400" />
        <StatCard label="Green Cells" value={greenCount} sub="Full coverage" icon={CheckCircle2} color="text-emerald-400" />
        <StatCard label="At Risk" value={amberCount + redCount} sub={`${redCount} critical, ${amberCount} warning`} icon={AlertTriangle} color="text-amber-400" />
        <StatCard label="Action Items" value={suggestions.length} sub="Cross-training needed" icon={BookOpen} color="text-purple-400" />
      </div>

      {/* ─── Tab Navigation ──────────────────────────────────────────── */}
      <div className="flex gap-1 glass rounded-2xl p-1.5 mb-6 overflow-x-auto">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-200 flex-1 justify-center ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg glow-blue'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ─── Tab: Coverage Matrix ─────────────────────────────────────── */}
      {activeTab === 'coverage' && (
        <div className="space-y-6">
          {coverageQ.isLoading ? (
            <div className="glass rounded-2xl p-12 flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-muted-foreground text-sm">Loading coverage matrix…</p>
            </div>
          ) : (
            <div className="glass rounded-2xl overflow-hidden">
              <div className="px-6 py-5 border-b border-border flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-foreground text-lg">Coverage Matrix</h2>
                  <p className="text-muted-foreground text-sm">Skills × Shifts on {format(new Date(date), 'PPP')}</p>
                </div>
                <div className="flex gap-2 text-xs">
                  <span className="status-green px-2 py-1 rounded-lg">Qualified ≥ 3</span>
                  <span className="status-amber px-2 py-1 rounded-lg">Minimum</span>
                  <span className="status-red px-2 py-1 rounded-lg">Understaffed</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Skill</th>
                      {shifts.map((sh: any) => (
                        <th key={sh.id} className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">
                          {sh.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {skills.map((skill: any, idx: number) => {
                      const skillCells = cells.filter((c: any) => c.skillId === skill.id);
                      return (
                        <tr key={skill.id} className={`border-b border-border/50 last:border-0 ${idx % 2 === 0 ? '' : 'bg-muted/10'} hover:bg-blue-500/5 transition-colors`}>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                                <span className="text-xs font-bold text-blue-400">{skill.code.split('-')[0]}</span>
                              </div>
                              <div>
                                <div className="font-semibold text-sm text-foreground">{skill.name}</div>
                                <div className="text-xs text-muted-foreground">{skill.code} · {skill.line} · Crit: {'★'.repeat(skill.criticality)}</div>
                              </div>
                            </div>
                          </td>
                          {skillCells.map((cell: any) => (
                            <td key={cell.shiftId} className="px-6 py-4 text-center">
                              <div className="flex flex-col items-center gap-2">
                                <StatusBadge status={cell.status} />
                                <div className="text-foreground font-bold text-xl">{cell.qualifiedCount}</div>
                                <div className="text-xs text-muted-foreground space-y-0.5">
                                  <div className="flex items-center gap-1 justify-center">
                                    <Star className="w-3 h-3 text-amber-500" />
                                    {cell.trainerCount} trainers
                                  </div>
                                  {cell.expiringSoonCount > 0 && (
                                    <div className="flex items-center gap-1 justify-center text-amber-400">
                                      <Clock className="w-3 h-3" />
                                      {cell.expiringSoonCount} expiring
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {/* Operator detail cards below */}
              {cells.some((c: any) => c.status === 'RED') && (
                <div className="p-6 border-t border-border bg-red-500/5">
                  <div className="flex items-center gap-2 text-red-400 font-semibold text-sm mb-4">
                    <XCircle className="w-4 h-4" /> Critical Gaps Detected
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {cells.filter((c: any) => c.status === 'RED').map((c: any) => {
                      const skill = skills.find((s: any) => s.id === c.skillId);
                      const shift = shifts.find((s: any) => s.id === c.shiftId);
                      return (
                        <div key={`${c.skillId}-${c.shiftId}`} className="glass-light rounded-xl p-4 border border-red-500/20">
                          <div className="font-semibold text-sm mb-1">{skill?.name}</div>
                          <div className="text-xs text-muted-foreground mb-2">{shift?.name}</div>
                          <div className="text-red-400 text-xs font-medium">{c.qualifiedCount} qualified — needs 2+</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── Tab: Training Plan ───────────────────────────────────────── */}
      {activeTab === 'training' && (
        <div className="space-y-6">
          <div className="glass rounded-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-border">
              <h2 className="font-bold text-foreground text-lg">Cross-Training Plan</h2>
              <p className="text-muted-foreground text-sm">Prioritized by risk score — highest impact actions first</p>
            </div>
            {trainingQ.isLoading ? (
              <div className="p-12 flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-muted-foreground text-sm">Analyzing coverage risks…</p>
              </div>
            ) : suggestions.length === 0 ? (
              <div className="p-12 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                <p className="font-semibold text-foreground">All coverage requirements met!</p>
                <p className="text-muted-foreground text-sm mt-1">No cross-training actions required at this time.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {suggestions.map((s: any, idx: number) => (
                  <div key={idx} className="px-6 py-5 hover:bg-blue-500/5 transition-colors group">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-blue-400">#{idx + 1}</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-bold text-foreground">{s.operatorName}</span>
                            <ArrowRight className="w-4 h-4 text-muted-foreground" />
                            <span className="font-semibold text-blue-400">{s.skillName}</span>
                            <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">{s.skillCode}</span>
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed">{s.reason}</p>
                          <div className="flex flex-wrap gap-2 mt-3">
                            {s.factors?.map((f: string, fi: number) => (
                              <span key={fi} className="text-xs px-2 py-1 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                {f}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-xs text-muted-foreground mb-1">Priority Score</div>
                        <div className="text-2xl font-black text-emerald-400">{s.score}</div>
                        <div className="text-xs text-muted-foreground mt-1">{s.shiftName}</div>
                        {s.trainerName && (
                          <div className="text-xs text-amber-400 mt-1 flex items-center gap-1 justify-end">
                            <Star className="w-3 h-3" />
                            {s.trainerName}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Tab: Forecast ────────────────────────────────────────────── */}
      {activeTab === 'forecast' && (
        <div className="space-y-6">
          <div className="glass rounded-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-border flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="font-bold text-foreground text-lg">Coverage Forecast</h2>
                <p className="text-muted-foreground text-sm">Project coverage {forecastDays} days into the future based on expiring certs</p>
              </div>
              <div className="flex items-center gap-3 glass-light rounded-xl px-4 py-2">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                <label className="text-sm text-muted-foreground">Days ahead:</label>
                <input
                  type="number"
                  value={forecastDays}
                  onChange={e => setForecastDays(Number(e.target.value))}
                  min={1}
                  max={365}
                  className="bg-transparent w-16 text-sm font-semibold text-foreground focus:outline-none"
                />
              </div>
            </div>

            {forecastQ.isLoading ? (
              <div className="p-12 flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-muted-foreground text-sm">Projecting future coverage…</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Skill</th>
                      {(forecastQ.data?.meta?.shifts ?? []).map((sh: any) => (
                        <th key={sh.id} className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">
                          {sh.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(forecastQ.data?.meta?.skills ?? []).map((skill: any, idx: number) => {
                      const fCells = (forecastQ.data?.coverage?.cells ?? []).filter((c: any) => c.skillId === skill.id);
                      return (
                        <tr key={skill.id} className={`border-b border-border/50 last:border-0 ${idx % 2 === 0 ? '' : 'bg-muted/10'} hover:bg-blue-500/5 transition-colors`}>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-sm text-foreground">{skill.name}</div>
                            <div className="text-xs text-muted-foreground">{skill.code}</div>
                          </td>
                          {fCells.map((cell: any) => (
                            <td key={cell.shiftId} className="px-6 py-4 text-center">
                              <div className="flex flex-col items-center gap-1.5">
                                <StatusBadge status={cell.status} />
                                <div className="text-foreground font-bold">{cell.qualifiedCount}</div>
                              </div>
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="px-6 py-4 bg-amber-500/5 border-t border-border text-xs text-amber-400 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Projection date: {format(new Date(new Date(date).getTime() + forecastDays * 86400000), 'PPP')} · Based on current certification expiry dates
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Tab: Simulator ───────────────────────────────────────────── */}
      {activeTab === 'simulator' && (
        <div className="space-y-6">
          <div className="glass rounded-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-border">
              <h2 className="font-bold text-foreground text-lg flex items-center gap-2">
                <Beaker className="w-5 h-5 text-purple-400" />
                Impact Simulator
              </h2>
              <p className="text-muted-foreground text-sm">Simulate the loss of an operator and visualise coverage impact across all skills and shifts.</p>
            </div>
            <div className="p-6">
              <div className="flex flex-col md:flex-row gap-4 items-end mb-8">
                <div className="flex-1 max-w-xs">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Select Operator to Remove</label>
                  <div className="glass-light rounded-xl p-1">
                    <select
                      value={selectedOp}
                      onChange={e => { setSelectedOp(e.target.value); setSimTriggered(false); }}
                      className="w-full bg-transparent px-3 py-2.5 text-sm text-foreground focus:outline-none appearance-none cursor-pointer"
                    >
                      {OPERATORS.map(op => (
                        <option key={op.id} value={op.id} className="bg-slate-900 text-foreground">
                          {op.name} (Shift {op.shift})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <button
                  onClick={() => { setSimTriggered(true); simQ.refetch(); }}
                  disabled={simQ.isFetching}
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold px-6 py-3 rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {simQ.isFetching ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Running…</>
                  ) : (
                    <><Beaker className="w-4 h-4" /> Run Simulation</>
                  )}
                </button>
              </div>

              {!simTriggered && !simQ.data && (
                <div className="text-center py-12 text-muted-foreground">
                  <Beaker className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p className="font-medium text-foreground/50">Select an operator and click "Run Simulation"</p>
                  <p className="text-sm mt-1">The system will compute coverage impact if that operator were removed</p>
                </div>
              )}

              {simQ.data?.simulation && (
                <div className="space-y-6">
                  {/* Summary metrics */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="glass-light rounded-xl p-4 text-center">
                      <div className="text-xs text-muted-foreground mb-2">Red Cells Before</div>
                      <div className="text-3xl font-black text-foreground">
                        {simQ.data.simulation.before.cells.filter((c: any) => c.status === 'RED').length}
                      </div>
                    </div>
                    <div className="glass-light rounded-xl p-4 text-center border border-red-500/30 bg-red-500/5">
                      <div className="text-xs text-red-400 mb-2">Red Cells After Removal</div>
                      <div className="text-3xl font-black text-red-400">
                        {simQ.data.simulation.after.cells.filter((c: any) => c.status === 'RED').length}
                      </div>
                    </div>
                    <div className="glass-light rounded-xl p-4 text-center">
                      <div className="text-xs text-muted-foreground mb-2">Newly Worsened</div>
                      <div className={`text-3xl font-black ${simQ.data.simulation.worsened.length > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {simQ.data.simulation.worsened.length}
                      </div>
                    </div>
                  </div>

                  {/* Newly RED cells */}
                  {simQ.data.simulation.newlyRed.length > 0 ? (
                    <div className="rounded-xl border border-red-500/30 bg-red-500/5 overflow-hidden">
                      <div className="px-5 py-3 border-b border-red-500/20 flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-red-400" />
                        <span className="font-semibold text-red-400 text-sm">
                          {simQ.data.simulation.newlyRed.length} Cell(s) Would Turn RED
                        </span>
                      </div>
                      {simQ.data.simulation.newlyRed.map((item: any, i: number) => (
                        <div key={i} className="px-5 py-3 border-b border-red-500/10 last:border-0 flex items-center justify-between text-sm">
                          <div>
                            <span className="font-medium text-foreground">
                              {skills.find((s: any) => s.id === item.skillId)?.name ?? item.skillId}
                            </span>
                            <span className="text-muted-foreground mx-2">·</span>
                            <span className="text-muted-foreground">
                              {shifts.find((s: any) => s.id === item.shiftId)?.name ?? item.shiftId}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">{item.beforeCount}</span>
                            <ArrowRight className="w-4 h-4 text-red-400" />
                            <span className="font-semibold text-red-400">{item.afterCount}</span>
                            <span className="text-xs text-muted-foreground">qualified</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5 flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                      <div>
                        <div className="font-semibold text-emerald-400">No new RED cells!</div>
                        <div className="text-sm text-muted-foreground">Removing this operator won't create any critical shortfalls.</div>
                      </div>
                    </div>
                  )}

                  {/* Lost trainers warning */}
                  {simQ.data.simulation.lostAllTrainers.length > 0 && (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-amber-400 mb-1">Trainer Capacity Warning</div>
                        <div className="text-sm text-muted-foreground">
                          These skills would lose their only qualified trainer:{' '}
                          {simQ.data.simulation.lostAllTrainers.map((sid: string) =>
                            skills.find((s: any) => s.id === sid)?.name ?? sid
                          ).join(', ')}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Footer ───────────────────────────────────────────────────── */}
      <footer className="mt-12 pt-6 border-t border-border/50 flex flex-col md:flex-row justify-between items-center gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 pulse-dot" />
          System online · Mock data mode
        </div>
        <div>SkillForge PS-22 · {format(new Date(), 'PPP')}</div>
      </footer>
    </div>
  );
}
