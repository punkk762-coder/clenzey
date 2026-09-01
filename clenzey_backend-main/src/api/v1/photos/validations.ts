import type { RequestHandler } from "express";

import z from "zod";

import { BadRequestError, RequestValidationError } from "../../../errors/appErrors.ts";
import { formattedErrorDetails } from "../../../utilities/commonUtils.ts";
import { isAllowedUploadUrl } from "../../../validations/uploadUrlValidator.ts";

const bookingIdParamDto = z.object({
  id: z.string().uuid(),
});

const uploadPhotoBody = z.object({
  fileUrl: z.string().url(),
  type: z.enum(["BEFORE", "AFTER"]),
});

const runZod = <T>(schema: z.ZodType<T>, data: unknown): T => {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new RequestValidationError(formattedErrorDetails(result.error.issues));
  }
  return result.data;
};

const assertAllowedUploadUrl = (fileUrl: string) => {
  if (!isAllowedUploadUrl(fileUrl)) {
    throw new BadRequestError("File URL origin is not allowed.");
  }
};

export const validateBookingIdParam: RequestHandler = (req, _res, next) => {
  runZod(bookingIdParamDto, req.params);
  next();
};

export const validateUploadPhotoBody: RequestHandler = (req, _res, next) => {
  const body = runZod(uploadPhotoBody, req.body);
  assertAllowedUploadUrl(body.fileUrl);
  req.body = body;
  next();
};
