"use client";

import type { ReactNode } from "react";

import { AuthGuard } from "@/components/layout/AuthGuard";
import { FinanceRouteGuard } from "@/components/layout/FinanceRouteGuard";
import { SidebarContent } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <FinanceRouteGuard>
      <div className="drawer lg:drawer-open">
        <input id="nav-drawer" type="checkbox" className="drawer-toggle" />
        <div className="drawer-content flex min-h-screen flex-col bg-base-200">
          <Topbar />
          <main className="flex-1 overflow-y-auto px-4 py-8 pb-16 lg:px-10 lg:py-10">
            <div className="mx-auto w-full max-w-[1320px] animate-fade-in">{children}</div>
          </main>
        </div>
        <div className="drawer-side z-40 w-auto max-w-[13.5rem]">
          <label htmlFor="nav-drawer" className="drawer-overlay lg:hidden" aria-label="Close navigation" />
          <SidebarContent
            onNavigate={() => {
              const input = document.getElementById("nav-drawer") as HTMLInputElement | null;
              if (input) input.checked = false;
            }}
          />
        </div>
      </div>
      </FinanceRouteGuard>
    </AuthGuard>
  );
}
