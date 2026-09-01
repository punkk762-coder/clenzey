import express, { type Router } from "express";

import { requireAuth } from "../../../middlewares/authMiddleware.ts";
import { requireFinanceAdmin } from "../../../middlewares/requireAdminRoleMiddleware.ts";
import * as platformPricingController from "./controllers.ts";
import * as platformPricingValidation from "./validations.ts";

export const adminPlatformPricingRoutes: Router = express.Router();

adminPlatformPricingRoutes.get(
  "/pricing-settings",
  [requireAuth(["ADMIN"]), requireFinanceAdmin],
  platformPricingController.getPlatformPricing,
);

adminPlatformPricingRoutes.put(
  "/pricing-settings",
  [
    requireAuth(["ADMIN"]),
    requireFinanceAdmin,
    platformPricingValidation.updatePlatformPricingRequest,
  ],
  platformPricingController.updatePlatformPricing,
);

adminPlatformPricingRoutes.get(
  "/pricing-settings/history",
  [
    requireAuth(["ADMIN"]),
    requireFinanceAdmin,
    platformPricingValidation.listHistoryRequest,
  ],
  platformPricingController.listPlatformPricingHistory,
);

export default adminPlatformPricingRoutes;
