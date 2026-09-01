import type { RequestHandler } from "express";

import z from "zod";

import { RequestValidationError } from "../../../errors/appErrors.ts";
import { formattedErrorDetails } from "../../../utilities/commonUtils.ts";

// ── Partner Endpoints ────────────────────────────────────────────────────────

const earningsSummaryQuery = z.object({
  from: z.iso.datetime(),
  to: z.iso.datetime(),
});

const paginationQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

// ── Admin Endpoints ──────────────────────────────────────────────────────────

const initiatePayoutBody = z.object({
  amount: z.number().positive("Payout amount must be greater than zero."),
  breakdown: z
    .object({
      deductions: z.number().min(0).optional(),
      incentives: z.number().min(0).optional(),
      salary: z.number().min(0).optional(),
    })
    .optional(),
  notes: z.string().optional(),
  partnerId: z.string().uuid(),
  periodEnd: z.iso.datetime().optional(),
  periodStart: z.iso.datetime().optional(),
});

const adminListPayoutsQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  partnerId: z.string().uuid().optional(),
  status: z.enum(["PENDING", "PROCESSING", "PAID", "FAILED"]).optional(),
});

const partnerBalanceQuery = z.object({
  partnerId: z.string().uuid(),
});

const updatePayoutStatusBody = z.object({
  status: z.enum(["PROCESSING", "PAID", "FAILED"]),
});

const payoutIdParam = z.object({
  id: z.string().uuid(),
});

// ── Helpers ──────────────────────────────────────────────────────────────────

const runZod = <T>(schema: z.ZodType<T>, data: unknown): T => {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new RequestValidationError(formattedErrorDetails(result.error.issues));
  }
  return result.data;
};

// ── Middleware Exports ────────────────────────────────────────────────────────

export const earningsSummaryRequest: RequestHandler = (req, _res, next) => {
  const query = runZod(earningsSummaryQuery, req.query);
  (req as unknown as { validatedQuery: typeof query }).validatedQuery = query;
  next();
};

export const listEarningsRequest: RequestHandler = (req, _res, next) => {
  const query = runZod(paginationQuery, req.query);
  (req as unknown as { validatedQuery: typeof query }).validatedQuery = query;
  next();
};

export const listPartnerPayoutsRequest: RequestHandler = (req, _res, next) => {
  const query = runZod(paginationQuery, req.query);
  (req as unknown as { validatedQuery: typeof query }).validatedQuery = query;
  next();
};

export const initiatePayoutRequest: RequestHandler = (req, _res, next) => {
  req.body = runZod(initiatePayoutBody, req.body);
  next();
};

export const adminListPayoutsRequest: RequestHandler = (req, _res, next) => {
  const query = runZod(adminListPayoutsQuery, req.query);
  (req as unknown as { validatedQuery: typeof query }).validatedQuery = query;
  next();
};

export const partnerBalanceRequest: RequestHandler = (req, _res, next) => {
  const query = runZod(partnerBalanceQuery, req.query);
  (req as unknown as { validatedQuery: typeof query }).validatedQuery = query;
  next();
};

export const updatePayoutStatusRequest: RequestHandler = (req, _res, next) => {
  req.body = runZod(updatePayoutStatusBody, req.body);
  next();
};

const payrollPeriodParam = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/),
});

export const validatePayrollPeriodParam: RequestHandler = (req, _res, next) => {
  runZod(payrollPeriodParam, req.params);
  next();
};

export const validatePayoutIdParam: RequestHandler = (req, _res, next) => {
  runZod(payoutIdParam, req.params);
  next();
};
