import type { RequestHandler } from "express";

import z from "zod";

import { RequestValidationError } from "../../../errors/appErrors.ts";
import { formattedErrorDetails } from "../../../utilities/commonUtils.ts";

const payrollPeriodParam = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/),
});

const partnerIdParam = z.object({
  id: z.string().uuid(),
});

const setSalaryBody = z.object({
  isPayrollActive: z.boolean().optional(),
  monthlySalary: z.number().positive(),
  salaryEffectiveFrom: z.iso.date().optional(),
});

const setAttendanceBody = z.object({
  absentDays: z.number().int().min(0).max(31),
});

const listPayrollRunsQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  partnerId: z.string().uuid().optional(),
  payrollPeriod: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  status: z.enum(["PENDING", "PROCESSED", "FAILED"]).optional(),
});

const reprocessPayrollBody = z.object({
  partnerId: z.string().uuid(),
});

const createIncentiveConfigBody = z.object({
  effectiveFrom: z.iso.datetime(),
  isActive: z.boolean().optional(),
  percentage: z.number().min(0).max(100),
  serviceId: z.string().uuid().nullable().optional(),
});

const updateIncentiveConfigBody = z.object({
  effectiveFrom: z.iso.datetime().optional(),
  isActive: z.boolean().optional(),
  percentage: z.number().min(0).max(100).optional(),
  serviceId: z.string().uuid().nullable().optional(),
});

const incentiveConfigIdParam = z.object({
  id: z.string().uuid(),
});

const listIncentiveConfigsQuerySchema = z.object({
  activeOnly: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const totalIncentivesQuery = z.object({
  from: z.iso.datetime(),
  to: z.iso.datetime(),
});

const runZod = <T>(schema: z.ZodType<T>, data: unknown): T => {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new RequestValidationError(formattedErrorDetails(result.error.issues));
  }
  return result.data;
};

export const validatePartnerIdParam: RequestHandler = (req, _res, next) => {
  runZod(partnerIdParam, req.params);
  next();
};

export const validatePayrollPeriodParam: RequestHandler = (req, _res, next) => {
  runZod(payrollPeriodParam, req.params);
  next();
};

export const setSalaryRequest: RequestHandler = (req, _res, next) => {
  req.body = runZod(setSalaryBody, req.body);
  next();
};

export const setAttendanceRequest: RequestHandler = (req, _res, next) => {
  req.body = runZod(setAttendanceBody, req.body);
  next();
};

export const listPayrollRunsRequest: RequestHandler = (req, _res, next) => {
  const query = runZod(listPayrollRunsQuery, req.query);
  (req as unknown as { validatedQuery: typeof query }).validatedQuery = query;
  next();
};

export const reprocessPayrollRequest: RequestHandler = (req, _res, next) => {
  req.body = runZod(reprocessPayrollBody, req.body);
  next();
};

export const createIncentiveConfigRequest: RequestHandler = (req, _res, next) => {
  req.body = runZod(createIncentiveConfigBody, req.body);
  next();
};

export const updateIncentiveConfigRequest: RequestHandler = (req, _res, next) => {
  req.body = runZod(updateIncentiveConfigBody, req.body);
  next();
};

export const validateIncentiveConfigIdParam: RequestHandler = (req, _res, next) => {
  runZod(incentiveConfigIdParam, req.params);
  next();
};

export const listIncentiveConfigsQuery: RequestHandler = (req, _res, next) => {
  const query = runZod(listIncentiveConfigsQuerySchema, req.query);
  (req as unknown as { validatedQuery: typeof query }).validatedQuery = query;
  next();
};

export const totalIncentivesQueryValidator: RequestHandler = (req, _res, next) => {
  const query = runZod(totalIncentivesQuery, req.query);
  (req as unknown as { validatedQuery: typeof query }).validatedQuery = query;
  next();
};
