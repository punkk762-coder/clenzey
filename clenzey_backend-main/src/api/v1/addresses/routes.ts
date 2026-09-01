import express, { type Router } from "express";

import { requireAuth } from "../../../middlewares/authMiddleware.ts";
import * as addressesController from "./controllers.ts";
import * as addressesValidation from "./validations.ts";

const addressesRoutes: Router = express.Router();

/**
 * @openapi
 * /addresses:
 *   get:
 *     tags:
 *       - addresses
 *     summary: List my saved addresses
 *     description: Default address comes first, then most recently updated.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of addresses
 *       401:
 *         description: Unauthorized
 */
addressesRoutes.get(
  "/",
  [requireAuth(["CONSUMER"])],
  addressesController.listAddresses,
);

/**
 * @openapi
 * /addresses:
 *   post:
 *     tags:
 *       - addresses
 *     summary: Add a new saved address
 *     description: >
 *       Creates a new address. Coordinates are used to resolve a serviceable
 *       zone — if the point lies inside an `ACTIVE` zone polygon, the address
 *       is marked `isServiceable: true` and linked to that zone. The first
 *       saved address is automatically set as the default. Duplicates
 *       (same `placeId` or within 25 m of an existing pin) are rejected.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [label, line1, city, state, pincode]
 *             properties:
 *               label: { type: string, example: "Home" }
 *               addressType: { type: string, enum: [HOME, WORK, OTHER] }
 *               line1: { type: string }
 *               line2: { type: string }
 *               landmark: { type: string }
 *               city: { type: string }
 *               state: { type: string }
 *               country: { type: string }
 *               pincode: { type: string, example: "560038" }
 *               latitude: { type: number, format: float, example: 12.9716 }
 *               longitude: { type: number, format: float, example: 77.5946 }
 *               placeId: { type: string }
 *               accessNotes: { type: string }
 *               recipientName: { type: string }
 *               recipientPhone: { type: string, example: "+919876543210" }
 *               setAsDefault: { type: boolean }
 *     responses:
 *       201:
 *         description: Address created
 *       400:
 *         description: Duplicate / limit exceeded
 *       401:
 *         description: Unauthorized
 *       422:
 *         description: Validation error
 */
addressesRoutes.post(
  "/",
  [requireAuth(["CONSUMER"]), addressesValidation.createAddressRequest],
  addressesController.createAddress,
);

/**
 * @openapi
 * /addresses/default:
 *   get:
 *     tags:
 *       - addresses
 *     summary: Get my current default address
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Default address (or null)
 *       401:
 *         description: Unauthorized
 */
addressesRoutes.get(
  "/default",
  [requireAuth(["CONSUMER"])],
  addressesController.getDefaultAddress,
);

/**
 * @openapi
 * /addresses/{addressId}:
 *   get:
 *     tags:
 *       - addresses
 *     summary: Get a saved address by id
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: addressId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Address
 *       404:
 *         description: Not found
 */
addressesRoutes.get(
  "/:addressId",
  [requireAuth(["CONSUMER"])],
  addressesController.getAddress,
);

/**
 * @openapi
 * /addresses/{addressId}:
 *   patch:
 *     tags:
 *       - addresses
 *     summary: Update a saved address
 *     description: >
 *       Updates any address fields. If coordinates change, the serviceability
 *       and zone link are re-resolved. Pass `setAsDefault: true` to make this
 *       address the new default.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: addressId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Address updated
 *       404:
 *         description: Not found
 *       422:
 *         description: Validation error
 */
addressesRoutes.patch(
  "/:addressId",
  [requireAuth(["CONSUMER"]), addressesValidation.updateAddressRequest],
  addressesController.updateAddress,
);

/**
 * @openapi
 * /addresses/{addressId}:
 *   delete:
 *     tags:
 *       - addresses
 *     summary: Delete a saved address (soft)
 *     description: >
 *       Soft-deletes the address. If it was the default, the most recently
 *       updated remaining address (if any) is promoted to default.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: addressId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Address deleted
 *       404:
 *         description: Not found
 */
addressesRoutes.delete(
  "/:addressId",
  [requireAuth(["CONSUMER"])],
  addressesController.deleteAddress,
);

/**
 * @openapi
 * /addresses/{addressId}/default:
 *   post:
 *     tags:
 *       - addresses
 *     summary: Mark an address as my default
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: addressId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Updated default address
 *       404:
 *         description: Not found
 */
addressesRoutes.post(
  "/:addressId/default",
  [requireAuth(["CONSUMER"])],
  addressesController.setDefaultAddress,
);

export default addressesRoutes;
