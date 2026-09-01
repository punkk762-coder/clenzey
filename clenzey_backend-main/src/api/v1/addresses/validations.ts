import type { RequestHandler } from "express";

import z from "zod";

import { RequestValidationError } from "../../../errors/appErrors.ts";
import { formattedErrorDetails } from "../../../utilities/commonUtils.ts";

const phoneRegex = /^\+?[1-9]\d{6,14}$/;
const pincodeRegex = /^\d{4,8}$/;

const addressTypeEnum = z.enum(["HOME", "WORK", "OTHER"]);

const addressFields = {
  accessNotes: z.string().max(500).optional(),
  addressType: addressTypeEnum.optional(),
  city: z.string().min(1).max(100),
  country: z.string().min(1).max(80).optional(),
  label: z.string().min(1).max(50),
  landmark: z.string().max(200).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  pincode: z.string().regex(pincodeRegex, "Invalid pincode"),
  placeId: z.string().min(1).max(200).optional(),
  recipientName: z.string().min(1).max(100).optional(),
  recipientPhone: z.string().regex(phoneRegex, "Invalid phone").optional(),
  setAsDefault: z.boolean().optional(),
  state: z.string().min(1).max(100),
};

const coordsPairCheck = (v: {
  latitude?: number | undefined;
  longitude?: number | undefined;
}) => (v.latitude === undefined) === (v.longitude === undefined);

const createAddressDto = z.object(addressFields).refine(coordsPairCheck, {
  message: "Both latitude and longitude must be provided together",
  path: ["latitude"],
});

const updateAddressDto = z
  .object(addressFields)
  .partial()
  .refine(coordsPairCheck, {
    message: "Both latitude and longitude must be provided together",
    path: ["latitude"],
  });

const runZod = <T>(schema: z.ZodType<T>, data: unknown): T => {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new RequestValidationError(formattedErrorDetails(result.error.issues));
  }
  return result.data;
};

export const createAddressRequest: RequestHandler = (req, _res, next) => {
  req.body = runZod(createAddressDto, req.body);
  next();
};

export const updateAddressRequest: RequestHandler = (req, _res, next) => {
  req.body = runZod(updateAddressDto, req.body);
  next();
};
