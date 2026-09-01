"use client";

import { usePathname } from "next/navigation";
import { Loader2, LogOut } from "lucide-react";
import { useState } from "react";

import { Logo } from "@/components/layout/Logo";
import { NavLink } from "@/components/layout/NavLink";
import { NAV_GROUPS, NAV_ITEMS } from "@/components/layout/nav-config";
import { canAccessNavItem } from "@/lib/auth/roles";
import { useSocketStatus } from "@/hooks/useSocketStatus";
import { useAuth } from "@/lib/auth/context";
import { cn } from "@/lib/utils/cn";

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const isConnected = useSocketStatus();
  const auth = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await auth.logout();
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <aside className="admin-sidebar flex h-full min-h-full w-[13.5rem] shrink-0 flex-col border-r">
      <div className="border-b border-white/10 px-4 py-3.5">
        <Logo compact className="brightness-0 invert" />
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-4">
        <div className="space-y-5">
          {NAV_GROUPS.map((group) => {
            const items = NAV_ITEMS.filter(
              (n) =>
                n.group === group &&
                canAccessNavItem(auth.user?.role, n.href),
            );
            if (items.length === 0) return null;

            return (
              <div key={group}>
                <p className="admin-nav-group mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.14em]">
                  {group}
                </p>
                <ul className="space-y-0.5">
                  {items.map((item) => {
                    const Icon = item.icon;
                    const active =
                      pathname === item.href ||
                      pathname.startsWith(`${item.href}/`);

                    return (
                      <li key={item.href}>
                        <NavLink
                          href={item.href}
                          onClick={onNavigate}
                          data-active={active}
                          className={cn(
                            "admin-nav-link flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium leading-none transition-colors",
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                          <span className="truncate">{item.label}</span>
                        </NavLink>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </nav>

      <div className="mt-auto space-y-2 border-t border-white/10 px-2 py-3">
        <div className="flex items-center gap-2 rounded-lg bg-white/5 px-2.5 py-2">
          <span
            className={cn(
              "status status-xs shrink-0",
              isConnected ? "status-success" : "status-error",
            )}
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium leading-tight text-white/90">
              Live status
            </p>
            <p className="truncate text-[10px] leading-tight text-white/50">
              {isConnected ? "Socket connected" : "Reconnecting…"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-red-300 transition-colors hover:bg-red-500/10 disabled:opacity-60"
        >
          {isSigningOut ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          ) : (
            <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          )}
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden h-full lg:block">
      <SidebarContent />
    </aside>
  );
}
