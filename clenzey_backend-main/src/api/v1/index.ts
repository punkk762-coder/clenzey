import express, { type Router } from "express";

import { envConfig } from "../../configs/environmentConfig.ts";
import { swaggerSpec, swaggerUi } from "../../configs/swaggerConfig.ts";
import * as healthController from "./health/controllers.ts";
import addressesRoutes from "./addresses/routes.ts";
import adminRoutes from "./admin/routes.ts";
import bookingsRoutes from "./bookings/routes.ts";
import maskedCallRoutes from "./bookings/maskedCallRoutes.ts";
import consumerRoutes from "./consumers/routes.ts";
import { adminPayoutsRoutes, partnerEarningsRoutes } from "./earnings/routes.ts";
import {
  adminPayrollRoutes,
  internalPayrollRoutes,
  partnerPayrollRoutes,
} from "./payroll/routes.ts";
import couponsRoutes from "./coupons/routes.ts";
import contactRoutes from "./contact/routes.ts";
import disputesRoutes, { disputesAdminRoutes } from "./disputes/routes.ts";
import deviceTokenRoutes from "./device-tokens/routes.ts";
import etaRoutes from "./eta/routes.ts";
import kycRoutes, { kycAdminRoutes } from "./kyc/routes.ts";
import notificationsRoutes from "./notifications/routes.ts";
import locationRoutes from "./location/routes.ts";
import adminPlatformPricingRoutes from "./platformPricing/routes.ts";
import refundsRoutes from "./refunds/routes.ts";
import referralsRoutes from "./referrals/routes.ts";
import photosRoutes from "./photos/routes.ts";
import uploadsRoutes from "./uploads/routes.ts";
import dispatchAdminRoutes from "./dispatch/routes.ts";
import partnerRoutes from "./partners/routes.ts";
import paymentsRoutes from "./payments/routes.ts";
import reviewsRoutes, { adminReviewsRoutes } from "./reviews/routes.ts";
import { quotationsRoutes, servicesRoutes } from "./services/routes.ts";
import { adminPartnerZonesRoutes, partnerPartnerZonesRoutes } from "./partnerZones/routes.ts";
import { adminSkillsRoutes, partnerSkillsRoutes } from "./skills/routes.ts";
import slotsRoutes from "./slots/routes.ts";
import zonesRoutes from "./zones/routes.ts";
import zonePricingRoutes from "./zones/pricingRoutes.ts";

const v1: Router = express.Router();

if (envConfig.ENABLE_SWAGGER) {
  v1.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

v1.get("/health/live", healthController.healthLive);
v1.get("/health/ready", healthController.healthReady);
v1.get("/health", healthController.healthLive);

v1.use("/consumers", consumerRoutes);
v1.use("/partners", partnerRoutes);
v1.use("/admin", adminRoutes);
v1.use("/admin", dispatchAdminRoutes);
v1.use("/services", servicesRoutes);
v1.use("/quotations", quotationsRoutes);
v1.use("/bookings", bookingsRoutes);
v1.use("/coupons", couponsRoutes);
v1.use("/referrals", referralsRoutes);
v1.use("/disputes", disputesRoutes);
v1.use("/slots", slotsRoutes);
v1.use("/payments", paymentsRoutes);
v1.use("/addresses", addressesRoutes);
v1.use("/location", locationRoutes);
v1.use("/admin/zones", zonesRoutes);
v1.use("/admin/zones/:zoneId/price-overrides", zonePricingRoutes);
v1.use(deviceTokenRoutes);
v1.use("/admin", adminPayrollRoutes);
v1.use("/admin", adminPlatformPricingRoutes);
v1.use("/admin", adminSkillsRoutes);
v1.use("/admin", adminPartnerZonesRoutes);
v1.use("/partners", partnerPartnerZonesRoutes);
v1.use("/partners", partnerSkillsRoutes);
v1.use("/partners", kycRoutes);
v1.use("/admin", kycAdminRoutes);
v1.use("/admin", disputesAdminRoutes);
v1.use("/bookings", maskedCallRoutes);
v1.use("/bookings", contactRoutes);
v1.use("/bookings", etaRoutes);
v1.use("/bookings", photosRoutes);
v1.use("/uploads", uploadsRoutes);
v1.use("/reviews", reviewsRoutes);
v1.use("/admin", adminReviewsRoutes);
v1.use("/admin/refunds", refundsRoutes);
v1.use("/partners", partnerEarningsRoutes);
v1.use("/partners", partnerPayrollRoutes);
v1.use("/admin", adminPayoutsRoutes);
v1.use("/internal", internalPayrollRoutes);
v1.use("/notifications", notificationsRoutes);

export default v1;
