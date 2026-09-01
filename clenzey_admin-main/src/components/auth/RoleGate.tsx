"use client";

import type { ReactNode } from "react";

import { useAdminPermissions } from "@/hooks/useAdminPermissions";

type Permission = "operate" | "finance" | "superAdmin";

const PERMISSION_CHECK = {
  operate: (perms: ReturnType<typeof useAdminPermissions>) => perms.canOperate,
  finance: (perms: ReturnType<typeof useAdminPermissions>) => perms.canFinance,
  superAdmin: (perms: ReturnType<typeof useAdminPermissions>) => perms.canSuperAdmin,
} as const;

export function RoleGate({
  allow,
  children,
  fallback = null,
}: {
  allow: Permission;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const perms = useAdminPermissions();
  return PERMISSION_CHECK[allow](perms) ? children : fallback;
}
