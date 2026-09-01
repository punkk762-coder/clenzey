import type { RequestHandler } from "express";

import z from "zod";

import { RequestValidationError } from "../../../errors/appErrors.ts";
import { formattedErrorDetails } from "../../../utilities/commonUtils.ts";

const applyReferralDto = z.object({
  referralCode: z
    .string({ error: "Referral code is required" })
    .trim()
    .min(1, "Referral code is required")
    .max(32, "Referral code is too long"),
});

export const applyReferralRequest: RequestHandler = (req, _res, next) => {
  const result = applyReferralDto.safeParse(req.body);
  if (result.error) {
    throw new RequestValidationError(
      formattedErrorDetails(result.error.issues),
    );
  }
  req.body = result.data;
  next();
};
