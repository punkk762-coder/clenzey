"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAdminPermissions } from "@/hooks/useAdminPermissions";

const FINANCE_PREFIXES = ["/payments", "/payroll", "/pricing-settings"];

export function FinanceRouteGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { canFinance, role } = useAdminPermissions();

  const isFinanceRoute = FINANCE_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix),
  );

  useEffect(() => {
    if (isFinanceRoute && role && !canFinance) {
      router.replace("/overview");
    }
  }, [canFinance, isFinanceRoute, role, router]);

  if (isFinanceRoute && role && !canFinance) {
    return null;
  }

  return children;
}
