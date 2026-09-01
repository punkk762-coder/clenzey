import type { RequestHandler } from "express";

import z from "zod";

import { RequestValidationError } from "../../../errors/appErrors.ts";
import { formattedErrorDetails } from "../../../utilities/commonUtils.ts";

const createOrderDto = z.object({
  bookingId: z.uuid(),
});

const confirmPaymentDto = z.object({
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

const runZod = <T>(schema: z.ZodType<T>, data: unknown): T => {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new RequestValidationError(formattedErrorDetails(result.error.issues));
  }
  return result.data;
};

export const createOrderRequest: RequestHandler = (req, _res, next) => {
  req.body = runZod(createOrderDto, req.body);
  next();
};

export const confirmPaymentRequest: RequestHandler = (req, _res, next) => {
  req.body = runZod(confirmPaymentDto, req.body);
  next();
};
