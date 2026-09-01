import type { ErrorRequestHandler } from "express";

import { HttpStatusCode } from "axios";

import { envConfig } from "../configs/environmentConfig.ts";
import logger from "../configs/loggerConfig.ts";
import { AppError } from "../errors/appErrors.ts";
import ErrorCode from "../errors/errorCode.ts";
import ErrorMsg from "../errors/errorMsg.ts";
import { sendResponse } from "../utilities/commonUtils.ts";

const normalizeUnknownError = (err: unknown): AppError => {
  if (err instanceof AppError) {
    return err;
  }

  if (
    err instanceof Error &&
    "type" in err &&
    err.type === "entity.too.large"
  ) {
    return new AppError("Request body too large", {
      error: { code: ErrorCode.BAD_REQUEST_ERROR },
      statusCode: HttpStatusCode.PayloadTooLarge,
    });
  }

  const message = err instanceof Error
    ? err.message
    : (() => { try { return JSON.stringify(err); } catch { return String(err); } })();

  return new AppError(ErrorMsg.SERVER_ERROR, {
    error: {
      code: ErrorCode.SERVER_ERROR,
      details: envConfig.NODE_ENV !== "prod" ? message : undefined,
    },
    statusCode: HttpStatusCode.InternalServerError,
  });
};

const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const appError = normalizeUnknownError(err);
  const logMethod =
    appError.statusCode >= HttpStatusCode.InternalServerError
      ? "error"
      : "warning";

  logger[logMethod]({
    code: appError.error.code,
    details: appError.error.details,
    message: appError.message,
    statusCode: appError.statusCode,
  });

  return sendResponse(res, {
    error: appError.error,
    message: appError.message,
    statusCode: appError.statusCode,
  });
};

export default errorHandler;
