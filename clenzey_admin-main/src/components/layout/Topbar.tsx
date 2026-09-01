"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut, Settings, Wifi, WifiOff } from "lucide-react";

import { getActiveNavItem } from "@/components/layout/nav-config";
import { MobileSidebar } from "@/components/layout/MobileSidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { StatusDot } from "@/components/ui/status-dot";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSocketStatus } from "@/hooks/useSocketStatus";
import { useAuth } from "@/lib/auth/context";
import { initials } from "@/lib/utils/format";
import type { AdminRole } from "@/types";

const ROLE_LABEL: Record<AdminRole, string> = {
  OPERATIONS: "Operations",
  SUPPORT: "Support",
  FINANCE: "Finance",
  SUPER_ADMIN: "Super Admin",
};

function formatHeaderDate(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const isConnected = useSocketStatus();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const activeItem = getActiveNavItem(pathname);
  const displayName = auth.user?.username ?? auth.user?.phone ?? "Admin";
  const roleLabel = auth.user?.role ? ROLE_LABEL[auth.user.role] : "Admin";

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await auth.logout();
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-base-300 bg-base-100/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-base-100/85">
      <div className="flex min-h-16 items-center justify-between gap-4 px-4 lg:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <MobileSidebar />

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {activeItem?.label ?? "Dashboard"}
            </p>
            <p className="truncate text-[11px] uppercase tracking-[0.12em] opacity-50">
              {activeItem?.group ?? "Operations"}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <div
            className={`hidden items-center gap-2 rounded-full border px-3 py-1.5 text-xs sm:flex ${
              isConnected
                ? "border-success/30 bg-success/10 text-success"
                : "border-error/30 bg-error/10 text-error"
            }`}
          >
            {isConnected ? (
              <Wifi className="h-3.5 w-3.5" />
            ) : (
              <WifiOff className="h-3.5 w-3.5" />
            )}
            <StatusDot
              variant={isConnected ? "success" : "error"}
              pulse={isConnected}
              className="sm:hidden"
            />
            <span className="font-medium">
              {isConnected ? "Live" : "Offline"}
            </span>
          </div>

          <div className="hidden text-right leading-tight xl:block">
            <p className="text-[11px] uppercase tracking-[0.12em] opacity-50">
              {formatHeaderDate(new Date())}
            </p>
            <p className="text-xs font-medium opacity-70">Operations terminal</p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="btn btn-ghost h-auto min-h-0 gap-2 rounded-full py-1 pl-1 pr-2 sm:pr-3"
              >
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="text-xs font-semibold">
                    {initials(displayName)}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden text-left leading-tight md:block">
                  <div className="max-w-[9rem] truncate text-sm font-medium">
                    {displayName}
                  </div>
                  <Badge variant="muted" size="xs" className="mt-0.5">
                    {roleLabel}
                  </Badge>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel className="space-y-1 font-normal">
                <p className="text-sm font-medium">{displayName}</p>
                <p className="font-mono text-xs opacity-60">
                  {auth.user?.phone ?? "—"}
                </p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/settings")}>
                <Settings className="h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleSignOut}
                className={isSigningOut ? "pointer-events-none opacity-60" : undefined}
              >
                <LogOut className="h-4 w-4" />
                {isSigningOut ? "Signing out…" : "Sign out"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
