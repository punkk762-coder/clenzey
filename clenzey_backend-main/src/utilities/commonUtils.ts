import { type NextFunction, type Request, type Response } from "express";
import { customAlphabet } from "nanoid";

import CommonConst from "../constants/commonConst.ts";

type ControllerType = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<unknown> | unknown;

type ErrorDetail = {
  message: string;
  path: PropertyKey[];
};

type ResponsePayload = {
  data?: unknown;
  error?: unknown;
  message?: null | string;
  statusCode?: number;
};

export const generateReferralCode = customAlphabet(
  CommonConst.referralAlphaStr,
  8,
);

export const formattedErrorDetails = (details: ErrorDetail[]) => {
  return details.map((detail) => ({
    field: detail.path.join("."),
    message: detail.message,
  }));
};

export const tryCatchUtil = (fn: ControllerType) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await fn(req, res, next);
    } catch (error) {
      next(error);
    }
  };
};

export function sendResponse(
  res: Response,
  {
    data = null,
    error = null,
    message = null,
    statusCode = 200,
  }: ResponsePayload = {},
) {
  return res.status(statusCode).json({
    success: statusCode < 300,
    ...(message !== null && { message }),
    ...(data !== null && { data }),
    ...(error !== null && { error }),
  });
}
