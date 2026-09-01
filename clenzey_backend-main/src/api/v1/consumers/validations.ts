import type { RequestHandler } from "express";

import z from "zod";

import { RequestValidationError } from "../../../errors/appErrors.ts";
import { formattedErrorDetails } from "../../../utilities/commonUtils.ts";

const firebaseAuthDto = z.object({
  idToken: z.string().min(1),
  referralCode: z.string().trim().min(1).max(32).optional(),
});

export const firebaseAuthRequest: RequestHandler = (req, _res, next) => {
  const result = firebaseAuthDto.safeParse(req.body);

  if (result.error) {
    throw new RequestValidationError(
      formattedErrorDetails(result.error.issues),
    );
  }

  next();
};

const updateProfileDto = z
  .object({
    fullName: z.string().min(1).max(100).optional(),
    profileImage: z.string().url().nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one profile field is required.",
  });

export const updateProfileRequest: RequestHandler = (req, _res, next) => {
  const result = updateProfileDto.safeParse(req.body);
  if (result.error) {
    throw new RequestValidationError(formattedErrorDetails(result.error.issues));
  }
  next();
};

const refreshTokenDto = z.object({
  refreshToken: z.string().min(1).optional(),
});

export const refreshTokenRequest: RequestHandler = (req, _res, next) => {
  const result = refreshTokenDto.safeParse(req.body ?? {});
  if (result.error) {
    throw new RequestValidationError(
      formattedErrorDetails(result.error.issues),
    );
  }
  next();
};
