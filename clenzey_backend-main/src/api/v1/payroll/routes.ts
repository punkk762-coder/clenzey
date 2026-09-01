import express, { type Router } from "express";

import { requireAuth } from "../../../middlewares/authMiddleware.ts";
import { requireFinanceAdmin } from "../../../middlewares/requireAdminRoleMiddleware.ts";
import { requireApprovedPartner } from "../../../middlewares/requireApprovedPartnerMiddleware.ts";
import { requireInternalApiKey } from "../../../middlewares/requireInternalApiKeyMiddleware.ts";
import * as payrollController from "./controllers.ts";
import * as payrollValidation from "./validations.ts";

export const adminPayrollRoutes: Router = express.Router();

adminPayrollRoutes.patch(
  "/partners/:id/salary",
  [
    requireAuth(["ADMIN"]),
    requireFinanceAdmin,
    payrollValidation.validatePartnerIdParam,
    payrollValidation.setSalaryRequest,
  ],
  payrollController.setPartnerSalary,
);

adminPayrollRoutes.get(
  "/partners/:id/salary",
  [requireAuth(["ADMIN"]), requireFinanceAdmin, payrollValidation.validatePartnerIdParam],
  payrollController.getPartnerSalary,
);

adminPayrollRoutes.put(
  "/partners/:id/attendance/:period",
  [
    requireAuth(["ADMIN"]),
    requireFinanceAdmin,
    payrollValidation.validatePartnerIdParam,
    payrollValidation.validatePayrollPeriodParam,
    payrollValidation.setAttendanceRequest,
  ],
  payrollController.setPartnerAttendance,
);

adminPayrollRoutes.get(
  "/payroll/runs",
  [requireAuth(["ADMIN"]), requireFinanceAdmin, payrollValidation.listPayrollRunsRequest],
  payrollController.listPayrollRuns,
);

adminPayrollRoutes.post(
  "/payroll/runs/:period/reprocess",
  [
    requireAuth(["ADMIN"]),
    requireFinanceAdmin,
    payrollValidation.validatePayrollPeriodParam,
    payrollValidation.reprocessPayrollRequest,
  ],
  payrollController.reprocessPayrollRun,
);

adminPayrollRoutes.post(
  "/incentive-configs",
  [requireAuth(["ADMIN"]), requireFinanceAdmin, payrollValidation.createIncentiveConfigRequest],
  payrollController.createIncentiveConfig,
);

adminPayrollRoutes.patch(
  "/incentive-configs/:id",
  [
    requireAuth(["ADMIN"]),
    requireFinanceAdmin,
    payrollValidation.validateIncentiveConfigIdParam,
    payrollValidation.updateIncentiveConfigRequest,
  ],
  payrollController.updateIncentiveConfig,
);

adminPayrollRoutes.get(
  "/incentive-configs",
  [requireAuth(["ADMIN"]), requireFinanceAdmin, payrollValidation.listIncentiveConfigsQuery],
  payrollController.listIncentiveConfigs,
);

adminPayrollRoutes.get(
  "/incentive-configs/total",
  [requireAuth(["ADMIN"]), requireFinanceAdmin, payrollValidation.totalIncentivesQueryValidator],
  payrollController.getTotalIncentives,
);

export const partnerPayrollRoutes: Router = express.Router();

partnerPayrollRoutes.get(
  "/earnings/payroll/:period",
  [
    requireAuth(["PARTNER"]),
    requireApprovedPartner,
    payrollValidation.validatePayrollPeriodParam,
  ],
  payrollController.getPartnerPayrollBreakdown,
);

export const internalPayrollRoutes: Router = express.Router();

internalPayrollRoutes.put(
  "/partners/:id/attendance/:period",
  [
    requireInternalApiKey,
    payrollValidation.validatePartnerIdParam,
    payrollValidation.validatePayrollPeriodParam,
    payrollValidation.setAttendanceRequest,
  ],
  payrollController.setInternalPartnerAttendance,
);

export default adminPayrollRoutes;
