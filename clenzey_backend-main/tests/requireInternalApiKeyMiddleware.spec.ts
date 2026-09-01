import { describe, expect, it, vi } from "vitest";

import { requireInternalApiKey } from "../src/middlewares/requireInternalApiKeyMiddleware.ts";
import { UnauthorizedError } from "../src/errors/appErrors.ts";
import { mockNext, mockRequest, mockResponse } from "./helpers/mockExpress.ts";

describe("requireInternalApiKey middleware", () => {
  it("accepts the configured internal API key", () => {
    const next = mockNext();
    requireInternalApiKey(
      mockRequest({
        headers: { "x-internal-api-key": "test-internal-api-key-32-chars-min!!" },
      }),
      mockResponse(),
      next,
    );
    expect(next).toHaveBeenCalledWith();
  });

  it("rejects missing or invalid keys", () => {
    expect(() =>
      requireInternalApiKey(mockRequest(), mockResponse(), mockNext()),
    ).toThrow(UnauthorizedError);
  });

  it("rejects a wrong internal API key", () => {
    expect(() =>
      requireInternalApiKey(
        mockRequest({
          headers: { "x-internal-api-key": "wrong-key-that-is-long-enough!!" },
        }),
        mockResponse(),
        mockNext(),
      ),
    ).toThrow("Invalid internal API key.");
  });
});
