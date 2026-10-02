import { getT } from "@/lib/i18n/getT";

export default function DashboardPage() {
  const { t } = getT();

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {t("dashboard.title")}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {t("dashboard.subtitle")}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 p-5 shadow-sm">
          <span className="text-xs font-semibold text-red-700 dark:text-red-400 uppercase tracking-wider">
            {t("dashboard.kpi.redCells")}
          </span>
          <p className="text-3xl font-extrabold text-red-600 dark:text-red-400 mt-2">5</p>
          <span className="text-[11px] text-red-600/80 dark:text-red-400/80 mt-1 block">
            Fewer than 2 qualified operators
          </span>
        </div>

        <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 p-5 shadow-sm">
          <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
            {t("dashboard.kpi.spofMachines")}
          </span>
          <p className="text-3xl font-extrabold text-amber-600 dark:text-amber-400 mt-2">1</p>
          <span className="text-[11px] text-amber-600/80 dark:text-amber-400/80 mt-1 block">
            QA-8 (CMM Inspection)
          </span>
        </div>

        <div className="rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20 p-5 shadow-sm">
          <span className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
            {t("dashboard.kpi.expiringSoon")}
          </span>
          <p className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 mt-2">5</p>
          <span className="text-[11px] text-blue-600/80 dark:text-blue-400/80 mt-1 block">
            Expiring within 30 days
          </span>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {t("dashboard.kpi.overdueCerts")}
          </span>
          <p className="text-3xl font-extrabold text-red-600 dark:text-red-400 mt-2">1</p>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Past expiration (Suresh Patil)
          </span>
        </div>
      </div>
    </div>
  );
}
