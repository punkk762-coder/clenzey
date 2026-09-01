"use client";

import { useAuth } from "@/lib/auth/context";
import {
  canAccessNavItem,
  canPerformFinanceMutation,
  canPerformOperationsMutation,
  canPerformSuperAdminMutation,
} from "@/lib/auth/roles";
import type { AdminRole } from "@/types";

export function useAdminPermissions() {
  const { user } = useAuth();
  const role = user?.role as AdminRole | undefined;

  return {
    role,
    canAccessNavItem: (href: string) => canAccessNavItem(role, href),
    canOperate: canPerformOperationsMutation(role),
    canFinance: canPerformFinanceMutation(role),
    canSuperAdmin: canPerformSuperAdminMutation(role),
  };
}
