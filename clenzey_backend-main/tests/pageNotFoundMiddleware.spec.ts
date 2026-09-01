import { HttpStatusCode } from "axios";
import { describe, expect, it } from "vitest";

import notFound from "../src/middlewares/pageNotFoundMiddleware.ts";
import ErrorCode from "../src/errors/errorCode.ts";
import { mockRequest, mockResponse } from "./helpers/mockExpress.ts";

describe("pageNotFound middleware", () => {
  it("returns a structured 404 response", () => {
    const res = mockResponse();
    notFound(mockRequest({ originalUrl: "/missing" }), res);
    expect(res.status).toHaveBeenCalledWith(HttpStatusCode.NotFound);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: ErrorCode.NOT_FOUND_ERROR,
          details: "No resource found at /missing",
        }),
        success: false,
      }),
    );
  });
});
