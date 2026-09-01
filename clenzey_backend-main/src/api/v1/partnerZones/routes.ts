import express, { type Router } from "express";

import { requireAuth } from "../../../middlewares/authMiddleware.ts";
import { requireOperationsAdmin } from "../../../middlewares/requireAdminRoleMiddleware.ts";
import * as partnerZonesController from "./controllers.ts";
import * as partnerZonesValidation from "./validations.ts";

const adminPartnerZonesRoutes: Router = express.Router();

adminPartnerZonesRoutes.post(
  "/partners/:id/zones",
  [requireAuth(["ADMIN"]), requireOperationsAdmin, partnerZonesValidation.assignZonesRequest],
  partnerZonesController.assignZones,
);

adminPartnerZonesRoutes.get(
  "/partners/:id/zones",
  [requireAuth(["ADMIN"]), requireOperationsAdmin, partnerZonesValidation.getPartnerZonesRequest],
  partnerZonesController.getPartnerZones,
);

adminPartnerZonesRoutes.delete(
  "/partners/:id/zones/:zoneId",
  [requireAuth(["ADMIN"]), requireOperationsAdmin, partnerZonesValidation.removeZoneRequest],
  partnerZonesController.removeZone,
);

adminPartnerZonesRoutes.patch(
  "/partners/:id/zones/:zoneId/primary",
  [requireAuth(["ADMIN"]), requireOperationsAdmin, partnerZonesValidation.setPrimaryZoneRequest],
  partnerZonesController.setPrimaryZone,
);

adminPartnerZonesRoutes.patch(
  "/partners/:id/base-location",
  [requireAuth(["ADMIN"]), requireOperationsAdmin, partnerZonesValidation.updateBaseLocationRequest],
  partnerZonesController.updateBaseLocation,
);

const partnerPartnerZonesRoutes: Router = express.Router();

/**
 * @openapi
 * /partners/zones:
 *   get:
 *     tags:
 *       - partner-zones
 *     summary: View my assigned service zones
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of zones assigned to the authenticated partner
 */
partnerPartnerZonesRoutes.get(
  "/zones",
  [requireAuth(["PARTNER"])],
  partnerZonesController.getMyPartnerZones,
);

export { adminPartnerZonesRoutes, partnerPartnerZonesRoutes };
