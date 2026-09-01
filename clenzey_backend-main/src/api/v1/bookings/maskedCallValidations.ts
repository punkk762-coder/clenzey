import type { RequestHandler } from "express";

import z from "zod";

import { RequestValidationError } from "../../../errors/appErrors.ts";
import { formattedErrorDetails } from "../../../utilities/commonUtils.ts";

const bookingIdParamDto = z.object({
  bookingId: z.uuid(),
});

const runZod = <T>(schema: z.ZodType<T>, data: unknown): T => {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new RequestValidationError(formattedErrorDetails(result.error.issues));
  }
  return result.data;
};

export const validateBookingIdParam: RequestHandler = (req, _res, next) => {
  runZod(bookingIdParamDto, req.params);
  next();
};
