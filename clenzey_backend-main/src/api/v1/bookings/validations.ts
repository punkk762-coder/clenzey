import type { RequestHandler } from "express";

import z from "zod";

import { bookingStatusEnum } from "../../../db/schema/enums.ts";
import { RequestValidationError } from "../../../errors/appErrors.ts";
import { formattedErrorDetails } from "../../../utilities/commonUtils.ts";
import { largeOfficeScopeDto } from "../services/validations.ts";

const BOOKING_TYPES = ["INSTANT", "SCHEDULED"] as const;
const SUBSCRIPTION_PLANS = [
  "ONE_TIME",
  "DAILY",
  "WEEKLY",
  "FORTNIGHTLY",
  "MONTHLY",
  "CUSTOM",
] as const;
const PAYMENT_MODES = ["RAZORPAY", "CASH", "WALLET"] as const;
const BOOKING_STATUSES = bookingStatusEnum.enumValues;

const corporateDetailsDto = z.object({
  companyName: z.string().min(1).max(200),
  contactPerson: z.string().min(1).max(120),
  contactEmail: z.string().email().max(200),
  gstNumber: z.string().max(20).optional(),
  cleaningFrequency: z.enum([
    "ONE_TIME",
    "DAILY",
    "WEEKLY",
    "FORTNIGHTLY",
    "MONTHLY",
    "CUSTOM",
  ]),
  schedulePreference: z.enum([
    "BEFORE_OFFICE",
    "DURING_OFFICE",
    "AFTER_OFFICE",
    "WEEKEND",
  ]),
  estimatedBasePrice: z.number().positive().optional(),
  estimatedTeam: z.number().int().min(1).max(50).optional(),
  largeOfficeScope: largeOfficeScopeDto.optional(),
});

const createBookingDto = z
  .object({
    addonIds: z.array(z.uuid()).default([]),
    addressId: z.uuid(),
    bookingName: z.string().max(200).optional(),
    bookingType: z.enum(BOOKING_TYPES),
    consumerNotes: z.string().max(1000).optional(),
    corporateDetails: corporateDetailsDto.optional(),
    couponCode: z.string().max(40).optional(),
    largeOfficeScope: largeOfficeScopeDto.optional(),
    paymentMode: z.enum(PAYMENT_MODES).optional(),
    scheduledAt: z.iso.datetime().optional(),
    serviceId: z.uuid(),
    subVariantId: z.string().uuid().optional(),
    subscriptionPlan: z.enum(SUBSCRIPTION_PLANS).default("ONE_TIME"),
    timeSlotId: z.uuid().optional(),
    variantId: z.uuid(),
  })
  .refine(
    (v) => (v.bookingType === "SCHEDULED" ? !!v.scheduledAt || !!v.timeSlotId : true),
    {
      message:
        "scheduledAt or timeSlotId is required for SCHEDULED bookings.",
      path: ["timeSlotId"],
    },
  );

const previewBookingDto = z
  .object({
    addonIds: z.array(z.uuid()).default([]),
    addressId: z.uuid(),
    bookingType: z.enum(BOOKING_TYPES),
    corporateDetails: corporateDetailsDto.optional(),
    couponCode: z.string().max(40).optional(),
    largeOfficeScope: largeOfficeScopeDto.optional(),
    scheduledAt: z.iso.datetime().optional(),
    serviceId: z.uuid(),
    subVariantId: z.string().uuid().optional(),
    subscriptionPlan: z.enum(SUBSCRIPTION_PLANS).default("ONE_TIME"),
    variantId: z.uuid(),
  })
  .refine(
    (v) => (v.bookingType === "SCHEDULED" ? !!v.scheduledAt : true),
    { message: "scheduledAt is required for SCHEDULED bookings.", path: ["scheduledAt"] },
  );

const transitionDto = z.object({
  metadata: z.record(z.string(), z.unknown()).optional(),
  reason: z.string().max(500).optional(),
  toStatus: z.enum(BOOKING_STATUSES),
});

const verifyStartDto = z.object({
  code: z.string().regex(/^\d{4}$/, "Code must be exactly 4 digits"),
});

const cancelBookingDto = z.object({
  reason: z.string().max(500).optional(),
});

const listBookingsQueryDto = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  partnerId: z.string().uuid().optional(),
  serviceId: z.string().uuid().optional(),
  status: z.enum(BOOKING_STATUSES).optional(),
  statuses: z
    .string()
    .transform((value) =>
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.enum(BOOKING_STATUSES)).min(1))
    .optional(),
}).superRefine((value, ctx) => {
  if (value.status && value.statuses?.length) {
    ctx.addIssue({
      code: "custom",
      message: "Use either status or statuses, not both.",
      path: ["statuses"],
    });
  }
});

const runZod = <T>(
  schema: z.ZodType<T>,
  data: unknown,
): T => {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new RequestValidationError(formattedErrorDetails(result.error.issues));
  }
  return result.data;
};

export const createBookingRequest: RequestHandler = (req, _res, next) => {
  req.body = runZod(createBookingDto, req.body);
  next();
};

export const previewBookingRequest: RequestHandler = (req, _res, next) => {
  req.body = runZod(previewBookingDto, req.body);
  next();
};

export const transitionRequest: RequestHandler = (req, _res, next) => {
  req.body = runZod(transitionDto, req.body);
  next();
};

export const verifyStartRequest: RequestHandler = (req, _res, next) => {
  req.body = runZod(verifyStartDto, req.body);
  next();
};

export const cancelBookingRequest: RequestHandler = (req, _res, next) => {
  req.body = runZod(cancelBookingDto, req.body);
  next();
};

export const listBookingsQuery: RequestHandler = (req, _res, next) => {
  const parsed = runZod(listBookingsQueryDto, req.query);
  (req as unknown as { validatedQuery: typeof parsed }).validatedQuery = parsed;
  next();
};

// ── Rescheduling ─────────────────────────────────────────────────────────────

const rescheduleBookingDto = z.object({
  newScheduledAt: z.string().datetime(),
  timeSlotId: z.string().uuid().optional(),
});

export const rescheduleBookingRequest: RequestHandler = (req, _res, next) => {
  req.body = runZod(rescheduleBookingDto, req.body);
  next();
};

// ── Admin Assignment ─────────────────────────────────────────────────────────

const adminAssignPartnerDto = z.object({
  partnerId: z.uuid(),
});

export const adminAssignPartnerRequest: RequestHandler = (req, _res, next) => {
  req.body = runZod(adminAssignPartnerDto, req.body);
  next();
};

// ── Availability check ───────────────────────────────────────────────────────

const checkAvailabilityDto = z
  .object({
    addressId: z.uuid().optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    scheduledAt: z.string().datetime(),
    serviceId: z.uuid(),
    variantId: z.uuid().optional(),
  })
  .refine(
    (v) => !!v.addressId || (v.latitude != null && v.longitude != null),
    {
      message: "Either addressId or both latitude and longitude are required.",
      path: ["addressId"],
    },
  )
  .refine(
    (v) =>
      !v.addressId ||
      (v.latitude == null && v.longitude == null),
    {
      message: "Provide either addressId or latitude/longitude, not both.",
      path: ["latitude"],
    },
  );

export const checkAvailabilityRequest: RequestHandler = (req, _res, next) => {
  req.body = runZod(checkAvailabilityDto, req.body);
  next();
};
