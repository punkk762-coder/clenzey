import { HttpStatusCode } from "axios";
import { describe, expect, it, vi } from "vitest";

import errorHandler from "../src/middlewares/errorHandlerMiddleware.ts";
import { AppError, BadRequestError } from "../src/errors/appErrors.ts";
import ErrorCode from "../src/errors/errorCode.ts";
import { mockNext, mockRequest, mockResponse } from "./helpers/mockExpress.ts";

vi.mock("../src/configs/loggerConfig.ts", () => ({
  default: {
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

describe("errorHandler middleware", () => {
  it("normalizes unknown errors to AppError", () => {
    const res = mockResponse();
    const next = mockNext();
    errorHandler(new Error("db down"), mockRequest(), res, next);
    expect(res.status).toHaveBeenCalledWith(HttpStatusCode.InternalServerError);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: ErrorCode.SERVER_ERROR }),
        success: false,
      }),
    );
  });

  it("passes through AppError instances", () => {
    const res = mockResponse();
    errorHandler(new BadRequestError("bad"), mockRequest(), res, mockNext());
    expect(res.status).toHaveBeenCalledWith(HttpStatusCode.BadRequest);
  });

  it("handles entity.too.large errors", () => {
    const res = mockResponse();
    const tooLarge = new Error("too large");
    (tooLarge as Error & { type: string }).type = "entity.too.large";
    errorHandler(tooLarge, mockRequest(), res, mockNext());
    expect(res.status).toHaveBeenCalledWith(HttpStatusCode.PayloadTooLarge);
  });

  it("delegates when headers already sent", () => {
    const res = mockResponse();
    res.headersSent = true;
    const next = mockNext();
    const err = new AppError("late");
    errorHandler(err, mockRequest(), res, next);
    expect(next).toHaveBeenCalledWith(err);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("normalizes non-Error unknown values", () => {
    const res = mockResponse();
    errorHandler("unexpected string failure", mockRequest(), res, mockNext());
    expect(res.status).toHaveBeenCalledWith(HttpStatusCode.InternalServerError);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: ErrorCode.SERVER_ERROR,
          details: "\"unexpected string failure\"",
        }),
      }),
    );
  });

  it("falls back to String when JSON.stringify fails", () => {
    const circular: { self?: unknown } = {};
    circular.self = circular;

    const res = mockResponse();
    errorHandler(circular, mockRequest(), res, mockNext());
    expect(res.status).toHaveBeenCalledWith(HttpStatusCode.InternalServerError);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          details: "[object Object]",
        }),
      }),
    );
  });
});
