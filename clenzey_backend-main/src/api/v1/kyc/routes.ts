import express, { type Router } from "express";

import { requireAuth } from "../../../middlewares/authMiddleware.ts";
import * as kycController from "./controllers.ts";
import * as kycValidation from "./validations.ts";

const kycRoutes: Router = express.Router();

// ── Partner: Bank Details ────────────────────────────────────────────────────

/**
 * @openapi
 * /partners/bank-details:
 *   post:
 *     tags:
 *       - partner-kyc
 *     summary: Submit bank account details
 *     description: >
 *       Creates or updates the partner's bank details. IFSC code is validated
 *       against the format: 4 uppercase letters + 0 + 6 alphanumeric characters.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [accountHolderName, accountNumber, ifscCode, bankName]
 *             properties:
 *               accountHolderName: { type: string, example: "Amit Sharma" }
 *               accountNumber: { type: string, example: "1234567890123456" }
 *               ifscCode: { type: string, example: "SBIN0001234" }
 *               bankName: { type: string, example: "State Bank of India" }
 *     responses:
 *       201:
 *         description: Bank details submitted
 *       400:
 *         description: Invalid IFSC code
 *       401:
 *         description: Unauthorized
 *       422:
 *         description: Validation error
 */
kycRoutes.post(
  "/bank-details",
  [requireAuth(["PARTNER"]), kycValidation.bankDetailsRequest],
  kycController.submitBankDetails,
);

/**
 * @openapi
 * /partners/bank-details:
 *   get:
 *     tags:
 *       - partner-kyc
 *     summary: View own bank details
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Bank details (or null if not submitted)
 *       401:
 *         description: Unauthorized
 */
kycRoutes.get(
  "/bank-details",
  [requireAuth(["PARTNER"])],
  kycController.getBankDetails,
);

// ── Partner: KYC Documents ───────────────────────────────────────────────────

/**
 * @openapi
 * /partners/kyc/documents:
 *   post:
 *     tags:
 *       - partner-kyc
 *     summary: Upload a KYC document
 *     description: >
 *       Uploads a KYC document reference. Only one document per type is allowed.
 *       If a document of the same type already exists and is PENDING or REJECTED,
 *       it will be updated. If the existing document is APPROVED, a 409 is returned.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [documentType, fileUrl]
 *             properties:
 *               documentType:
 *                 type: string
 *                 enum: [AADHAAR, PAN, DRIVING_LICENSE, BUSINESS_PROOF, SELFIE]
 *               fileUrl:
 *                 type: string
 *                 format: url
 *                 example: "https://cdn.example.com/docs/aadhaar_front.jpg"
 *     responses:
 *       201:
 *         description: Document uploaded
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Document type already approved
 *       422:
 *         description: Validation error
 */
kycRoutes.post(
  "/kyc/documents",
  [requireAuth(["PARTNER"]), kycValidation.uploadKycDocRequest],
  kycController.uploadKycDocument,
);

/**
 * @openapi
 * /partners/kyc/documents:
 *   get:
 *     tags:
 *       - partner-kyc
 *     summary: List own KYC documents
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of KYC documents
 *       401:
 *         description: Unauthorized
 */
kycRoutes.get(
  "/kyc/documents",
  [requireAuth(["PARTNER"])],
  kycController.listKycDocuments,
);

export default kycRoutes;

// ── Admin Routes (exported separately) ───────────────────────────────────────

export const kycAdminRoutes: Router = express.Router();

/**
 * @openapi
 * /admin/partners/{id}/kyc:
 *   get:
 *     tags:
 *       - admin-kyc
 *     summary: View a partner's KYC details and bank information
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Partner KYC details and bank info
 *       401:
 *         description: Unauthorized
 */
kycAdminRoutes.get(
  "/partners/:id/kyc",
  [requireAuth(["ADMIN"])],
  kycController.getPartnerKyc,
);

/**
 * @openapi
 * /admin/kyc/documents/{id}:
 *   patch:
 *     tags:
 *       - admin-kyc
 *     summary: Approve or reject a KYC document
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [action]
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [APPROVE, REJECT]
 *               rejectionReason:
 *                 type: string
 *                 description: Required when action is REJECT
 *     responses:
 *       200:
 *         description: Document status updated
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Document not found
 */
kycAdminRoutes.patch(
  "/kyc/documents/:id",
  [requireAuth(["ADMIN"]), kycValidation.approveRejectRequest],
  kycController.approveRejectDocument,
);
