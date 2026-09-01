import type { RequestHandler } from "express";

import z from "zod";

import { RequestValidationError } from "../../../errors/appErrors.ts";
import { formattedErrorDetails } from "../../../utilities/commonUtils.ts";

const runZod = <T>(schema: z.ZodType<T>, data: unknown): T => {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new RequestValidationError(
      formattedErrorDetails(result.error.issues),
    );
  }
  return result.data;
};

const authLoginDto = z
  .object({
    username: z.string().min(1, "Username is required"),
    password: z.string().min(1, "Password is required"),
  })
  .required();

export const authLoginRequest: RequestHandler = (req, _res, next) => {
  runZod(authLoginDto, req.body);
  next();
};


// ── Analytics / KPI Validations ─────────────────────────────────────────────

const dateRangeDto = z.object({
  dateFrom: z.string().refine((v) => !isNaN(Date.parse(v)), "Invalid dateFrom"),
  dateTo: z.string().refine((v) => !isNaN(Date.parse(v)), "Invalid dateTo"),
});

export const dateRangeRequest: RequestHandler = (req, _res, next) => {
  runZod(dateRangeDto, req.query);
  next();
};

const exportBookingsDto = z.object({
  dateFrom: z
    .string()
    .refine((v) => !isNaN(Date.parse(v)), "Invalid dateFrom")
    .optional(),
  dateTo: z
    .string()
    .refine((v) => !isNaN(Date.parse(v)), "Invalid dateTo")
    .optional(),
  status: z.string().optional(),
  serviceType: z.string().optional(),
});

export const exportBookingsRequest: RequestHandler = (req, _res, next) => {
  runZod(exportBookingsDto, req.query);
  next();
};
