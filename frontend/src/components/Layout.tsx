import { NavLink, Outlet } from "react-router-dom";
import { clsx } from "clsx";

const links = [
  ["/", "Floor"],
  ["/grid", "Skill grid"],
  ["/assign", "Assign"],
  ["/simulator", "What-if"],
  ["/workload", "Workload"],
  ["/training", "Training"],
  ["/history", "History"],
  ["/reports", "Reports"],
  ["/admin", "Admin"],
];

export function Layout() {
  return (
    <div className="min-h-screen">
      <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:bg-white focus:px-3 focus:py-2">
        Skip to content
      </a>
      <header className="no-print border-b border-stone-300 bg-white">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-md bg-accent text-sm font-semibold text-white">SM</span>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Shop floor</p>
              <p className="text-base font-semibold">Skill matrix</p>
            </div>
          </div>
          <nav className="flex flex-1 flex-wrap gap-1">
            {links.map(([to, label]) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  clsx(
                    "inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium",
                    isActive ? "bg-stone-900 text-white" : "text-stone-700 hover:bg-stone-100",
                  )
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main id="content" className="mx-auto max-w-[1400px] px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}

export function Placeholder({ title, note }: { title: string; note: string }) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-6 shadow-card">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-2 max-w-2xl text-stone-600">{note}</p>
    </section>
  );
}
