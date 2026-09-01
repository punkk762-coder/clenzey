import type { RequestHandler } from "express";

import z from "zod";

import { RequestValidationError } from "../../../errors/appErrors.ts";
import { formattedErrorDetails } from "../../../utilities/commonUtils.ts";

const runZod = <T>(schema: z.ZodType<T>, data: unknown): T => {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new RequestValidationError(
      formattedErrorDetails(result.error.issues),
    );
  }
  return result.data;
};

const firebaseAuthDto = z.object({
  fullName: z.string().min(2).max(100).optional(),
  idToken: z.string().min(1),
});

export const firebaseAuthRequest: RequestHandler = (req, _res, next) => {
  runZod(firebaseAuthDto, req.body);
  next();
};

// ── Availability & location ─────────────────────────────────────────────────

const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;

const createAvailabilityDto = z
  .object({
    dayOfWeek: z.enum(DAYS),
    endHour: z.number().int().min(1).max(24),
    startHour: z.number().int().min(0).max(23),
  })
  .refine((v) => v.endHour > v.startHour, {
    message: "endHour must be greater than startHour",
    path: ["endHour"],
  });

const locationPingDto = z.object({
  heading: z.number().min(0).max(360).optional(),
  isOnline: z.boolean().optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  speed: z.number().min(0).optional(),
});

const onlineStatusDto = z.object({
  isOnline: z.boolean(),
});

const refreshTokenDto = z.object({
  refreshToken: z.string().min(1).optional(),
});

const updatePartnerProfileDto = z
  .object({
    bio: z.string().max(500).nullable().optional(),
    dob: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "dob must be YYYY-MM-DD")
      .nullable()
      .optional(),
    experienceYears: z.number().int().min(0).max(50).nullable().optional(),
    fullName: z.string().min(2).max(100).optional(),
    gender: z.enum(["male", "female", "other"]).nullable().optional(),
    languages: z.array(z.string().trim().min(2).max(20)).max(10).optional(),
    profileImage: z.string().url().nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one profile field is required.",
  });

export const createAvailabilityRequest: RequestHandler = (req, _res, next) => {
  req.body = runZod(createAvailabilityDto, req.body);
  next();
};

export const locationPingRequest: RequestHandler = (req, _res, next) => {
  req.body = runZod(locationPingDto, req.body);
  next();
};

export const onlineStatusRequest: RequestHandler = (req, _res, next) => {
  req.body = runZod(onlineStatusDto, req.body);
  next();
};

export const refreshTokenRequest: RequestHandler = (req, _res, next) => {
  runZod(refreshTokenDto, req.body ?? {});
  next();
};

export const updatePartnerProfileRequest: RequestHandler = (req, _res, next) => {
  req.body = runZod(updatePartnerProfileDto, req.body);
  next();
};
