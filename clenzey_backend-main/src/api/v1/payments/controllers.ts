import type { RequestHandler } from "express";

import { HttpStatusCode } from "axios";

import { verifyRazorpayWebhookSignature } from "../../../configs/razorpayConfig.ts";
import {
  BadRequestError,
  UnauthorizedError,
} from "../../../errors/appErrors.ts";
import { sendResponse, tryCatchUtil } from "../../../utilities/commonUtils.ts";
import * as paymentsService from "./service.ts";

export const createOrder: RequestHandler = tryCatchUtil(async (req, res) => {
  const consumerId = req.user?.sub;
  if (!consumerId) throw new UnauthorizedError();
  const { bookingId } = req.body as { bookingId: string };
  const result = await paymentsService.createRazorpayOrderForBooking(
    bookingId,
    consumerId,
  );
  return sendResponse(res, {
    data: result,
    statusCode: HttpStatusCode.Created,
  });
});

export const confirmPayment: RequestHandler = tryCatchUtil(async (req, res) => {
  const consumerId = req.user?.sub;
  if (!consumerId) throw new UnauthorizedError();
  const result = await paymentsService.confirmPaymentBySignature({
    consumerId,
    ...(req.body as {
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature: string;
    }),
  });
  return sendResponse(res, { data: result });
});

export const razorpayWebhook: RequestHandler = tryCatchUtil(async (req, res) => {
  const signature = req.headers["x-razorpay-signature"] as string | undefined;
  const rawBody =
    (req as unknown as { rawBody?: Buffer }).rawBody?.toString("utf8") ??
    JSON.stringify(req.body);
  if (!signature || !verifyRazorpayWebhookSignature(rawBody, signature)) {
    throw new BadRequestError("Invalid webhook signature.");
  }
  await paymentsService.handleWebhookEvent(req.body);
  return sendResponse(res, { data: { received: true } });
});
