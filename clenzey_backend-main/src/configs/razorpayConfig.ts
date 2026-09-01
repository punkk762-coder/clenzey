import crypto from "node:crypto";

import Razorpay from "razorpay";

import { envConfig } from "./environmentConfig.ts";

let cachedClient: null | Razorpay = null;

export const getRazorpayClient = (): Razorpay => {
  if (cachedClient) return cachedClient;
  if (!envConfig.RAZORPAY_KEY_ID || !envConfig.RAZORPAY_KEY_SECRET) {
    throw new Error(
      "Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.",
    );
  }
  cachedClient = new Razorpay({
    key_id: envConfig.RAZORPAY_KEY_ID,
    key_secret: envConfig.RAZORPAY_KEY_SECRET,
  });
  return cachedClient;
};

export const verifyRazorpayWebhookSignature = (
  rawBody: string,
  signature: string,
): boolean => {
  if (!envConfig.RAZORPAY_WEBHOOK_SECRET) return false;
  const expected = crypto
    .createHmac("sha256", envConfig.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(signature, "hex"),
    );
  } catch {
    return false;
  }
};

export const verifyRazorpayOrderSignature = (
  orderId: string,
  paymentId: string,
  signature: string,
): boolean => {
  if (!envConfig.RAZORPAY_KEY_SECRET) return false;
  const expected = crypto
    .createHmac("sha256", envConfig.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(signature, "hex"),
    );
  } catch {
    return false;
  }
};
