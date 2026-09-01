import { UnauthorizedError } from "../errors/appErrors.ts";

export type BookingAccessActorType = "ADMIN" | "CONSUMER" | "PARTNER";

export type BookingAccessContext = {
  actorType: BookingAccessActorType;
  userId?: string;
};

export const assertBookingAccess = (
  booking: { consumerId: string; partnerId: null | string },
  ctx: BookingAccessContext,
): void => {
  if (ctx.actorType === "ADMIN") return;
  if (ctx.actorType === "CONSUMER" && booking.consumerId === ctx.userId) return;
  if (
    ctx.actorType === "PARTNER" &&
    booking.partnerId &&
    booking.partnerId === ctx.userId
  ) {
    return;
  }
  throw new UnauthorizedError("You do not have access to this booking.");
};
