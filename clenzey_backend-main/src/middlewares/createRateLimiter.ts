import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { Options } from "express-rate-limit";
import rateLimit from "express-rate-limit";

import { envConfig } from "../configs/environmentConfig.ts";
import { withRedisStore } from "./rateLimitStore.ts";

const noopLimiter: RequestHandler = (
  _req: Request,
  _res: Response,
  next: NextFunction,
) => next();

export const isRateLimitEnabled = (): boolean => envConfig.ENABLE_RATE_LIMIT;

export const createRateLimiter = (
  options: Partial<Options>,
): RequestHandler => {
  if (!isRateLimitEnabled()) {
    return noopLimiter;
  }

  return rateLimit(withRedisStore(options) as Options) as RequestHandler;
};
