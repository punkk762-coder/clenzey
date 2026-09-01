import type { RequestHandler } from "express";

import z from "zod";

import { RequestValidationError } from "../../../errors/appErrors.ts";
import { formattedErrorDetails } from "../../../utilities/commonUtils.ts";

const listNotificationsQuery = z.object({
  isRead: z
    .enum(["true", "false"])
    .transform((val) => val === "true")
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const notificationIdParam = z.object({
  id: z.string().uuid(),
});

const runZod = <T>(schema: z.ZodType<T>, data: unknown): T => {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new RequestValidationError(formattedErrorDetails(result.error.issues));
  }
  return result.data;
};

export const listNotificationsRequest: RequestHandler = (req, _res, next) => {
  const query = runZod(listNotificationsQuery, req.query);
  (req as unknown as { validatedQuery: typeof query }).validatedQuery = query;
  next();
};

export const validateNotificationIdParam: RequestHandler = (req, _res, next) => {
  runZod(notificationIdParam, req.params);
  next();
};
