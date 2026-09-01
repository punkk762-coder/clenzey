import type { RequestHandler } from "express";

import { HttpStatusCode } from "axios";

import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from "../../../errors/appErrors.ts";
import { sendResponse, tryCatchUtil } from "../../../utilities/commonUtils.ts";
import { resolveCouponValidationContext } from "../bookings/service.ts";
import * as couponsService from "./service.ts";

export const createCoupon: RequestHandler = tryCatchUtil(async (req, res) => {
  const coupon = await couponsService.createCoupon(req.body);
  return sendResponse(res, {
    data: { coupon },
    statusCode: HttpStatusCode.Created,
  });
});

export const updateCoupon: RequestHandler = tryCatchUtil(async (req, res) => {
  const id = req.params["couponId"] as string;
  const coupon = await couponsService.updateCoupon(id, req.body);
  return sendResponse(res, { data: { coupon } });
});

export const listOffers: RequestHandler = tryCatchUtil(async (req, res) => {
  const q = (req as unknown as { validatedQuery: { limit: number } })
    .validatedQuery;
  const offers = await couponsService.listActiveOffers(q);
  return sendResponse(res, { data: { offers } });
});

export const listCoupons: RequestHandler = tryCatchUtil(async (req, res) => {
  const q = (req as unknown as {
    validatedQuery: { activeOnly: boolean; limit: number; offset: number };
  }).validatedQuery;
  const coupons = await couponsService.listCoupons(q);
  return sendResponse(res, {
    data: { coupons, limit: q.limit, offset: q.offset },
  });
});

export const getCoupon: RequestHandler = tryCatchUtil(async (req, res) => {
  const id = req.params["couponId"] as string;
  const coupon = await couponsService.getCouponById(id);
  if (!coupon) throw new NotFoundError("Coupon not found.");
  return sendResponse(res, { data: { coupon } });
});

type ValidateCouponBody = {
  addonIds?: string[];
  addressId?: string;
  amount?: number;
  code: string;
  serviceCategory?: string;
  serviceId?: string;
  subVariantId?: string;
  variantId?: string;
};

export const validateCoupon: RequestHandler = tryCatchUtil(async (req, res) => {
  const consumerId = req.user?.sub;
  if (!consumerId) throw new UnauthorizedError();

  const body = req.body as ValidateCouponBody;
  let amount = body.amount;
  let serviceCategory = body.serviceCategory;
  let serviceId = body.serviceId;

  if (body.serviceId && body.variantId && body.addressId) {
    const resolved = await resolveCouponValidationContext({
      addressId: body.addressId,
      consumerId,
      serviceId: body.serviceId,
      variantId: body.variantId,
      ...(body.addonIds !== undefined && { addonIds: body.addonIds }),
      ...(body.subVariantId !== undefined && { subVariantId: body.subVariantId }),
    });
    amount = resolved.amount;
    serviceCategory = resolved.serviceCategory;
    serviceId = resolved.serviceId;
  }

  if (amount === undefined) {
    throw new BadRequestError(
      "Either amount or booking context (serviceId, variantId, addressId) is required.",
    );
  }

  const result = await couponsService.validateCouponForBooking(body.code, {
    amount,
    consumerId,
    ...(serviceCategory && { serviceCategory }),
    ...(serviceId && { serviceId }),
  });

  return sendResponse(res, {
    data: {
      ...result,
      valid: true,
      coupon: result,
    },
  });
});
