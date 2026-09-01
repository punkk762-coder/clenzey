import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "../../../errors/appErrors.ts";
import {
  createPresignedImageUpload,
  type PresignedImageUploadResult,
  type UploadPurpose,
} from "../../../services/s3PresignService.ts";
import * as bookingsRepo from "../bookings/repository.ts";
import { PURPOSE_ALLOWED_ROLES, type PresignUploadBody } from "./validations.ts";

export type PresignUploadInput = PresignUploadBody & {
  userId: string;
  userType: string;
};

export const assertPurposeAccess = (
  purpose: UploadPurpose,
  userType: string,
): void => {
  const allowedRoles = PURPOSE_ALLOWED_ROLES[purpose];
  if (!allowedRoles.includes(userType)) {
    throw new ForbiddenError("You are not allowed to upload for this purpose.");
  }
};

export const presignUpload = async (
  input: PresignUploadInput,
): Promise<PresignedImageUploadResult> => {
  assertPurposeAccess(input.purpose, input.userType);

  if (
    (input.purpose === "booking_photo" || input.purpose === "dispute_evidence") &&
    input.bookingId
  ) {
    const booking = await bookingsRepo.findBookingById(input.bookingId);
    if (!booking) {
      throw new NotFoundError("Booking not found.");
    }

    if (input.purpose === "booking_photo") {
      if (booking.partnerId !== input.userId) {
        throw new BadRequestError("You are not assigned to this booking.");
      }
    } else if (input.userType === "CONSUMER") {
      if (booking.consumerId !== input.userId) {
        throw new BadRequestError("You do not have access to this booking.");
      }
    } else if (booking.partnerId !== input.userId) {
      throw new BadRequestError("You are not assigned to this booking.");
    }
  }

  return await createPresignedImageUpload({
    contentType: input.contentType,
    purpose: input.purpose,
    userId: input.userId,
    ...(input.bookingId !== undefined && { bookingId: input.bookingId }),
  });
};
