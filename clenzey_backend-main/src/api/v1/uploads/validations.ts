import type { RequestHandler } from "express";

import z from "zod";

import { RequestValidationError } from "../../../errors/appErrors.ts";
import { formattedErrorDetails } from "../../../utilities/commonUtils.ts";
import {
  ALLOWED_IMAGE_CONTENT_TYPES,
  type UploadPurpose,
} from "../../../services/s3PresignService.ts";

const presignUploadBodySchema = z
  .object({
    bookingId: z.string().uuid().optional(),
    contentType: z.enum(ALLOWED_IMAGE_CONTENT_TYPES),
    purpose: z.enum(["kyc", "booking_photo", "dispute_evidence", "profile"]),
  })
  .superRefine((data, ctx) => {
    if (
      (data.purpose === "booking_photo" || data.purpose === "dispute_evidence") &&
      !data.bookingId
    ) {
      ctx.addIssue({
        code: "custom",
        message: "bookingId is required for this upload purpose.",
        path: ["bookingId"],
      });
    }

    if (
      data.purpose !== "booking_photo" &&
      data.purpose !== "dispute_evidence" &&
      data.bookingId !== undefined
    ) {
      ctx.addIssue({
        code: "custom",
        message:
          "bookingId is only allowed when purpose is booking_photo or dispute_evidence.",
        path: ["bookingId"],
      });
    }
  });

export type PresignUploadBody = z.infer<typeof presignUploadBodySchema>;

const runZod = <T>(schema: z.ZodType<T>, data: unknown): T => {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new RequestValidationError(formattedErrorDetails(result.error.issues));
  }
  return result.data;
};

export const PURPOSE_ALLOWED_ROLES: Record<
  UploadPurpose,
  readonly string[]
> = {
  booking_photo: ["PARTNER"],
  dispute_evidence: ["CONSUMER", "PARTNER"],
  kyc: ["PARTNER"],
  profile: ["ADMIN", "CONSUMER", "PARTNER"],
};

export const validatePresignUploadBody: RequestHandler = (req, _res, next) => {
  req.body = runZod(presignUploadBodySchema, req.body);
  next();
};
