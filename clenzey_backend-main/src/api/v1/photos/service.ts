import { BadRequestError, NotFoundError } from "../../../errors/appErrors.ts";
import {
  assertBookingAccess,
  type BookingAccessContext,
} from "../../../utilities/bookingAccessControl.ts";
import * as bookingsRepo from "../bookings/repository.ts";
import * as repo from "./repository.ts";

// ── Constants ────────────────────────────────────────────────────────────────

const MAX_PHOTOS_PER_BOOKING = 20;

// ── Types ────────────────────────────────────────────────────────────────────

export type UploadPhotoInput = {
  bookingId: string;
  fileUrl: string;
  partnerId: string;
  type: "BEFORE" | "AFTER";
};

// ── Service Functions ────────────────────────────────────────────────────────

/**
 * Upload a photo for a booking.
 * Validates:
 * - Booking exists and belongs to the partner
 * - Booking is in a valid status for the photo type:
 *   - BEFORE photos: CHECKED_IN or IN_PROGRESS
 *   - AFTER photos: IN_PROGRESS only
 * - Total photo count does not exceed 20
 */
export const uploadPhoto = async (
  input: UploadPhotoInput,
): Promise<repo.BookingPhotoRecord> => {
  // 1. Validate booking exists
  const booking = await bookingsRepo.findBookingById(input.bookingId);
  if (!booking) {
    throw new NotFoundError("Booking not found.");
  }

  // 2. Validate booking is assigned to the partner
  if (booking.partnerId !== input.partnerId) {
    throw new BadRequestError(
      "You are not assigned to this booking.",
    );
  }

  // 3. Validate booking status matches photo type
  if (input.type === "BEFORE") {
    if (booking.status !== "CHECKED_IN" && booking.status !== "IN_PROGRESS") {
      throw new BadRequestError(
        "Before photos can only be uploaded when booking is in CHECKED_IN or IN_PROGRESS status.",
      );
    }
  } else if (input.type === "AFTER") {
    if (booking.status !== "IN_PROGRESS") {
      throw new BadRequestError(
        "After photos can only be uploaded when booking is in IN_PROGRESS status.",
      );
    }
  }

  // 4. Validate total photo count limit
  const currentCount = await repo.countByBookingId(input.bookingId);
  if (currentCount >= MAX_PHOTOS_PER_BOOKING) {
    throw new BadRequestError(
      `Maximum of ${MAX_PHOTOS_PER_BOOKING} photos per booking has been reached.`,
    );
  }

  // 5. Insert photo record
  const photo = await repo.insertPhoto({
    bookingId: input.bookingId,
    fileUrl: input.fileUrl,
    type: input.type,
    uploadedBy: input.partnerId,
  });

  return photo;
};

/**
 * List all photos for a booking.
 * Caller must have access to the booking (consumer, assigned partner, or admin).
 */
export const listPhotos = async (
  bookingId: string,
  ctx: BookingAccessContext,
): Promise<repo.BookingPhotoRecord[]> => {
  const booking = await bookingsRepo.findBookingById(bookingId);
  if (!booking) {
    throw new NotFoundError("Booking not found.");
  }

  assertBookingAccess(booking, ctx);
  return await repo.listByBookingId(bookingId);
};

/**
 * Get photo count for a booking, optionally filtered by type.
 */
export const getPhotoCount = async (
  bookingId: string,
  type?: "BEFORE" | "AFTER",
): Promise<number> => {
  if (type) {
    return await repo.countByBookingIdAndType(bookingId, type);
  }
  return await repo.countByBookingId(bookingId);
};
