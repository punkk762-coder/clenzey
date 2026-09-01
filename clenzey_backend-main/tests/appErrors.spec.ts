import { HttpStatusCode } from "axios";
import { describe, expect, it } from "vitest";

import {
  AppError,
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  RequestValidationError,
  UnauthorizedError,
} from "../src/errors/appErrors.ts";
import ErrorCode from "../src/errors/errorCode.ts";

describe("AppError hierarchy", () => {
  it("creates AppError with defaults", () => {
    const err = new AppError("Server blew up");
    expect(err.name).toBe("AppError");
    expect(err.statusCode).toBe(HttpStatusCode.InternalServerError);
    expect(err.error.code).toBe(ErrorCode.SERVER_ERROR);
  });

  it("creates BadRequestError with optional details", () => {
    const err = new BadRequestError("Invalid input", { field: "email" });
    expect(err.statusCode).toBe(HttpStatusCode.BadRequest);
    expect(err.error.code).toBe(ErrorCode.BAD_REQUEST_ERROR);
    expect(err.error.details).toEqual({ field: "email" });
  });

  it("creates RequestValidationError", () => {
    const err = new RequestValidationError([{ field: "phone" }]);
    expect(err.statusCode).toBe(HttpStatusCode.UnprocessableEntity);
    expect(err.error.code).toBe(ErrorCode.REQUEST_VALIDATION_ERROR);
  });

  it("creates UnauthorizedError", () => {
    const err = new UnauthorizedError("No token");
    expect(err.statusCode).toBe(HttpStatusCode.Unauthorized);
    expect(err.error.code).toBe(ErrorCode.UNAUTHORIZED_ERROR);
  });

  it("creates NotFoundError", () => {
    const err = new NotFoundError();
    expect(err.statusCode).toBe(HttpStatusCode.NotFound);
    expect(err.message).toBe("Not found");
  });

  it("creates ForbiddenError", () => {
    const err = new ForbiddenError("Denied");
    expect(err.statusCode).toBe(HttpStatusCode.Forbidden);
    expect(err.error.code).toBe(ErrorCode.FORBIDDEN_ERROR);
  });

  it("creates ConflictError", () => {
    const err = new ConflictError("Already exists");
    expect(err.statusCode).toBe(HttpStatusCode.Conflict);
    expect(err.error.code).toBe(ErrorCode.CONFLICT_ERROR);
  });

  it("creates errors without optional details param", () => {
    const badRequest = new BadRequestError();
    expect(badRequest.error.details).toBeUndefined();

    const unauthorized = new UnauthorizedError();
    expect(unauthorized.error.details).toBeUndefined();

    const notFound = new NotFoundError("Missing resource");
    expect(notFound.error.details).toBeUndefined();

    const forbidden = new ForbiddenError();
    expect(forbidden.error.details).toBeUndefined();

    const conflict = new ConflictError();
    expect(conflict.error.details).toBeUndefined();
  });

  it("creates errors with optional details param", () => {
    expect(new UnauthorizedError("Denied", { reason: "expired" }).error.details).toEqual({
      reason: "expired",
    });
    expect(new NotFoundError("Missing", { id: "1" }).error.details).toEqual({ id: "1" });
    expect(new ForbiddenError("Nope", { role: "guest" }).error.details).toEqual({
      role: "guest",
    });
    expect(new ConflictError("Dup", { field: "email" }).error.details).toEqual({
      field: "email",
    });
  });
});
