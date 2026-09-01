import { HttpStatusCode } from "axios";

import ErrorCode from "./errorCode.ts";

type ErrorDetail = string | {}

export type ErrorPayload = {
  code: string;
  details?: unknown;
};

type AppErrorPayload = {
  error?: ErrorPayload;
  statusCode?: number;
};

export class AppError extends Error {
  error: ErrorPayload;
  statusCode: number;

  constructor(message: string, payload: AppErrorPayload = {}) {
    super(message);

    const {
      error = { code: ErrorCode.SERVER_ERROR },
      statusCode = HttpStatusCode.InternalServerError,
    } = payload;

    this.name = "AppError";
    this.error = error;
    this.statusCode = statusCode;
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Bad request", details?: unknown) {
    super(message, {
      error: {
        code: ErrorCode.BAD_REQUEST_ERROR,
        ...(details !== undefined && { details }),
      },
      statusCode: HttpStatusCode.BadRequest,
    });
  }
}

export class RequestValidationError extends AppError {
  constructor(details: unknown) {
    super("Request validation failed", {
      error: {
        code: ErrorCode.REQUEST_VALIDATION_ERROR,
        details,
      },
      statusCode: HttpStatusCode.UnprocessableEntity,
    });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized", details?: unknown) {
    super(message, {
      error: {
        code: ErrorCode.UNAUTHORIZED_ERROR,
        ...(details !== undefined && { details }),
      },
      statusCode: HttpStatusCode.Unauthorized,
    });
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found", details?: unknown) {
    super(message, {
      error: {
        code: ErrorCode.NOT_FOUND_ERROR,
        ...(details !== undefined && { details }),
      },
      statusCode: HttpStatusCode.NotFound,
    });
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden", details?: unknown) {
    super(message, {
      error: {
        code: ErrorCode.FORBIDDEN_ERROR,
        ...(details !== undefined && { details }),
      },
      statusCode: HttpStatusCode.Forbidden,
    });
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflict", details?: unknown) {
    super(message, {
      error: {
        code: ErrorCode.CONFLICT_ERROR,
        ...(details !== undefined && { details }),
      },
      statusCode: HttpStatusCode.Conflict,
    });
  }
}
