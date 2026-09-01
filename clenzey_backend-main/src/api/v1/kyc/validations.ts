import type { RequestHandler } from "express";

import z from "zod";

import { BadRequestError, RequestValidationError } from "../../../errors/appErrors.ts";
import { formattedErrorDetails } from "../../../utilities/commonUtils.ts";
import { isAllowedUploadUrl } from "../../../validations/uploadUrlValidator.ts";

// ── IFSC Regex ───────────────────────────────────────────────────────────────

const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

// ── Schemas ──────────────────────────────────────────────────────────────────

const bankDetailsBodySchema = z.object({
  accountHolderName: z.string().min(1).max(200),
  accountNumber: z.string().min(5).max(30),
  bankName: z.string().min(1).max(200),
  ifscCode: z.string().regex(IFSC_REGEX, "Invalid IFSC code. Must be 4 uppercase letters followed by 0 and 6 alphanumeric characters."),
});

const uploadKycDocBodySchema = z.object({
  documentType: z.enum(["AADHAAR", "PAN", "DRIVING_LICENSE", "BUSINESS_PROOF", "SELFIE"]),
  fileUrl: z.string().url(),
});

const approveRejectBodySchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  rejectionReason: z.string().optional(),
});

// ── Helpers ──────────────────────────────────────────────────────────────────

const runZod = <T>(schema: z.ZodType<T>, data: unknown): T => {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new RequestValidationError(formattedErrorDetails(result.error.issues));
  }
  return result.data;
};

// ── Validation Middleware ────────────────────────────────────────────────────

export const bankDetailsRequest: RequestHandler = (req, _res, next) => {
  req.body = runZod(bankDetailsBodySchema, req.body);
  next();
};

export const uploadKycDocRequest: RequestHandler = (req, _res, next) => {
  const body = runZod(uploadKycDocBodySchema, req.body);
  if (!isAllowedUploadUrl(body.fileUrl)) {
    throw new BadRequestError("File URL origin is not allowed.");
  }
  req.body = body;
  next();
};

export const approveRejectRequest: RequestHandler = (req, _res, next) => {
  req.body = runZod(approveRejectBodySchema, req.body);
  next();
};
