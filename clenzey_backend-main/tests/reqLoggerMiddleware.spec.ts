import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";

vi.mock("../src/configs/loggerConfig.ts", () => ({
  default: {
    http: vi.fn(),
  },
}));

import requestLogger from "../src/middlewares/reqLoggerMiddleware.ts";
import logger from "../src/configs/loggerConfig.ts";
import { mockNext, mockRequest } from "./helpers/mockExpress.ts";

describe("requestLogger middleware", () => {
  it("logs request metadata when the response finishes", () => {
    const res = new EventEmitter() as EventEmitter & {
      statusCode: number;
    };
    res.statusCode = 200;
    const next = mockNext();
    const req = mockRequest({
      body: { phone: "+919999999999" },
      headers: { "x-request-id": "req-123" },
      method: "POST",
      originalUrl: "/api/v1/auth/otp",
    });

    requestLogger(req, res as never, next);
    expect(next).toHaveBeenCalledWith();
    res.emit("finish");

    expect(logger.http).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "POST",
        requestId: "req-123",
        statusCode: 200,
        url: "/api/v1/auth/otp",
        body: expect.objectContaining({ phone: "+919999999999" }),
      }),
    );
  });
});
