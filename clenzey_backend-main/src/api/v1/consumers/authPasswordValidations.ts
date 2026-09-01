import type { RequestHandler } from "express";

import { isValidPhoneNumber, parsePhoneNumber } from "libphonenumber-js/mobile";
import z from "zod";

import { RequestValidationError } from "../../../errors/appErrors.ts";
import { formattedErrorDetails } from "../../../utilities/commonUtils.ts";

const indianPhoneValidator = (value: unknown): boolean => {
  if (typeof value !== "string") return false;
  try {
    const phone = parsePhoneNumber(value);
    return (
      phone.country === "IN" &&
      phone.countryCallingCode === "91" &&
      isValidPhoneNumber(value) &&
      phone.getType() === "MOBILE"
    );
  } catch {
    return false;
  }
};

export const consumerSignUpSchema = z.object({
  email: z
    .string({ error: "Email is required" })
    .email("Invalid email format")
    .max(254, "Email must not exceed 254 characters"),
  password: z
    .string({ error: "Password is required" })
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must not exceed 72 characters"),
  phone: z
    .string({ error: "Phone is required" })
    .refine(indianPhoneValidator, "Invalid phone number format"),
  referralCode: z.string().trim().min(1).max(32).optional(),
});

export const signInSchema = z.object({
  identifier: z
    .string({ error: "Identifier is required" })
    .min(1, "Identifier is required"),
  password: z
    .string({ error: "Password is required" })
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must not exceed 128 characters"),
});

export const consumerSignUpValidation: RequestHandler = (req, _res, next) => {
  const result = consumerSignUpSchema.safeParse(req.body);
  if (!result.success) {
    throw new RequestValidationError(
      formattedErrorDetails(result.error.issues),
    );
  }
  next();
};

export const signInValidation: RequestHandler = (req, _res, next) => {
  const result = signInSchema.safeParse(req.body);
  if (!result.success) {
    throw new RequestValidationError(
      formattedErrorDetails(result.error.issues),
    );
  }
  next();
};
