import type { NextFunction, Request, Response } from "express";

import { adminRoleEnum } from "../db/schema/enums.ts";
import { ForbiddenError, UnauthorizedError } from "../errors/appErrors.ts";

type AdminRole = (typeof adminRoleEnum.enumValues)[number];

const ADMIN_ROLES = new Set<string>(adminRoleEnum.enumValues);

export const requireAdminRole = (...allowedRoles: AdminRole[]) => {
  const allowed = new Set<string>(allowedRoles);

  return (req: Request, _res: Response, next: NextFunction) => {
    if (req.user?.userType !== "ADMIN") {
      return next(new UnauthorizedError("Access denied."));
    }

    const role = req.user.role;
    if (!role || !ADMIN_ROLES.has(role) || !allowed.has(role)) {
      return next(new ForbiddenError("Insufficient permissions for this action."));
    }

    return next();
  };
};

/** Finance-sensitive admin actions. */
export const requireFinanceAdmin = requireAdminRole("FINANCE", "SUPER_ADMIN");

/** Operational network management actions. */
export const requireOperationsAdmin = requireAdminRole(
  "OPERATIONS",
  "SUPER_ADMIN",
);

/** Destructive or high-privilege catalogue actions. */
export const requireSuperAdmin = requireAdminRole("SUPER_ADMIN");
