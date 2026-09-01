import { describe, expect, it } from "vitest";

import requestIdMiddleware from "../src/middlewares/requestIdMiddleware.ts";
import { mockNext, mockRequest, mockResponse } from "./helpers/mockExpress.ts";

describe("requestIdMiddleware", () => {
  it("reuses incoming x-request-id header", () => {
    const req = mockRequest({ headers: { "x-request-id": "req-123" } });
    const res = mockResponse();
    requestIdMiddleware(req, res, mockNext());
    expect(req.headers["x-request-id"]).toBe("req-123");
    expect(res.setHeader).toHaveBeenCalledWith("X-Request-Id", "req-123");
  });

  it("generates a request id when missing", () => {
    const req = mockRequest();
    const res = mockResponse();
    requestIdMiddleware(req, res, mockNext());
    expect(typeof req.headers["x-request-id"]).toBe("string");
    expect((req.headers["x-request-id"] as string).length).toBeGreaterThan(0);
  });
});
