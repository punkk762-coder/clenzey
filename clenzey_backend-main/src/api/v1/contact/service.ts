import { ForbiddenError, NotFoundError } from "../../../errors/appErrors.ts";
import * as repo from "./repository.ts";

/**
 * Booking statuses that allow contact information exchange.
 */
const ACTIVE_CONTACT_STATUSES = [
  "PROFESSIONAL_ASSIGNED",
  "PROFESSIONAL_EN_ROUTE",
  "CHECKED_IN",
  "IN_PROGRESS",
] as const;

type ActiveContactStatus = (typeof ACTIVE_CONTACT_STATUSES)[number];

const isActiveContactStatus = (
  status: string,
): status is ActiveContactStatus => {
  return (ACTIVE_CONTACT_STATUSES as readonly string[]).includes(status);
};

/**
 * Get partner contact phone for a consumer's active booking.
 * Validates:
 * - Booking exists
 * - Booking belongs to the requesting consumer
 * - Booking is in an active state with a partner assigned
 */
export const getPartnerContact = async (
  bookingId: string,
  consumerId: string,
): Promise<{ phone: string }> => {
  const booking = await repo.findBookingById(bookingId);
  if (!booking) {
    throw new NotFoundError("Booking not found.");
  }

  // Verify ownership
  if (booking.consumerId !== consumerId) {
    throw new ForbiddenError(
      "You do not have access to this booking's contact information.",
    );
  }

  // Verify active state
  if (!isActiveContactStatus(booking.status)) {
    throw new ForbiddenError(
      "Contact information is only available for active bookings with an assigned partner.",
    );
  }

  // Verify partner is assigned
  if (!booking.partnerId) {
    throw new ForbiddenError(
      "No partner has been assigned to this booking yet.",
    );
  }

  const phone = await repo.findPartnerPhone(booking.partnerId);
  if (!phone) {
    throw new NotFoundError("Partner contact information not available.");
  }

  // Log the contact request
  await repo.insertContactLog({
    bookingId,
    consumerId,
    partnerId: booking.partnerId,
    requestedBy: consumerId,
    requestedByType: "CONSUMER",
  });

  return { phone };
};

/**
 * Get consumer contact phone for a partner's assigned active booking.
 * Validates:
 * - Booking exists
 * - Booking is assigned to the requesting partner
 * - Booking is in an active state
 */
export const getConsumerContact = async (
  bookingId: string,
  partnerId: string,
): Promise<{ phone: string }> => {
  const booking = await repo.findBookingById(bookingId);
  if (!booking) {
    throw new NotFoundError("Booking not found.");
  }

  // Verify the booking is assigned to this partner
  if (!booking.partnerId || booking.partnerId !== partnerId) {
    throw new ForbiddenError(
      "You are not assigned to this booking.",
    );
  }

  // Verify active state
  if (!isActiveContactStatus(booking.status)) {
    throw new ForbiddenError(
      "Contact information is only available for active bookings.",
    );
  }

  const phone = await repo.findConsumerPhone(booking.consumerId);
  if (!phone) {
    throw new NotFoundError("Consumer contact information not available.");
  }

  // Log the contact request
  await repo.insertContactLog({
    bookingId,
    consumerId: booking.consumerId,
    partnerId,
    requestedBy: partnerId,
    requestedByType: "PARTNER",
  });

  return { phone };
};
