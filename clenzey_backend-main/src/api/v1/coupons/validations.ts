import type { RequestHandler } from "express";

import z from "zod";

import { RequestValidationError } from "../../../errors/appErrors.ts";
import { formattedErrorDetails } from "../../../utilities/commonUtils.ts";

const SERVICE_CATEGORIES = [
  "QUICK_SHINE",
  "DEEP_CLEANING",
  "DEEP_LUXE",
  "CORPORATE",
] as const;

type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];

const SERVICE_CATEGORY_ALIASES: Record<string, ServiceCategory> = {
  CORPORATE: "CORPORATE",
  DEEP_CLEAN: "DEEP_CLEANING",
  DEEP_CLEANING: "DEEP_CLEANING",
  DEEP_CLEANING_SERVICE: "DEEP_CLEANING",
  DEEP_LUXE: "DEEP_LUXE",
  QUICKSHINE: "QUICK_SHINE",
  QUICK_SHINE: "QUICK_SHINE",
};

const normalizeServiceCategory = (value: unknown): unknown => {
  if (typeof value !== "string") return value;

  const normalized = value
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

  return SERVICE_CATEGORY_ALIASES[normalized] ?? normalized;
};

const serviceCategorySchema = z.preprocess(
  normalizeServiceCategory,
  z.enum(SERVICE_CATEGORIES),
);

const createCouponDto = z.object({
  applicableCategories: z.array(z.enum(SERVICE_CATEGORIES)).default([]),
  applicableServiceIds: z.array(z.uuid()).default([]),
  code: z
    .string()
    .min(3)
    .max(40)
    .regex(/^[A-Z0-9_-]+$/i),
  description: z.string().max(500).optional(),
  discountType: z.enum(["PERCENTAGE", "FLAT"]),
  discountValue: z.number().min(0),
  firstBookingOnly: z.boolean().default(false),
  maxDiscountAmount: z.number().min(0).optional(),
  minOrderAmount: z.number().min(0).default(0),
  perUserLimit: z.number().int().min(1).optional(),
  usageLimit: z.number().int().min(1).optional(),
  validFrom: z.iso.datetime().optional(),
  validUntil: z.iso.datetime().optional(),
});

const updateCouponDto = createCouponDto.partial().extend({
  isActive: z.boolean().optional(),
});

const validateCouponDto = z
  .object({
    addonIds: z.array(z.uuid()).optional(),
    addressId: z.uuid().optional(),
    amount: z.coerce.number().min(0).optional(),
    code: z.string().trim().min(1).transform((value) => value.toUpperCase()),
    serviceCategory: serviceCategorySchema.optional(),
    serviceId: z.uuid().optional(),
    subVariantId: z.uuid().optional(),
    variantId: z.uuid().optional(),
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

const listCouponsQueryDto = z.object({
  activeOnly: z.coerce.boolean().default(false),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const listOffersQueryDto = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(10),
});

const runZod = <T>(schema: z.ZodType<T>, data: unknown): T => {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new RequestValidationError(formattedErrorDetails(result.error.issues));
  }
  return result.data;
};

export const createCouponRequest: RequestHandler = (req, _res, next) => {
  req.body = runZod(createCouponDto, req.body);
  next();
};

export const updateCouponRequest: RequestHandler = (req, _res, next) => {
  req.body = runZod(updateCouponDto, req.body);
  next();
};

export const validateCouponRequest: RequestHandler = (req, _res, next) => {
  req.body = runZod(validateCouponDto, req.body);
  next();
};

export const listCouponsQuery: RequestHandler = (req, _res, next) => {
  const parsed = runZod(listCouponsQueryDto, req.query);
  (req as unknown as { validatedQuery: typeof parsed }).validatedQuery = parsed;
  next();
};

export const listOffersQuery: RequestHandler = (req, _res, next) => {
  const parsed = runZod(listOffersQueryDto, req.query);
  (req as unknown as { validatedQuery: typeof parsed }).validatedQuery = parsed;
  next();
};
