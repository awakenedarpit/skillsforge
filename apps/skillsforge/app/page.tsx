import { LanguageSwitcher } from "../components/language-switcher";
import { getT } from "../lib/i18n/getT";

export default function HomePage() {
  const { t } = getT();

  return (
    <div className="min-h-screen p-8 max-w-7xl mx-auto flex flex-col gap-6">
      <header className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {t("common.appName")}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t("dashboard.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
        </div>
      </header>

      <main className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-semibold text-slate-500 uppercase">{t("dashboard.kpi.redCells")}</span>
          <p className="text-3xl font-extrabold text-red-600 mt-2">4</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-semibold text-slate-500 uppercase">{t("dashboard.kpi.spofMachines")}</span>
          <p className="text-3xl font-extrabold text-amber-600 mt-2">1</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-semibold text-slate-500 uppercase">{t("dashboard.kpi.expiringSoon")}</span>
          <p className="text-3xl font-extrabold text-blue-600 mt-2">5</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-semibold text-slate-500 uppercase">{t("dashboard.kpi.overdueCerts")}</span>
          <p className="text-3xl font-extrabold text-red-600 mt-2">1</p>
        </div>
      </main>
    </div>
  );
}
