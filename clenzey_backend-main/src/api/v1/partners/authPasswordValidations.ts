import type { RequestHandler } from "express";

import z from "zod";

import { RequestValidationError } from "../../../errors/appErrors.ts";
import { formattedErrorDetails } from "../../../utilities/commonUtils.ts";
import { phoneNumberValidator } from "../../../validations/customValidator.ts";

const runZod = <T>(schema: z.ZodType<T>, data: unknown): T => {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new RequestValidationError(
      formattedErrorDetails(result.error.issues),
    );
  }
  return result.data;
};

// ── Partner Sign-Up Schema ──────────────────────────────────────────────────

export const partnerSignUpSchema = z.object({
  email: z
    .string()
    .email("Invalid email format")
    .max(254, "Email must not exceed 254 characters"),
  fullName: z
    .string()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name must not exceed 100 characters"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must not exceed 72 characters"),
  phone: z.custom<string>(phoneNumberValidator, "Invalid phone number format"),
});

// ── Sign-In Schema ──────────────────────────────────────────────────────────

export const signInSchema = z.object({
  identifier: z
    .string()
    .min(1, "Identifier must not be empty"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must not exceed 128 characters"),
});

// ── Express Middleware Validators ───────────────────────────────────────────

export const partnerSignUpValidation: RequestHandler = (req, _res, next) => {
  runZod(partnerSignUpSchema, req.body);
  next();
};

export const signInValidation: RequestHandler = (req, _res, next) => {
  runZod(signInSchema, req.body);
  next();
};
