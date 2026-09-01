import { describe, expect, it } from "vitest";
import z from "zod";

const SERVICE_CATEGORIES = [
  "QUICK_SHINE",
  "DEEP_CLEANING",
  "DEEP_LUXE",
  "CORPORATE",
] as const;

const SERVICE_CATEGORY_ALIASES: Record<string, (typeof SERVICE_CATEGORIES)[number]> = {
  CORPORATE: "CORPORATE",
  DEEP_CLEAN: "DEEP_CLEANING",
  DEEP_CLEANING: "DEEP_CLEANING",
  DEEP_LUXE: "DEEP_LUXE",
  QUICKSHINE: "QUICK_SHINE",
  QUICK_SHINE: "QUICK_SHINE",
};

const normalizeServiceCategory = (value: unknown): unknown => {
  if (typeof value !== "string") return value;
  const normalized = value.trim().toUpperCase().replace(/[\s-]+/g, "_");
  return SERVICE_CATEGORY_ALIASES[normalized] ?? normalized;
};

const serviceCategorySchema = z.preprocess(
  normalizeServiceCategory,
  z.enum(SERVICE_CATEGORIES),
);

const validateCouponDto = z
  .object({
    amount: z.coerce.number().min(0).optional(),
    code: z.string().trim().min(1).transform((value) => value.toUpperCase()),
    serviceCategory: serviceCategorySchema.optional(),
    serviceId: z.uuid().optional(),
    variantId: z.uuid().optional(),
    addressId: z.uuid().optional(),
  })
  .superRefine((value, ctx) => {
    const hasBookingContext =
      value.serviceId !== undefined &&
      value.variantId !== undefined &&
      value.addressId !== undefined;

    if (value.amount === undefined && !hasBookingContext) {
      ctx.addIssue({
        code: "custom",
        message:
          "Either amount or booking context (serviceId, variantId, addressId) is required.",
        path: ["amount"],
      });
    }
  });

describe("validateCouponDto", () => {
  it("normalizes lowercase service categories", () => {
    const parsed = validateCouponDto.parse({
      amount: 2613.82,
      code: "flat100",
      serviceCategory: "deep_cleaning",
    });

    expect(parsed.code).toBe("FLAT100");
    expect(parsed.serviceCategory).toBe("DEEP_CLEANING");
  });

  it("coerces string amounts", () => {
    const parsed = validateCouponDto.parse({
      amount: "2613.82",
      code: "FLAT100",
    });

    expect(parsed.amount).toBe(2613.82);
  });
});
