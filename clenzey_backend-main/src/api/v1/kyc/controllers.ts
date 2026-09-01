import type { RequestHandler } from "express";

import { HttpStatusCode } from "axios";

import { sendResponse, tryCatchUtil } from "../../../utilities/commonUtils.ts";
import * as kycService from "./service.ts";

// ── Partner: Bank Details ────────────────────────────────────────────────────

export const submitBankDetails: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const partnerId = req.user!.sub;
    const bankDetails = await kycService.submitBankDetails({
      ...req.body,
      partnerId,
    });
    return sendResponse(res, {
      data: { bankDetails },
      statusCode: HttpStatusCode.Created,
    });
  },
);

export const getBankDetails: RequestHandler = tryCatchUtil(async (req, res) => {
  const partnerId = req.user!.sub;
  const bankDetails = await kycService.getBankDetails(partnerId);
  return sendResponse(res, { data: { bankDetails } });
});

// ── Partner: KYC Documents ───────────────────────────────────────────────────

export const uploadKycDocument: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const partnerId = req.user!.sub;
    const document = await kycService.uploadKycDocument({
      ...req.body,
      partnerId,
    });
    return sendResponse(res, {
      data: { document },
      statusCode: HttpStatusCode.Created,
    });
  },
);

export const listKycDocuments: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const partnerId = req.user!.sub;
    const documents = await kycService.listKycDocuments(partnerId);
    return sendResponse(res, { data: { documents } });
  },
);

// ── Admin: View Partner KYC ──────────────────────────────────────────────────

export const getPartnerKyc: RequestHandler = tryCatchUtil(async (req, res) => {
  const partnerId = req.params["id"] as string;
  const kyc = await kycService.getPartnerKyc(partnerId);
  return sendResponse(res, { data: kyc });
});

// ── Admin: Approve/Reject Document ───────────────────────────────────────────

export const approveRejectDocument: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const documentId = req.params["id"] as string;
    const adminId = req.user!.sub;
    const { action, rejectionReason } = req.body;

    let document;
    if (action === "APPROVE") {
      document = await kycService.approveDocument(documentId, adminId);
    } else {
      document = await kycService.rejectDocument(
        documentId,
        adminId,
        rejectionReason ?? "",
      );
    }

    return sendResponse(res, { data: { document } });
  },
);
