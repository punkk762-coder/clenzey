import { describe, expect, it, vi, beforeEach } from "vitest";

import { requireAuth } from "../src/middlewares/authMiddleware.ts";
import * as authUtils from "../src/utilities/authUtils.ts";
import { UnauthorizedError } from "../src/errors/appErrors.ts";
import { mockNext, mockRequest, mockResponse } from "./helpers/mockExpress.ts";

describe("requireAuth middleware", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects missing authorization header", async () => {
    const middleware = requireAuth();
    const next = mockNext();
    await middleware(mockRequest(), mockResponse(), next);
    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it("attaches user payload for valid tokens", async () => {
    vi.spyOn(authUtils, "verifyToken").mockResolvedValue({
      phone: "+919999999999",
      sub: "user-1",
      userType: "CONSUMER",
    });
    const middleware = requireAuth();
    const req = mockRequest({
      headers: { authorization: "Bearer valid-token" },
    });
    const next = mockNext();
    await middleware(req, mockResponse(), next);
    expect(req.user?.sub).toBe("user-1");
    expect(next).toHaveBeenCalledWith();
  });

  it("enforces allowed user types", async () => {
    vi.spyOn(authUtils, "verifyToken").mockResolvedValue({
      phone: "+919999999999",
      sub: "user-1",
      userType: "CONSUMER",
    });
    const middleware = requireAuth(["ADMIN"]);
    const next = mockNext();
    await middleware(
      mockRequest({ headers: { authorization: "Bearer token" } }),
      mockResponse(),
      next,
    );
    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it("maps JWT expiry to a friendly message", async () => {
    const expired = new Error("expired");
    expired.name = "JWTExpired";
    vi.spyOn(authUtils, "verifyToken").mockRejectedValue(expired);
    const middleware = requireAuth();
    const next = mockNext();
    await middleware(
      mockRequest({ headers: { authorization: "Bearer expired" } }),
      mockResponse(),
      next,
    );
    const err = (next as ReturnType<typeof vi.fn>).mock.calls[0]![0] as UnauthorizedError;
    expect(err.message).toBe("Session expired, please log in again.");
  });
});
