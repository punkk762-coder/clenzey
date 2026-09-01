"use client";

import { Menu } from "lucide-react";

import { SidebarContent } from "@/components/layout/Sidebar";

export function MobileSidebar() {
  return (
    <label
      htmlFor="nav-drawer"
      className="btn btn-ghost btn-square lg:hidden"
      aria-label="Open navigation menu"
    >
      <Menu className="h-5 w-5" strokeWidth={1.5} />
    </label>
  );
}

export function MobileDrawerSide({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="drawer-side z-40 lg:hidden">
      <label htmlFor="nav-drawer" className="drawer-overlay" aria-label="Close navigation" />
      <SidebarContent onNavigate={onNavigate} />
    </div>
  );
}
