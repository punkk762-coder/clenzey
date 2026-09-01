import type { RequestHandler } from "express";

import z from "zod";

import { RequestValidationError } from "../../../errors/appErrors.ts";
import { formattedErrorDetails } from "../../../utilities/commonUtils.ts";
import { phoneNumberValidator } from "../../../validations/customValidator.ts";
import {
  LARGE_OFFICE_AREA_BANDS,
  LARGE_OFFICE_EMPLOYEE_BANDS,
  LARGE_OFFICE_RESTROOM_BANDS,
} from "./largeOfficePricing.ts";

// ─── Common helpers ─────────────────────────────────────────────────

const runZod = <T>(schema: z.ZodType<T>, data: unknown): T => {
  const result = schema.safeParse(data);
  if (result.error) {
    throw new RequestValidationError(formattedErrorDetails(result.error.issues));
  }
  return result.data;
};

const PRICING_MODELS = ["FIXED", "INSPECTION"] as const;

// ─── JSON item shapes ───────────────────────────────────────────────

const inclusionItemDto = z.object({
  id: z.string().uuid().optional(),
  description: z.string().max(500).nullable().optional(),
  sortOrder: z.number().int().min(0).default(0),
  title: z.string().min(1).max(200),
});

const subVariantItemDto = z.object({
  id: z.string().uuid().optional(),
  label: z.string().min(1).max(100),
  description: z.string().max(500).nullable().optional(),
  basePrice: z.number().min(0),
  discountedPrice: z.number().min(0).optional(),
  discountPercentage: z.number().int().min(0).max(100).optional(),
  pricingModel: z.enum(PRICING_MODELS).optional(),
  sortOrder: z.number().int().min(0).default(0),
});

const variantItemDto = z.object({
  id: z.string().uuid().optional(),
  label: z.string().min(1).max(100),
  value: z.string().min(1).max(100),
  basePrice: z.number().min(0),
  discountedPrice: z.number().min(0).optional(),
  discountPercentage: z.number().int().min(0).max(100).optional(),
  pricingModel: z.enum(PRICING_MODELS).optional(),
  sortOrder: z.number().int().min(0).default(0),
  inclusions: z.array(inclusionItemDto).optional(),
  subVariants: z.array(subVariantItemDto).optional(),
});

const addonItemDto = z.object({
  id: z.string().uuid().optional(),
  description: z.string().max(500).nullable().optional(),
  name: z.string().min(1).max(100),
  price: z.number().min(0),
  discountedPrice: z.number().min(0).optional(),
  discountPercentage: z.number().int().min(0).max(100).optional(),
  sortOrder: z.number().int().min(0).default(0),
});

// ─── Consumer-facing DTOs ───────────────────────────────────────────

const estimateDto = z.object({
  addonIds: z.array(z.string().uuid()).default([]),
  variantId: z.string().uuid(),
});

export const largeOfficeScopeDto = z.object({
  cleaningFrequency: z.enum([
    "ONE_TIME",
    "DAILY",
    "WEEKLY",
    "FORTNIGHTLY",
    "MONTHLY",
    "CUSTOM",
  ]),
  employeeBand: z.enum(LARGE_OFFICE_EMPLOYEE_BANDS),
  floorsCount: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  officeAreaSqFt: z.enum(LARGE_OFFICE_AREA_BANDS),
  restroomBand: z.enum(LARGE_OFFICE_RESTROOM_BANDS),
});

const largeOfficeEstimateDto = z.object({
  scope: largeOfficeScopeDto,
  variantId: z.string().uuid(),
});

const quotationRequestDto = z.object({
  address: z.string().min(1).max(500),
  name: z.string().min(1).max(100),
  notes: z.string().max(1000).optional(),
  phone: z.custom<string>(phoneNumberValidator, "Phone number validator"),
  preferredTime: z.string().datetime().optional(),
  serviceId: z.string().uuid().optional(),
  variantId: z.string().uuid().optional(),
});

export const estimateRequest: RequestHandler = (req, _res, next) => {
  req.body = runZod(estimateDto, req.body);
  next();
};

export const largeOfficeEstimateRequest: RequestHandler = (req, _res, next) => {
  req.body = runZod(largeOfficeEstimateDto, req.body);
  next();
};

export const quotationRequest: RequestHandler = (req, _res, next) => {
  req.body = runZod(quotationRequestDto, req.body);
  next();
};

// ─── Admin DTOs ─────────────────────────────────────────────────────

const createServiceDto = z.object({
  addons: z.array(addonItemDto).default([]),
  serviceType: z.enum(["B2C", "B2B"]).default("B2C"),
  description: z.string().max(1000).optional(),
  imageUrl: z.string().url().nullable().optional(),
  inclusions: z.array(inclusionItemDto).default([]),
  exclusions: z.array(inclusionItemDto).default([]),
  name: z.string().min(1).max(100),
  sortOrder: z.number().int().min(0).default(0),
  tagline: z.string().max(200).optional(),
  variants: z.array(variantItemDto).default([]),
});

const updateServiceDto = z.object({
  addons: z.array(addonItemDto).optional(),
  serviceType: z.enum(["B2C", "B2B"]).optional(),
  description: z.string().max(1000).optional(),
  imageUrl: z.string().url().nullable().optional(),
  inclusions: z.array(inclusionItemDto).optional(),
  exclusions: z.array(inclusionItemDto).optional(),
  isActive: z.boolean().optional(),
  name: z.string().min(1).max(100).optional(),
  sortOrder: z.number().int().min(0).optional(),
  tagline: z.string().max(200).optional(),
  variants: z.array(variantItemDto).optional(),
});

export const createServiceRequest: RequestHandler = (req, _res, next) => {
  req.body = runZod(createServiceDto, req.body);
  next();
};

export const updateServiceRequest: RequestHandler = (req, _res, next) => {
  req.body = runZod(updateServiceDto, req.body);
  next();
};
