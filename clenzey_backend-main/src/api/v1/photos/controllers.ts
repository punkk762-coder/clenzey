import type { RequestHandler } from "express";

import { HttpStatusCode } from "axios";

import { UnauthorizedError } from "../../../errors/appErrors.ts";
import type { BookingAccessActorType } from "../../../utilities/bookingAccessControl.ts";
import { sendResponse, tryCatchUtil } from "../../../utilities/commonUtils.ts";
import * as photosService from "./service.ts";

const toAccessContext = (user: {
  sub: string;
  userType: string;
}) => ({
  actorType: user.userType as BookingAccessActorType,
  userId: user.sub,
});

/**
 * Upload a photo for a booking.
 * Requires PARTNER auth — the partner must be assigned to the booking.
 */
export const uploadPhoto: RequestHandler = tryCatchUtil(async (req, res) => {
  const partnerId = req.user?.sub;
  if (!partnerId) throw new UnauthorizedError();

  const bookingId = req.params["id"] as string;
  const { fileUrl, type } = req.body as {
    fileUrl: string;
    type: "BEFORE" | "AFTER";
  };

  const photo = await photosService.uploadPhoto({
    bookingId,
    fileUrl,
    partnerId,
    type,
  });

  return sendResponse(res, {
    data: { photo },
    statusCode: HttpStatusCode.Created,
  });
});

/**
 * List all photos for a booking.
 * Accessible by CONSUMER, PARTNER, or ADMIN.
 */
export const listPhotos: RequestHandler = tryCatchUtil(async (req, res) => {
  const userId = req.user?.sub;
  if (!userId) throw new UnauthorizedError();

  const bookingId = req.params["id"] as string;
  const photos = await photosService.listPhotos(
    bookingId,
    toAccessContext(req.user!),
  );

  return sendResponse(res, { data: { photos } });
});
