import type { RequestHandler } from "express";

import z from "zod";

import { RequestValidationError } from "../../../errors/appErrors.ts";
import { formattedErrorDetails } from "../../../utilities/commonUtils.ts";

const platformEnum = z.enum(["ANDROID", "IOS"]);

const registerDeviceTokenDto = z.object({
  deviceToken: z.string().min(1),
  platform: platformEnum,
});

const removeDeviceTokenDto = z.object({
  deviceToken: z.string().min(1),
});

const runZod = <T>(schema: z.ZodType<T>, data: unknown): T => {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new RequestValidationError(formattedErrorDetails(result.error.issues));
  }
  return result.data;
};

export const registerDeviceTokenRequest: RequestHandler = (req, _res, next) => {
  req.body = runZod(registerDeviceTokenDto, req.body);
  next();
};

export const removeDeviceTokenRequest: RequestHandler = (req, _res, next) => {
  req.body = runZod(removeDeviceTokenDto, req.body);
  next();
};
