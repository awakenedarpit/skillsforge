import React from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import { ThemeApplier } from "@quikit/ui";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex h-screen overflow-hidden font-sans"
      style={{ backgroundColor: "rgb(var(--bg))" }}
    >
      <ThemeApplier />
      <AppSidebar />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <AppHeader />
        <main
          className="flex-1 overflow-y-auto"
          style={{
            backgroundColor: "rgb(var(--bg))",
            /* Subtle inner vignette at top for depth */
            backgroundImage: "linear-gradient(180deg, rgb(var(--surface-raised) / 0.4) 0px, transparent 64px)",
          }}
        >
          <div className="p-6 md:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
