import type { RequestHandler } from "express";
import { describe, expect, it } from "vitest";

import { validateBookingIdParam } from "../src/api/v1/contact/validations.ts";
import {
  createCouponRequest,
  listCouponsQuery,
  listOffersQuery,
  updateCouponRequest,
  validateCouponRequest,
} from "../src/api/v1/coupons/validations.ts";
import {
  generateSlotsRequest,
  listAdminSlotsQuery,
  listAvailableQuery,
  updateCapacityRequest,
} from "../src/api/v1/slots/validations.ts";
import { validatePresignUploadBody } from "../src/api/v1/uploads/validations.ts";
import { RequestValidationError } from "../src/errors/appErrors.ts";
import { mockNext, mockRequest, mockResponse } from "./helpers/mockExpress.ts";

const SERVICE_ID = "550e8400-e29b-41d4-a716-446655440000";
const BOOKING_ID = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
const ADDRESS_ID = "6ba7b811-9dad-11d1-80b4-00c04fd430c8";
const VARIANT_ID = "6ba7b812-9dad-11d1-80b4-00c04fd430c8";

const runMiddleware = (
  middleware: RequestHandler,
  overrides: Parameters<typeof mockRequest>[0] = {},
) => {
  const req = mockRequest(overrides);
  const res = mockResponse();
  const next = mockNext();
  middleware(req, res, next);
  return { next, req, res };
};

const expectValidationError = (
  middleware: RequestHandler,
  overrides: Parameters<typeof mockRequest>[0] = {},
) => {
  expect(() => runMiddleware(middleware, overrides)).toThrow(RequestValidationError);
};

describe("validateBookingIdParam", () => {
  it("calls next for a valid booking id param", () => {
    const { next } = runMiddleware(validateBookingIdParam, {
      params: { id: BOOKING_ID },
    });
    expect(next).toHaveBeenCalledWith();
  });

  it("throws RequestValidationError for an invalid booking id param", () => {
    expectValidationError(validateBookingIdParam, { params: { id: "not-a-uuid" } });
  });
});

describe("generateSlotsRequest", () => {
  it("calls next and parses valid body", () => {
    const { next, req } = runMiddleware(generateSlotsRequest, {
      body: {
        fromDate: "2026-07-12",
        serviceId: SERVICE_ID,
        toDate: "2026-07-13",
      },
    });
    expect(next).toHaveBeenCalledWith();
    expect(req.body).toMatchObject({
      fromDate: "2026-07-12",
      serviceId: SERVICE_ID,
      toDate: "2026-07-13",
    });
  });

  it("throws RequestValidationError for invalid body", () => {
    expectValidationError(generateSlotsRequest, {
      body: { fromDate: "2026-07-12", serviceId: "bad", toDate: "2026-07-13" },
    });
  });
});

describe("updateCapacityRequest", () => {
  it("calls next for valid capacity", () => {
    const { next, req } = runMiddleware(updateCapacityRequest, {
      body: { capacity: 10 },
    });
    expect(next).toHaveBeenCalledWith();
    expect(req.body).toEqual({ capacity: 10 });
  });

  it("throws RequestValidationError for invalid capacity", () => {
    expectValidationError(updateCapacityRequest, { body: { capacity: -1 } });
  });
});

describe("listAvailableQuery", () => {
  it("calls next and sets validatedQuery for valid query", () => {
    const { next, req } = runMiddleware(listAvailableQuery, {
      query: { date: "2026-07-12", serviceId: SERVICE_ID },
    });
    expect(next).toHaveBeenCalledWith();
    expect((req as unknown as { validatedQuery: unknown }).validatedQuery).toEqual({
      date: "2026-07-12",
      serviceId: SERVICE_ID,
    });
  });

  it("throws RequestValidationError for invalid query", () => {
    expectValidationError(listAvailableQuery, {
      query: { date: "not-a-date", serviceId: SERVICE_ID },
    });
  });
});

describe("listAdminSlotsQuery", () => {
  it("calls next and sets validatedQuery for valid query", () => {
    const { next, req } = runMiddleware(listAdminSlotsQuery, {
      query: {
        fromAt: "2026-07-12T00:00:00.000Z",
        serviceId: SERVICE_ID,
        toAt: "2026-07-13T00:00:00.000Z",
      },
    });
    expect(next).toHaveBeenCalledWith();
    expect((req as unknown as { validatedQuery: unknown }).validatedQuery).toEqual({
      fromAt: "2026-07-12T00:00:00.000Z",
      serviceId: SERVICE_ID,
      toAt: "2026-07-13T00:00:00.000Z",
    });
  });

  it("throws RequestValidationError for invalid query", () => {
    expectValidationError(listAdminSlotsQuery, {
      query: {
        fromAt: "2026-07-12",
        serviceId: SERVICE_ID,
        toAt: "2026-07-13T00:00:00.000Z",
      },
    });
  });
});

describe("validatePresignUploadBody", () => {
  it("calls next for a valid kyc upload body", () => {
    const { next, req } = runMiddleware(validatePresignUploadBody, {
      body: { contentType: "image/jpeg", purpose: "kyc" },
    });
    expect(next).toHaveBeenCalledWith();
    expect(req.body).toMatchObject({ contentType: "image/jpeg", purpose: "kyc" });
  });

  it("calls next for booking_photo when bookingId is provided", () => {
    const { next } = runMiddleware(validatePresignUploadBody, {
      body: {
        bookingId: BOOKING_ID,
        contentType: "image/png",
        purpose: "booking_photo",
      },
    });
    expect(next).toHaveBeenCalledWith();
  });

  it("throws RequestValidationError when bookingId is missing for booking_photo", () => {
    expectValidationError(validatePresignUploadBody, {
      body: { contentType: "image/jpeg", purpose: "booking_photo" },
    });
  });

  it("throws RequestValidationError when bookingId is provided for profile uploads", () => {
    expectValidationError(validatePresignUploadBody, {
      body: {
        bookingId: BOOKING_ID,
        contentType: "image/jpeg",
        purpose: "profile",
      },
    });
  });

  it("throws RequestValidationError for unsupported content type", () => {
    expectValidationError(validatePresignUploadBody, {
      body: { contentType: "application/pdf", purpose: "profile" },
    });
  });
});

describe("createCouponRequest", () => {
  it("calls next for valid coupon body", () => {
    const { next, req } = runMiddleware(createCouponRequest, {
      body: {
        code: "SAVE10",
        discountType: "PERCENTAGE",
        discountValue: 10,
      },
    });
    expect(next).toHaveBeenCalledWith();
    expect(req.body).toMatchObject({
      code: "SAVE10",
      discountType: "PERCENTAGE",
      discountValue: 10,
    });
  });

  it("throws RequestValidationError for invalid coupon body", () => {
    expectValidationError(createCouponRequest, {
      body: { code: "x", discountType: "PERCENTAGE", discountValue: 10 },
    });
  });
});

describe("updateCouponRequest", () => {
  it("calls next for valid partial update", () => {
    const { next, req } = runMiddleware(updateCouponRequest, {
      body: { isActive: false },
    });
    expect(next).toHaveBeenCalledWith();
    expect(req.body).toMatchObject({ isActive: false });
  });

  it("throws RequestValidationError for invalid update body", () => {
    expectValidationError(updateCouponRequest, {
      body: { discountValue: -5 },
    });
  });
});

describe("validateCouponRequest", () => {
  it("calls next when amount is provided", () => {
    const { next, req } = runMiddleware(validateCouponRequest, {
      body: { amount: 100, code: "flat100" },
    });
    expect(next).toHaveBeenCalledWith();
    expect(req.body).toMatchObject({ amount: 100, code: "FLAT100" });
  });

  it("calls next when booking context is provided", () => {
    const { next } = runMiddleware(validateCouponRequest, {
      body: {
        addressId: ADDRESS_ID,
        code: "ctx10",
        serviceId: SERVICE_ID,
        variantId: VARIANT_ID,
      },
    });
    expect(next).toHaveBeenCalledWith();
  });

  it("throws RequestValidationError when amount and booking context are missing", () => {
    expectValidationError(validateCouponRequest, {
      body: { code: "NOAMT" },
    });
  });
});

describe("listCouponsQuery", () => {
  it("calls next and sets validatedQuery with defaults", () => {
    const { next, req } = runMiddleware(listCouponsQuery, { query: {} });
    expect(next).toHaveBeenCalledWith();
    expect((req as unknown as { validatedQuery: unknown }).validatedQuery).toEqual({
      activeOnly: false,
      limit: 50,
      offset: 0,
    });
  });

  it("throws RequestValidationError for invalid limit", () => {
    expectValidationError(listCouponsQuery, { query: { limit: "0" } });
  });
});

describe("listOffersQuery", () => {
  it("calls next and sets validatedQuery with defaults", () => {
    const { next, req } = runMiddleware(listOffersQuery, { query: {} });
    expect(next).toHaveBeenCalledWith();
    expect((req as unknown as { validatedQuery: unknown }).validatedQuery).toEqual({
      limit: 10,
    });
  });

  it("throws RequestValidationError for invalid limit", () => {
    expectValidationError(listOffersQuery, { query: { limit: "100" } });
  });
});
