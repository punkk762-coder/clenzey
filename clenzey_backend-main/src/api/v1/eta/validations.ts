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

const getEtaParamsDto = z.object({
  id: z.string().uuid("Invalid booking ID"),
});

export const getEtaParams: RequestHandler = (req, _res, next) => {
  const parsed = runZod(getEtaParamsDto, req.params);
  req.params = parsed as typeof req.params;
  next();
};
