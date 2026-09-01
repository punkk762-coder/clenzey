import type { RequestHandler } from "express";

import z from "zod";

import { RequestValidationError } from "../../../errors/appErrors.ts";
import { formattedErrorDetails } from "../../../utilities/commonUtils.ts";

// ─── Schemas ──────────────────────────────────────────────────────

const assignSkillsBody = z.object({
  serviceIds: z.array(z.string().uuid()).min(1),
});

const listPartnersBySkillParams = z.object({
  serviceId: z.string().uuid(),
});

const partnerIdParam = z.object({
  id: z.string().uuid(),
});

// ─── Helpers ──────────────────────────────────────────────────────

const runZod = <T>(schema: z.ZodType<T>, data: unknown): T => {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new RequestValidationError(formattedErrorDetails(result.error.issues));
  }
  return result.data;
};

// ─── Middleware ───────────────────────────────────────────────────

/**
 * Validate POST /admin/partners/:id/skills body
 */
export const assignSkillsRequest: RequestHandler = (req, _res, next) => {
  req.params = runZod(partnerIdParam, req.params);
  req.body = runZod(assignSkillsBody, req.body);
  next();
};

/**
 * Validate DELETE /admin/partners/:id/skills/:serviceId params
 */
export const removeSkillRequest: RequestHandler = (req, _res, next) => {
  req.params = runZod(
    z.object({ id: z.string().uuid(), serviceId: z.string().uuid() }),
    req.params,
  );
  next();
};

/**
 * Validate GET /admin/partners/by-skill/:serviceId params
 */
export const listPartnersBySkillRequest: RequestHandler = (req, _res, next) => {
  req.params = runZod(listPartnersBySkillParams, req.params);
  next();
};
