import { describe, expect, it } from "vitest";

import {
  requireAdminRole,
  requireFinanceAdmin,
  requireOperationsAdmin,
  requireSuperAdmin,
} from "../src/middlewares/requireAdminRoleMiddleware.ts";
import { ForbiddenError, UnauthorizedError } from "../src/errors/appErrors.ts";
import { mockNext, mockRequest, mockResponse } from "./helpers/mockExpress.ts";

describe("requireAdminRole middleware", () => {
  it("rejects non-admin users", () => {
    const middleware = requireAdminRole("SUPER_ADMIN");
    const next = mockNext();
    middleware(
      mockRequest({ user: { sub: "u1", phone: "+91", userType: "CONSUMER" } }),
      mockResponse(),
      next,
    );
    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it("rejects admins without the required role", () => {
    const middleware = requireAdminRole("SUPER_ADMIN");
    const next = mockNext();
    middleware(
      mockRequest({
        user: {
          phone: "+91",
          role: "OPERATIONS",
          sub: "admin-1",
          userType: "ADMIN",
        },
      }),
      mockResponse(),
      next,
    );
    expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
  });

  it("rejects admins missing a role claim", () => {
    const middleware = requireAdminRole("SUPER_ADMIN");
    const next = mockNext();
    middleware(
      mockRequest({
        user: {
          phone: "+91",
          sub: "admin-1",
          userType: "ADMIN",
        },
      }),
      mockResponse(),
      next,
    );
    expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
  });

  it("allows admins with matching roles", () => {
    const middleware = requireAdminRole("FINANCE", "SUPER_ADMIN");
    const next = mockNext();
    middleware(
      mockRequest({
        user: {
          phone: "+91",
          role: "FINANCE",
          sub: "admin-1",
          userType: "ADMIN",
        },
      }),
      mockResponse(),
      next,
    );
    expect(next).toHaveBeenCalledWith();
  });

  it("exports preset role guards", () => {
    expect(typeof requireFinanceAdmin).toBe("function");
    expect(typeof requireOperationsAdmin).toBe("function");
    expect(typeof requireSuperAdmin).toBe("function");
  });
});
