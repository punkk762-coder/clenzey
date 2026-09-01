import type { AdminRole } from "@/types";

const FINANCE_ROUTES = ["/payments", "/payroll", "/pricing-settings"];
const OPERATIONS_MUTATION_ROUTES = [
  "/partners/",
  "/customers/",
  "/bookings/",
  "/dispatch",
];

export function canAccessNavItem(role: AdminRole | undefined, href: string): boolean {
  if (!role) return false;
  if (role === "SUPER_ADMIN") return true;

  if (FINANCE_ROUTES.some((prefix) => href.startsWith(prefix))) {
    return role === "FINANCE";
  }

  return true;
}

export function canPerformOperationsMutation(role: AdminRole | undefined): boolean {
  return role === "SUPER_ADMIN" || role === "OPERATIONS";
}

export function canPerformFinanceMutation(role: AdminRole | undefined): boolean {
  return role === "SUPER_ADMIN" || role === "FINANCE";
}

export function canPerformSuperAdminMutation(role: AdminRole | undefined): boolean {
  return role === "SUPER_ADMIN";
}

export function isRestrictedRoute(pathname: string): boolean {
  return OPERATIONS_MUTATION_ROUTES.some((prefix) => pathname.includes(prefix))
    || FINANCE_ROUTES.some((prefix) => pathname.startsWith(prefix));
}
