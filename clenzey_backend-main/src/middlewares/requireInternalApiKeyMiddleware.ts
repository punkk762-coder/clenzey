import crypto from "node:crypto";

import type { RequestHandler } from "express";

import { envConfig } from "../configs/environmentConfig.ts";
import { UnauthorizedError } from "../errors/appErrors.ts";

const timingSafeEqualString = (a: string, b: string): boolean => {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) {
    crypto.timingSafeEqual(aBuf, aBuf);
    return false;
  }
  return crypto.timingSafeEqual(aBuf, bBuf);
};

export const requireInternalApiKey: RequestHandler = (req, _res, next) => {
  const configuredKey = envConfig.INTERNAL_API_KEY;
  if (!configuredKey) {
    throw new UnauthorizedError("Internal API is not configured.");
  }

  const providedKey = req.header("x-internal-api-key");
  if (!providedKey || !timingSafeEqualString(providedKey, configuredKey)) {
    throw new UnauthorizedError("Invalid internal API key.");
  }

  next();
};
