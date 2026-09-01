import { HttpStatusCode } from "axios";
import { describe, expect, it, vi, beforeEach } from "vitest";

import {
  requireApprovedPartner,
  requireApprovedPartnerIfPartner,
} from "../src/middlewares/requireApprovedPartnerMiddleware.ts";
import * as partnerRepo from "../src/api/v1/partners/repository.ts";
import { ForbiddenError, UnauthorizedError } from "../src/errors/appErrors.ts";
import { mockNext, mockRequest, mockResponse } from "./helpers/mockExpress.ts";

describe("requireApprovedPartner middleware", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects unauthenticated requests", async () => {
    const next = mockNext();
    await requireApprovedPartner(mockRequest(), mockResponse(), next);
    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it("rejects unapproved partners", async () => {
    vi.spyOn(partnerRepo, "findPartnerById").mockResolvedValue({
      partner: { approvalStatus: "PENDING" },
    } as never);
    const next = mockNext();
    await requireApprovedPartner(
      mockRequest({ user: { sub: "p1", phone: "+91", userType: "PARTNER" } }),
      mockResponse(),
      next,
    );
    expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
  });

  it("rejects when partner record is missing", async () => {
    vi.spyOn(partnerRepo, "findPartnerById").mockResolvedValue(null);
    const next = mockNext();
    await requireApprovedPartner(
      mockRequest({ user: { sub: "p1", phone: "+91", userType: "PARTNER" } }),
      mockResponse(),
      next,
    );
    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it("allows approved partners", async () => {
    vi.spyOn(partnerRepo, "findPartnerById").mockResolvedValue({
      partner: { approvalStatus: "APPROVED" },
    } as never);
    const next = mockNext();
    await requireApprovedPartner(
      mockRequest({ user: { sub: "p1", phone: "+91", userType: "PARTNER" } }),
      mockResponse(),
      next,
    );
    expect(next).toHaveBeenCalledWith();
  });
});

describe("requireApprovedPartnerIfPartner", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("skips non-partner users", async () => {
    const next = mockNext();
    await requireApprovedPartnerIfPartner(
      mockRequest({ user: { sub: "c1", phone: "+91", userType: "CONSUMER" } }),
      mockResponse(),
      next,
    );
    expect(next).toHaveBeenCalledWith();
  });

  it("delegates partner users to requireApprovedPartner", async () => {
    vi.spyOn(partnerRepo, "findPartnerById").mockResolvedValue({
      partner: { approvalStatus: "APPROVED" },
    } as never);
    const next = mockNext();
    await requireApprovedPartnerIfPartner(
      mockRequest({ user: { sub: "p1", phone: "+91", userType: "PARTNER" } }),
      mockResponse(),
      next,
    );
    expect(next).toHaveBeenCalledWith();
  });
});
