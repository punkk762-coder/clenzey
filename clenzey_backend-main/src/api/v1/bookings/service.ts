import type { SubscriptionPlan } from "../../../configs/pricingConfig.ts";

import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from "../../../errors/appErrors.ts";
import { bookingEvents } from "../../../realtime/bookingEvents.ts";
import * as couponsService from "../coupons/service.ts";
import * as notificationsService from "../notifications/service.ts";
import * as partnersRepo from "../partners/repository.ts";
import * as reviewsRepo from "../reviews/repository.ts";
import { buildReviewStatus } from "../reviews/service.ts";
import * as disputesRepo from "../disputes/repository.ts";
import { buildDisputeStatus } from "../disputes/service.ts";
import * as photosService from "../photos/service.ts";
import * as servicesRepo from "../services/repository.ts";
import {
  computeLargeOfficeBasePrice,
  type LargeOfficeScope,
} from "../services/largeOfficePricing.ts";
import * as servicesService from "../services/service.ts";
import * as skillsRepo from "../skills/repository.ts";
import * as slotsService from "../slots/service.ts";
import * as zonePricingService from "../zones/pricingService.ts";
import * as zonesService from "../zones/service.ts";
import { findNearestPartners } from "./partnerMatcher.ts";
import * as maskedCallService from "./maskedCallService.ts";
import { computePricing, type PricingBreakdown } from "./pricing.ts";
import { resolvePlatformPricingRates } from "../platformPricing/service.ts";
import { parseMoney } from "../../../utilities/moneyUtils.ts";
import * as repo from "./repository.ts";
import { resolveDispatchStatus } from "./dispatchStatus.ts";
import {
  assertBookingAccess,
  type BookingAccessContext,
} from "../../../utilities/bookingAccessControl.ts";
import {
  type ActorType,
  type BookingStatus,
  canTransition,
  isTerminal,
  validTransitionsFromForActor,
} from "./stateMachine.ts";
import type { CorporateDetailsJson } from "../../../db/schema/bookings.ts";
import { withUniqueCheckInCode } from "./checkInCode.ts";
import { sanitizeBookingCheckInCode, sanitizeBookingsCheckInCode } from "./sanitizeBooking.ts";
import * as locationStream from "./locationStream.ts";
import { emitPartnerOperationalStatus } from "../partners/operationalStatus.ts";

const PROPOSAL_TTL_SEC = 30;

const DEFAULT_DURATION_MIN_BY_VARIANT_VALUE: Record<string, number> = {
  "30": 30,
  "60": 60,
  "90": 90,
  "1bhk": 120,
  "2bhk": 180,
  "3bhk": 240,
  "4bhk": 300,
  "1BHK": 120,
  "2BHK": 180,
  "3BHK": 240,
  "4BHK": 300,
  emp_1_10: 120,
  emp_11_25: 180,
  emp_26_50: 240,
  emp_51_100: 300,
  emp_100_plus: 360,
};

const formatAddress = (
  addr: NonNullable<Awaited<ReturnType<typeof repo.findAddressById>>>,
): string => {
  return [
    addr.line1,
    addr.line2,
    addr.landmark,
    addr.city,
    addr.state,
    addr.pincode,
  ]
    .filter(Boolean)
    .join(", ");
};

const toBookingAddressResponse = (
  addr: NonNullable<Awaited<ReturnType<typeof repo.findAddressById>>>,
) => {
  const latitude = addr.latitude != null ? Number(addr.latitude) : undefined;
  const longitude = addr.longitude != null ? Number(addr.longitude) : undefined;

  return {
    city: addr.city,
    label: addr.label,
    landmark: addr.landmark ?? undefined,
    latitude: Number.isFinite(latitude) ? latitude : undefined,
    line1: addr.line1,
    line2: addr.line2 ?? undefined,
    longitude: Number.isFinite(longitude) ? longitude : undefined,
    pincode: addr.pincode,
    state: addr.state,
  };
};

type ResolvedBookingContext = {
  addons: { id: string; name: string; price: number }[];
  address: NonNullable<Awaited<ReturnType<typeof repo.findAddressById>>>;
  basePrice: number;
  consumer: NonNullable<
    Awaited<ReturnType<typeof repo.findConsumerProfileById>>
  >;
  estimatedDurationMin: number;
  estimatedTeam?: number;
  scheduledAt: Date;
  service: NonNullable<Awaited<ReturnType<typeof servicesRepo.findServiceById>>>;
  subVariantId?: string;
  subVariantLabel?: string;
  variant: NonNullable<
    Awaited<ReturnType<typeof servicesService.findVariantInService>>
  >;
};

type ResolveInput = {
  addonIds?: string[];
  addressId: string;
  bookingType: "INSTANT" | "SCHEDULED";
  consumerId: string;
  largeOfficeScope?: LargeOfficeScope;
  scheduledAt?: string;
  serviceId: string;
  subVariantId?: string;
  variantId: string;
};

const assertValidPricingBreakdown = (breakdown: PricingBreakdown): void => {
  if (
    !Number.isFinite(breakdown.basePrice) ||
    !Number.isFinite(breakdown.totalAmount) ||
    breakdown.basePrice <= 0 ||
    breakdown.totalAmount <= 0
  ) {
    throw new BadRequestError(
      "Unable to calculate booking price. Please try again or contact support.",
    );
  }
};

const resolveBookingContext = async (
  input: ResolveInput,
): Promise<ResolvedBookingContext> => {
  if (input.bookingType === "SCHEDULED" && !input.scheduledAt) {
    throw new BadRequestError(
      "scheduledAt is required for SCHEDULED bookings.",
    );
  }
  if (input.bookingType === "SCHEDULED" && input.scheduledAt) {
    if (new Date(input.scheduledAt).getTime() <= Date.now()) {
      throw new BadRequestError("scheduledAt must be in the future.");
    }
  }

  const [service, consumer, address] = await Promise.all([
    servicesRepo.findServiceById(input.serviceId),
    repo.findConsumerProfileById(input.consumerId),
    repo.findAddressById(input.addressId),
  ]);

  if (!service) throw new NotFoundError("Service not found.");
  const variant = service.variants.find((v) => v.id === input.variantId);
  if (!variant) throw new BadRequestError("Invalid variant for this service.");
  if (
    input.largeOfficeScope &&
    (service.category !== "CORPORATE" ||
      variant.value !== "emp_100_plus" ||
      variant.pricingModel !== "INSPECTION")
  ) {
    throw new BadRequestError(
      "Large-office scope is only valid for the 100+ employees option.",
    );
  }
  if (!consumer) throw new NotFoundError("Consumer not found.");
  if (!address || address.consumerId !== input.consumerId)
    throw new BadRequestError("Invalid address for this consumer.");
  if (address.deletedAt) {
    throw new BadRequestError("This address has been deleted. Pick another.");
  }

  // ── Serviceability gate ──────────────────────────────────────────────
  // If the address has coordinates, re-verify that the point is inside a
  // serviceable zone for *this* service. We re-check on booking creation
  // (not just at address-save time) so that zone changes immediately
  // affect new bookings.
  if (address.latitude != null && address.longitude != null) {
    const lat = Number(address.latitude);
    const lng = Number(address.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      const decision = await zonesService.checkServiceability(
        lat,
        lng,
        input.serviceId,
      );
      if (!decision.isServiceable) {
        throw new BadRequestError(
          decision.reason ?? "This service isn't available at this address.",
        );
      }
    }
  } else if (!address.isServiceable) {
    throw new BadRequestError(
      "This address isn't serviceable. Please pick an address inside our coverage area.",
    );
  }

  const requestedAddonIds = input.addonIds ?? [];
  const addons = requestedAddonIds.length > 0
    ? service.addons.filter((a) => requestedAddonIds.includes(a.id))
    : [];
  if (addons.length !== requestedAddonIds.length) {
    throw new BadRequestError(
      "One or more add-ons are invalid for this service.",
    );
  }

  let basePrice: number;
  let largeOfficeDurationMin: number | undefined;
  let largeOfficeEstimatedTeam: number | undefined;
  let subVariantId: string | undefined;
  let subVariantLabel: string | undefined;

  const subVariants = variant.subVariants ?? [];

  if (subVariants.length > 0) {
    if (!input.subVariantId) {
      throw new BadRequestError(
        "sub_variant_id is required when the selected variant has sub-options.",
      );
    }
    const sv = subVariants.find((s) => s.id === input.subVariantId);
    if (!sv) {
      throw new BadRequestError("Invalid sub_variant_id for this variant.");
    }
    basePrice = parseMoney(sv.discountedPrice ?? sv.basePrice);
    subVariantId = sv.id;
    subVariantLabel = sv.label;
  } else {
    if (input.subVariantId) {
      throw new BadRequestError(
        "sub_variant_id is not applicable for this variant.",
      );
    }
    if (variant.pricingModel === "INSPECTION" && input.largeOfficeScope) {
      const mappedTier = service.variants.find(
        (item) => item.value === "emp_51_100",
      );
      if (!mappedTier) {
        throw new BadRequestError(
          "The reference employee-size tier is not configured for this service.",
        );
      }
      const largeOfficePrice = computeLargeOfficeBasePrice(
        input.largeOfficeScope,
        parseMoney(mappedTier.discountedPrice ?? mappedTier.basePrice),
        mappedTier.label,
      );
      basePrice = largeOfficePrice.computedBasePrice;
      largeOfficeDurationMin = largeOfficePrice.estimatedDurationMin;
      largeOfficeEstimatedTeam = largeOfficePrice.estimatedTeam;
    } else {
      basePrice = parseMoney(variant.discountedPrice ?? variant.basePrice);
    }
  }

  // ── Zone-based price override ─────────────────────────────────────────
  // If the address has coordinates, check for a zone-specific price override.
  // If one exists, use the override price instead of the global variant price.
  if (
    !input.largeOfficeScope &&
    address.latitude != null &&
    address.longitude != null
  ) {
    const lat = Number(address.latitude);
    const lng = Number(address.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      try {
        const resolved = await zonePricingService.resolveBasePrice(
          input.serviceId,
          input.variantId,
          lat,
          lng,
        );
        if (resolved.isOverride) {
          basePrice = resolved.basePrice;
        }
      } catch {
        // Zone pricing is a graceful enhancement — if resolution fails,
        // continue with the already-determined global base price.
      }
    }
  }

  if (!Number.isFinite(basePrice) || basePrice <= 0) {
    throw new BadRequestError(
      "Selected service option has an invalid price. Please choose another option or contact support.",
    );
  }

  const estimatedDurationMin =
    largeOfficeDurationMin ??
    variant.estimatedDurationMin ??
    DEFAULT_DURATION_MIN_BY_VARIANT_VALUE[variant.value] ??
    60;

  const scheduledAt = input.scheduledAt
    ? new Date(input.scheduledAt)
    : new Date();

  return {
    addons: addons.map((a) => ({
      id: a.id,
      name: a.name,
      price: parseMoney(a.discountedPrice ?? a.price),
    })),
    address,
    basePrice,
    consumer,
    estimatedDurationMin,
    ...(largeOfficeEstimatedTeam !== undefined && {
      estimatedTeam: largeOfficeEstimatedTeam,
    }),
    scheduledAt,
    service,
    ...(subVariantId !== undefined && { subVariantId }),
    ...(subVariantLabel !== undefined && { subVariantLabel }),
    variant,
  };
};

export const resolveCouponValidationContext = async (input: {
  addonIds?: string[];
  addressId: string;
  consumerId: string;
  serviceId: string;
  subVariantId?: string;
  variantId: string;
}) => {
  const ctx = await resolveBookingContext({
    addressId: input.addressId,
    bookingType: "INSTANT",
    consumerId: input.consumerId,
    serviceId: input.serviceId,
    variantId: input.variantId,
    ...(input.addonIds !== undefined && { addonIds: input.addonIds }),
    ...(input.subVariantId !== undefined && { subVariantId: input.subVariantId }),
  });

  return {
    amount:
      ctx.basePrice + ctx.addons.reduce((sum, addon) => sum + addon.price, 0),
    serviceCategory: ctx.service.category,
    serviceId: ctx.service.id,
  };
};

export type PreviewBookingInput = {
  addonIds?: string[];
  addressId: string;
  bookingType: "INSTANT" | "SCHEDULED";
  consumerId: string;
  corporateDetails?: CorporateDetailsJson;
  couponCode?: string;
  largeOfficeScope?: LargeOfficeScope;
  scheduledAt?: string;
  serviceId: string;
  subVariantId?: string;
  subscriptionPlan?: SubscriptionPlan;
  variantId: string;
};

export type PreviewResult = {
  breakdown: PricingBreakdown;
  estimatedDurationMin: number;
  scheduledAt: string;
};

export const previewBooking = async (
  input: PreviewBookingInput,
): Promise<PreviewResult> => {
  if (
    input.largeOfficeScope &&
    (input.subscriptionPlan ?? "ONE_TIME") !==
      input.largeOfficeScope.cleaningFrequency
  ) {
    throw new BadRequestError(
      "Cleaning frequency must match the selected subscription plan.",
    );
  }
  const ctx = await resolveBookingContext(input);

  assertCorporateBookingInput(
    ctx.service.category,
    ctx.variant,
    input.corporateDetails,
    input.largeOfficeScope,
  );

  const surgeMultiplier = 1;

  const subscriptionPlan: SubscriptionPlan = input.subscriptionPlan ?? "ONE_TIME";

  const preCouponSubtotal = ctx.basePrice +
    ctx.addons.reduce((s, a) => s + a.price, 0);

  let appliedCoupon: { code: string; discount: number } | undefined;
  if (input.couponCode) {
    const result = await couponsService.validateCouponForBooking(
      input.couponCode,
      {
        amount: preCouponSubtotal,
        consumerId: input.consumerId,
        serviceCategory: ctx.service.category,
        serviceId: ctx.service.id,
      },
    );
    appliedCoupon = { code: result.code, discount: result.discount };
  }

  const rates = await resolvePlatformPricingRates();

  const breakdown = computePricing({
    addons: ctx.addons.map((a) => ({ name: a.name, price: a.price })),
    ...(appliedCoupon && { appliedCoupon }),
    basePrice: ctx.basePrice,
    rates,
    subscriptionPlan,
    subVariantPrice: 0,
    surgeMultiplier,
  });

  assertValidPricingBreakdown(breakdown);

  return {
    breakdown,
    estimatedDurationMin: ctx.estimatedDurationMin,
    scheduledAt: ctx.scheduledAt.toISOString(),
  };
};

export type CreateBookingInput = {
  addonIds?: string[];
  addressId: string;
  bookingName?: string;
  bookingType: "INSTANT" | "SCHEDULED";
  consumerId: string;
  consumerNotes?: string;
  corporateDetails?: CorporateDetailsJson;
  couponCode?: string;
  largeOfficeScope?: LargeOfficeScope;
  paymentMode?: string;
  scheduledAt?: string;
  serviceId: string;
  subVariantId?: string;
  subscriptionPlan?: SubscriptionPlan;
  timeSlotId?: string;
  variantId: string;
};

export const assertCorporateBookingInput = (
  serviceCategory: string,
  variant: { pricingModel?: string },
  corporateDetails?: CorporateDetailsJson,
  largeOfficeScope?: LargeOfficeScope,
) => {
  if (serviceCategory !== "CORPORATE") {
    if (corporateDetails) {
      throw new BadRequestError(
        "corporateDetails is only valid for corporate bookings.",
      );
    }
    return;
  }

  if (!corporateDetails) {
    throw new BadRequestError(
      "corporateDetails is required for corporate bookings.",
    );
  }

  if (variant.pricingModel === "INSPECTION" && !largeOfficeScope) {
    throw new BadRequestError(
      "This office size requires a custom quotation. Please request a quote instead of booking directly.",
    );
  }
};

export const createBooking = async (input: CreateBookingInput) => {
  if (
    input.largeOfficeScope &&
    (input.subscriptionPlan ?? "ONE_TIME") !==
      input.largeOfficeScope.cleaningFrequency
  ) {
    throw new BadRequestError(
      "Cleaning frequency must match the selected subscription plan.",
    );
  }
  const ctx = await resolveBookingContext(input);

  assertCorporateBookingInput(
    ctx.service.category,
    ctx.variant,
    input.corporateDetails,
    input.largeOfficeScope,
  );

  const surgeMultiplier = 1;

  const subscriptionPlan: SubscriptionPlan = input.subscriptionPlan ?? "ONE_TIME";

  const preCouponSubtotal = ctx.basePrice +
    ctx.addons.reduce((s, a) => s + a.price, 0);

  let appliedCoupon:
    | { code: string; couponId: string; discount: number }
    | undefined;
  if (input.couponCode) {
    const result = await couponsService.validateCouponForBooking(
      input.couponCode,
      {
        amount: preCouponSubtotal,
        consumerId: input.consumerId,
        serviceCategory: ctx.service.category,
        serviceId: ctx.service.id,
      },
    );
    appliedCoupon = {
      code: result.code,
      couponId: result.couponId,
      discount: result.discount,
    };
  }

  const rates = await resolvePlatformPricingRates();

  const breakdown = computePricing({
    addons: ctx.addons.map((a) => ({ name: a.name, price: a.price })),
    ...(appliedCoupon && {
      appliedCoupon: { code: appliedCoupon.code, discount: appliedCoupon.discount },
    }),
    basePrice: ctx.basePrice,
    rates,
    subscriptionPlan,
    subVariantPrice: 0,
    surgeMultiplier,
  });

  assertValidPricingBreakdown(breakdown);

  // ── Reserve slot for SCHEDULED bookings ─────────────────────────────────
  let reservedSlotId: null | string = null;
  let effectiveScheduledAt = ctx.scheduledAt;
  if (input.bookingType === "SCHEDULED" && input.timeSlotId) {
    const reserved = await slotsService.tryReserveSlot(input.timeSlotId);
    if (!reserved) {
      throw new BadRequestError(
        "This time slot is no longer available. Please pick another slot.",
      );
    }
    if (reserved.serviceId !== input.serviceId) {
      await slotsService.releaseSlot(input.timeSlotId);
      throw new BadRequestError("Slot does not belong to this service.");
    }
    reservedSlotId = reserved.id;
    effectiveScheduledAt = reserved.startAt;
  }

  const scheduledEndAtDate =
    input.bookingType === "SCHEDULED"
      ? new Date(
          effectiveScheduledAt.getTime() + ctx.estimatedDurationMin * 60 * 1000,
        )
      : null;

  const bookingNumber = await repo.generateBookingNumber();

  let booking;
  try {
    booking = await withUniqueCheckInCode(async (checkInCode) =>
      repo.insertBooking({
      addonsTotal: String(breakdown.addonsTotal),
      addressId: input.addressId,
      addressSnapshot: formatAddress(ctx.address),
      basePrice: String(breakdown.basePrice),
      bookingNumber,
      bookingType: input.bookingType,
      checkInCode,
      consumerId: input.consumerId,
      consumerName: ctx.consumer.fullName ?? "Consumer",
      consumerNotes: input.consumerNotes,
      consumerPhone: ctx.consumer.phone,
      couponCode: appliedCoupon?.code ?? null,
      discountAmount: String(breakdown.discountAmount),
      estimatedDurationMin: ctx.estimatedDurationMin,
      paymentMode: input.paymentMode,
      platformFee: String(breakdown.platformFee),
      scheduledAt: input.bookingType === "SCHEDULED" ? effectiveScheduledAt : null,
      scheduledEndAt: scheduledEndAtDate,
      serviceId: input.serviceId,
      serviceName: ctx.service.name,
      status: "PENDING",
      subscriptionPlan,
      subtotal: String(breakdown.subtotal),
      surgeAmount: String(breakdown.surgeAmount),
      surgeMultiplier: String(breakdown.surgeMultiplier),
      taxAmount: String(breakdown.taxAmount),
      timeSlotId: reservedSlotId,
      totalAmount: String(breakdown.totalAmount),
      variantId: input.variantId,
      variantLabel: ctx.variant.label,
      subVariantId: ctx.subVariantId ?? null,
      subVariantLabel: ctx.subVariantLabel ?? null,
      bookingName: input.bookingName ?? null,
      corporateDetails:
        ctx.service.category === "CORPORATE" && input.corporateDetails
          ? {
              ...input.corporateDetails,
              ...(input.largeOfficeScope
                ? {
                    estimatedBasePrice: breakdown.basePrice,
                    estimatedTeam: ctx.estimatedTeam,
                    largeOfficeScope: input.largeOfficeScope,
                  }
                : {}),
            }
          : null,
    }),
    );
  } catch (err) {
    if (reservedSlotId) await slotsService.releaseSlot(reservedSlotId);
    throw err;
  }

  await repo.insertBookingAddons(
    ctx.addons.map((a) => ({
      addonId: a.id,
      bookingId: booking.id,
      name: a.name,
      price: String(a.price),
      quantity: 1,
    })),
  );

  await repo.insertStatusHistory({
    actorId: input.consumerId,
    actorType: "CONSUMER",
    bookingId: booking.id,
    fromStatus: null,
    reason: "Booking created",
    toStatus: "PENDING",
  });

  if (appliedCoupon) {
    await couponsService.recordRedemption({
      bookingId: booking.id,
      consumerId: input.consumerId,
      couponId: appliedCoupon.couponId,
      discountAmount: String(appliedCoupon.discount),
    });
    await couponsService.incrementUsage(appliedCoupon.couponId);
  }

  bookingEvents.emitBookingCreated({
    bookingId: booking.id,
    consumerId: booking.consumerId,
    partnerId: booking.partnerId,
    timestamp: new Date().toISOString(),
  });

  return await getBookingById(booking.id, {
    actorType: "CONSUMER",
    userId: input.consumerId,
  });
};

type AccessContext = BookingAccessContext;

export const getBookingById = async (id: string, ctx: AccessContext) => {
  const booking = await repo.findBookingById(id);
  if (!booking) throw new NotFoundError("Booking not found.");
  assertBookingAccess(booking, ctx);

  const [addons, history, existingReview, existingDispute, addressRecord] = await Promise.all([
    repo.findAddonsByBookingId(booking.id),
    repo.findHistoryByBookingId(booking.id),
    reviewsRepo.findByBookingId(booking.id),
    ctx.userId
      ? disputesRepo.findLatestByBookingAndUser(booking.id, ctx.userId)
      : Promise.resolve(null),
    booking.addressId ? repo.findAddressById(booking.addressId) : Promise.resolve(null),
  ]);

  const reviewStatus = buildReviewStatus(booking, existingReview, {
    forConsumer: ctx.actorType === "CONSUMER",
  });

  const disputeStatus = buildDisputeStatus(booking, existingDispute, {
    forUser: ctx.actorType === "CONSUMER" || ctx.actorType === "PARTNER",
    ...(ctx.userId && { userId: ctx.userId }),
    ...(ctx.actorType === "CONSUMER" || ctx.actorType === "PARTNER"
      ? { userType: ctx.actorType }
      : {}),
  });

  // Include partner details (name, phone, rating) if a partner is assigned
  let partnerDetails: {
    avgRating: string | null;
    fullName: string | null;
    phone: string | null;
  } | null = null;

  if (booking.partnerId) {
    const partnerUser = await partnersRepo.findPartnerById(booking.partnerId);
    if (partnerUser && partnerUser.partner) {
      partnerDetails = {
        avgRating: partnerUser.partner.avgRating,
        fullName: partnerUser.partner.fullName,
        // Strip partner's raw phone from consumer-facing responses (Requirement 3.4)
        phone: ctx.actorType === "CONSUMER" ? null : partnerUser.phone,
      };
    }
  }

  return sanitizeBookingCheckInCode(
    {
      ...booking,
      ...(addressRecord ? { address: toBookingAddressResponse(addressRecord) } : {}),
      addons,
      dispatchStatus: resolveDispatchStatus(booking, history),
      disputeStatus,
      history,
      partnerDetails,
      reviewStatus,
    },
    ctx.actorType,
  );
};

export const listBookingsFor = async (filter: {
  actorType: ActorType;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
  partnerId?: string;
  serviceId?: string;
  status?: BookingStatus;
  statuses?: BookingStatus[];
  userId: string;
}) => {
  const where =
    filter.actorType === "CONSUMER"
      ? { consumerId: filter.userId }
      : filter.actorType === "PARTNER"
        ? { partnerId: filter.userId }
        : {};

  const listFilter = {
    ...where,
    ...(filter.status && { status: filter.status }),
    ...(filter.statuses?.length && { statuses: filter.statuses }),
    ...(filter.limit !== undefined && { limit: filter.limit }),
    ...(filter.offset !== undefined && { offset: filter.offset }),
    ...(filter.actorType === "ADMIN" && filter.dateFrom && { dateFrom: filter.dateFrom }),
    ...(filter.actorType === "ADMIN" && filter.dateTo && { dateTo: filter.dateTo }),
    ...(filter.actorType === "ADMIN" && filter.serviceId && { serviceId: filter.serviceId }),
    ...(filter.actorType === "ADMIN" && filter.partnerId && { partnerId: filter.partnerId }),
  };

  const [bookings, total] = await Promise.all([
    repo.listBookings(listFilter),
    repo.countBookings(listFilter),
  ]);

  return {
    bookings: sanitizeBookingsCheckInCode(bookings, filter.actorType),
    total,
  };
};

const LIFECYCLE_TIMESTAMP_KEYS = {
  CHECKED_IN: "checkedInAt",
  COMPLETED: "completedAt",
  CONFIRMED: "confirmedAt",
  IN_PROGRESS: "startedAt",
  PROFESSIONAL_ASSIGNED: "partnerAssignedAt",
  PROFESSIONAL_EN_ROUTE: "enRouteAt",
} as const;

const LIFECYCLE_FIELD: Partial<
  Record<BookingStatus, keyof typeof LIFECYCLE_TIMESTAMP_KEYS>
> = {
  CHECKED_IN: "CHECKED_IN",
  COMPLETED: "COMPLETED",
  CONFIRMED: "CONFIRMED",
  IN_PROGRESS: "IN_PROGRESS",
  PROFESSIONAL_ASSIGNED: "PROFESSIONAL_ASSIGNED",
  PROFESSIONAL_EN_ROUTE: "PROFESSIONAL_EN_ROUTE",
};

export type TransitionInput = {
  actor: ActorType;
  actorId?: string;
  bookingId: string;
  metadata?: Record<string, unknown>;
  reason?: string;
  toStatus: BookingStatus;
};

export const transitionBookingStatus = async (input: TransitionInput) => {
  const booking = await repo.findBookingById(input.bookingId);
  if (!booking) throw new NotFoundError("Booking not found.");

  if (input.actor === "CONSUMER" && booking.consumerId !== input.actorId) {
    throw new UnauthorizedError("Not your booking.");
  }
  if (
    input.actor === "PARTNER" &&
    (!booking.partnerId || booking.partnerId !== input.actorId)
  ) {
    throw new UnauthorizedError("Not assigned to you.");
  }

  if (isTerminal(booking.status)) {
    throw new BadRequestError(
      `Booking is in a terminal state: ${booking.status}.`,
    );
  }

  if (
    input.actor === "PARTNER" &&
    booking.status === "PROFESSIONAL_EN_ROUTE" &&
    input.toStatus === "IN_PROGRESS"
  ) {
    throw new BadRequestError(
      "Use POST /bookings/:id/verify-start to start this job.",
    );
  }

  if (!canTransition(booking.status, input.toStatus, input.actor)) {
    throw new BadRequestError(
      `Cannot transition from ${booking.status} to ${input.toStatus} as ${input.actor}. ` +
        `Allowed next states: ${validTransitionsFromForActor(booking.status, input.actor).join(", ")}`,
    );
  }

  // ── Photo transition gates (partner workflow only) ─────────────────────
  // Before allowing CHECKED_IN → IN_PROGRESS: require >= 1 before-photo
  if (input.toStatus === "IN_PROGRESS" && input.actor === "PARTNER") {
    const beforeCount = await photosService.getPhotoCount(booking.id, "BEFORE");
    if (beforeCount < 1) {
      throw new BadRequestError("At least 1 before-photo is required to start work.");
    }
  }

  // Before allowing IN_PROGRESS → COMPLETED: require >= 1 after-photo
  if (input.toStatus === "COMPLETED" && input.actor === "PARTNER") {
    const afterCount = await photosService.getPhotoCount(booking.id, "AFTER");
    if (afterCount < 1) {
      throw new BadRequestError("At least 1 after-photo is required to complete.");
    }
  }

  const patch: Partial<typeof booking> = { status: input.toStatus };

  const lifecycleKey = LIFECYCLE_FIELD[input.toStatus];
  if (lifecycleKey) {
    const fieldName = LIFECYCLE_TIMESTAMP_KEYS[lifecycleKey];
    (patch as Record<string, unknown>)[fieldName] = new Date();
  }

  if (input.toStatus === "CANCELLED") {
    patch.cancelledAt = new Date();
    patch.cancelledByType = input.actor === "SYSTEM" ? null : input.actor;
    patch.cancelledById = input.actorId ?? null;
    patch.cancellationReason = input.reason ?? null;
    if (booking.timeSlotId) {
      await slotsService.releaseSlot(booking.timeSlotId);
    }
  }

  const updated = await repo.updateBooking(booking.id, patch);

  await repo.insertStatusHistory({
    actorId: input.actorId ?? null,
    actorType: input.actor === "SYSTEM" ? null : input.actor,
    bookingId: booking.id,
    fromStatus: booking.status,
    metadata: input.metadata ?? null,
    reason: input.reason ?? null,
    toStatus: input.toStatus,
  });

  bookingEvents.emitStatusChanged({
    bookingId: updated.id,
    consumerId: updated.consumerId,
    fromStatus: booking.status,
    partnerId: updated.partnerId,
    timestamp: new Date().toISOString(),
    toStatus: input.toStatus,
  });

  // ── In-app notifications for consumer and partner on status changes ─────
  const statusDisplayNames: Partial<Record<BookingStatus, string>> = {
    CANCELLED: "Cancelled",
    CHECKED_IN: "Partner Checked In",
    COMPLETED: "Completed",
    CONFIRMED: "Confirmed",
    IN_PROGRESS: "In Progress",
    PROFESSIONAL_ASSIGNED: "Partner Assigned",
    PROFESSIONAL_EN_ROUTE: "Partner En Route",
  };

  const statusLabel = statusDisplayNames[input.toStatus] ?? input.toStatus;

  // Notify consumer
  await notificationsService.createNotification({
    body: `Your booking ${booking.bookingNumber} status has been updated to ${statusLabel}.`,
    channel: "IN_APP",
    metadata: {
      bookingId: booking.id,
      bookingNumber: booking.bookingNumber,
      toStatus: input.toStatus,
      type: "BOOKING_STATUS_CHANGE",
    },
    recipientId: booking.consumerId,
    recipientType: "CONSUMER",
    title: `Booking ${statusLabel}`,
  });

  // Notify partner (if assigned)
  if (booking.partnerId) {
    await notificationsService.createNotification({
      body: `Booking ${booking.bookingNumber} status has been updated to ${statusLabel}.`,
      channel: "IN_APP",
      metadata: {
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
        toStatus: input.toStatus,
        type: "BOOKING_STATUS_CHANGE",
      },
      recipientId: booking.partnerId,
      recipientType: "PARTNER",
      title: `Booking ${statusLabel}`,
    });
  }

  // ── Push notification to partner on PROFESSIONAL_ASSIGNED ───────────────
  if (
    input.toStatus === "PROFESSIONAL_ASSIGNED" &&
    updated.partnerId &&
    !input.metadata?.["autoAssigned"]
  ) {
    await notificationsService.createNotification({
      body: `You have been assigned to booking ${booking.bookingNumber} for ${booking.serviceName}. Please check your bookings.`,
      channel: "PUSH",
      metadata: {
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
        type: "PARTNER_ASSIGNED",
      },
      recipientId: updated.partnerId,
      recipientType: "PARTNER",
      title: "New Booking Assignment",
    });
  }

  // ── SMS to consumer on PROFESSIONAL_EN_ROUTE ────────────────────────────
  if (input.toStatus === "PROFESSIONAL_EN_ROUTE") {
    await notificationsService.createNotification({
      body: `Your partner is on the way for booking ${booking.bookingNumber}. They will arrive shortly.`,
      channel: "SMS",
      metadata: {
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
        type: "PARTNER_EN_ROUTE",
      },
      recipientId: booking.consumerId,
      recipientType: "CONSUMER",
      title: "Partner En Route",
    });
  }

  // ── Deactivate masked call session on terminal states ───────────────────
  const TERMINAL_STATES_FOR_CALL: BookingStatus[] = [
    "COMPLETED",
    "CANCELLED",
    "NO_SHOW",
    "REFUNDED",
  ];
  if (TERMINAL_STATES_FOR_CALL.includes(input.toStatus)) {
    maskedCallService.deactivateSession(booking.id).catch(() => {
      // Fire-and-forget: deactivation failures should not block the booking transition
    });
    locationStream.stopStalenessMonitor(booking.id);
  }

  if (input.toStatus === "PROFESSIONAL_EN_ROUTE") {
    locationStream.startStalenessMonitor(updated.id, updated.consumerId);
  }

  if (
    updated.partnerId &&
    [
      "PROFESSIONAL_ASSIGNED",
      "PROFESSIONAL_EN_ROUTE",
      "CHECKED_IN",
      "IN_PROGRESS",
      "COMPLETED",
      "CANCELLED",
      "NO_SHOW",
    ].includes(input.toStatus)
  ) {
    void emitPartnerOperationalStatus(updated.partnerId, { force: true });
  }

  return sanitizeBookingCheckInCode(updated, input.actor);
};

export const cancelBooking = async (
  bookingId: string,
  actor: ActorType,
  actorId: string | undefined,
  reason: string | undefined,
) => {
  return await transitionBookingStatus({
    actor,
    ...(actorId && { actorId }),
    bookingId,
    toStatus: "CANCELLED",
    ...(reason && { reason }),
  });
};

// ── Rescheduling ────────────────────────────────────────────────────────────

const MIN_RESCHEDULE_NOTICE_MS = 4 * 60 * 60 * 1000; // 4 hours
const MAX_RESCHEDULES = 2;

export type RescheduleInput = {
  bookingId: string;
  consumerId: string;
  newScheduledAt: string; // ISO timestamp
  timeSlotId?: string | undefined;
};

/**
 * Reschedule a booking to a new time.
 *
 * Validates:
 * 1. Booking exists and belongs to the consumer
 * 2. Booking is in CONFIRMED or PROFESSIONAL_ASSIGNED status
 * 3. newScheduledAt is at least 4 hours from now
 * 4. Reschedule count < 2
 * 5. Target time slot has available capacity (if timeSlotId provided)
 *
 * On success:
 * - Updates scheduledAt and scheduledEndAt on the booking
 * - Records reschedule in status history with RESCHEDULE metadata
 * - Notifies assigned partner if one exists
 */
export const rescheduleBooking = async (input: RescheduleInput) => {
  const { bookingId, consumerId, newScheduledAt, timeSlotId } = input;

  // 1. Validate booking exists and belongs to the consumer
  const booking = await repo.findBookingById(bookingId);
  if (!booking) throw new NotFoundError("Booking not found.");

  if (booking.consumerId !== consumerId) {
    throw new UnauthorizedError("You do not have access to this booking.");
  }

  // 2. Validate booking is in CONFIRMED or PROFESSIONAL_ASSIGNED status
  if (
    booking.status !== "CONFIRMED" &&
    booking.status !== "PROFESSIONAL_ASSIGNED"
  ) {
    throw new BadRequestError(
      `Booking must be in CONFIRMED or PROFESSIONAL_ASSIGNED status to reschedule. Current status: ${booking.status}.`,
    );
  }

  // 3. Validate newScheduledAt is at least 4 hours from now
  const newScheduledDate = new Date(newScheduledAt);
  const minAllowedTime = new Date(Date.now() + MIN_RESCHEDULE_NOTICE_MS);

  if (newScheduledDate.getTime() < minAllowedTime.getTime()) {
    throw new BadRequestError(
      "New scheduled time must be at least 4 hours from now to allow adequate preparation.",
    );
  }

  // 4. Count reschedules from booking_status_history and validate < 2
  const rescheduleCount = await repo.countReschedules(bookingId);
  if (rescheduleCount >= MAX_RESCHEDULES) {
    throw new BadRequestError(
      "Maximum rescheduling limit (2) has been reached for this booking.",
    );
  }

  // 5. Validate time slot capacity if timeSlotId is provided
  let reservedSlotId: null | string = null;
  let effectiveScheduledAt = newScheduledDate;

  if (timeSlotId) {
    const reserved = await slotsService.tryReserveSlot(timeSlotId);
    if (!reserved) {
      throw new BadRequestError(
        "This time slot is no longer available. Please pick another slot.",
      );
    }
    if (reserved.serviceId !== booking.serviceId) {
      await slotsService.releaseSlot(timeSlotId);
      throw new BadRequestError("Slot does not belong to this service.");
    }
    reservedSlotId = reserved.id;
    effectiveScheduledAt = reserved.startAt;
  }

  // Release old slot if one was reserved
  if (booking.timeSlotId) {
    await slotsService.releaseSlot(booking.timeSlotId);
  }

  // Calculate new scheduledEndAt based on estimated duration
  const newScheduledEndAt = new Date(
    effectiveScheduledAt.getTime() + booking.estimatedDurationMin * 60 * 1000,
  );

  // 6. Update scheduledAt and scheduledEndAt on the booking
  const oldScheduledAt = booking.scheduledAt?.toISOString() ?? null;

  const updated = await repo.updateBooking(bookingId, {
    scheduledAt: effectiveScheduledAt,
    scheduledEndAt: newScheduledEndAt,
    ...(reservedSlotId !== null && { timeSlotId: reservedSlotId }),
  });

  // 7. Record in status history with RESCHEDULE metadata
  await repo.insertStatusHistory({
    actorId: consumerId,
    actorType: "CONSUMER",
    bookingId,
    fromStatus: booking.status,
    metadata: {
      type: "RESCHEDULE",
      oldScheduledAt,
      newScheduledAt: effectiveScheduledAt.toISOString(),
      rescheduleCount: rescheduleCount + 1,
    },
    reason: "Booking rescheduled",
    toStatus: booking.status, // status doesn't change on reschedule
  });

  // 8. Notify assigned partner if one exists
  if (booking.partnerId) {
    await notificationsService.createNotification({
      body: `Booking ${booking.bookingNumber} has been rescheduled to ${effectiveScheduledAt.toISOString()}. Please check your schedule.`,
      channel: "PUSH",
      metadata: {
        bookingId,
        bookingNumber: booking.bookingNumber,
        newScheduledAt: effectiveScheduledAt.toISOString(),
        oldScheduledAt,
        type: "BOOKING_RESCHEDULED",
      },
      recipientId: booking.partnerId,
      recipientType: "PARTNER",
      title: "Booking Rescheduled",
    });
  }

  bookingEvents.emitStatusChanged({
    bookingId: updated.id,
    consumerId: updated.consumerId,
    fromStatus: booking.status,
    partnerId: updated.partnerId,
    timestamp: new Date().toISOString(),
    toStatus: booking.status,
  });

  return updated;
};

// ── Assignments ─────────────────────────────────────────────────────────────

export const proposeForBooking = async (
  bookingId: string,
  opts: { latitude: number; limit?: number; longitude: number },
) => {
  const candidates = await findNearestPartners({
    latitude: opts.latitude,
    limit: opts.limit ?? 3,
    longitude: opts.longitude,
  });

  const expiresAt = new Date(Date.now() + PROPOSAL_TTL_SEC * 1000);

  const inserted = await Promise.all(
    candidates.map((c) =>
      repo.insertAssignment({
        bookingId,
        distanceMeters: c.distanceMeters,
        expiresAt,
        partnerId: c.partnerId,
        status: "PROPOSED",
      }),
    ),
  );

  return inserted;
};

export const acceptAssignment = async (
  assignmentId: string,
  partnerId: string,
) => {
  const accepted = await repo.respondToAssignment(assignmentId, "ACCEPTED");
  if (!accepted) {
    throw new BadRequestError(
      "Assignment is no longer open (already accepted, declined, or expired).",
    );
  }
  if (accepted.partnerId !== partnerId) {
    throw new BadRequestError("Not your assignment.");
  }

  const booking = await repo.findBookingById(accepted.bookingId);
  if (!booking) throw new NotFoundError("Booking not found.");

  if (booking.partnerId && booking.partnerId !== partnerId) {
    return accepted;
  }

  await repo.updateBooking(booking.id, { partnerId });

  await transitionBookingStatus({
    actor: "SYSTEM",
    bookingId: booking.id,
    metadata: { assignmentId, partnerId },
    reason: "Partner accepted assignment",
    toStatus: "PROFESSIONAL_ASSIGNED",
  });

  return accepted;
};

export const declineAssignment = async (
  assignmentId: string,
  partnerId: string,
  reason?: string,
) => {
  const declined = await repo.respondToAssignment(
    assignmentId,
    "DECLINED",
    reason,
  );
  if (!declined) {
    throw new BadRequestError("Assignment is no longer open.");
  }
  if (declined.partnerId !== partnerId) {
    throw new BadRequestError("Not your assignment.");
  }
  return declined;
};

export const listOpenAssignmentsForPartner = async (partnerId: string) => {
  const rows = await repo.listOpenAssignmentsForPartnerWithBookings(partnerId);
  return rows.map(toPartnerAssignmentResponse);
};

export const getAssignmentForPartner = async (
  assignmentId: string,
  partnerId: string,
) => {
  const row = await repo.findAssignmentForPartner(assignmentId, partnerId);
  if (!row) {
    throw new NotFoundError("Assignment not found.");
  }
  return toPartnerAssignmentResponse(row);
};

function toPartnerAssignmentResponse(row: {
  assignment: repo.AssignmentRecord;
  booking: repo.BookingRecord;
}) {
  const { assignment, booking } = row;
  return {
    id: assignment.id,
    bookingId: assignment.bookingId,
    partnerId: assignment.partnerId,
    status: assignment.status,
    ...(assignment.declineReason ? { declineReason: assignment.declineReason } : {}),
    createdAt: assignment.createdAt.toISOString(),
    booking: {
      id: booking.id,
      consumerId: booking.consumerId,
      serviceId: booking.serviceId,
      variantId: booking.variantId,
      addressId: booking.addressId,
      bookingType: booking.bookingType,
      status: booking.status,
      paymentMode: booking.paymentMode,
      paymentStatus: booking.paymentStatus,
      totalAmount: parseMoney(booking.totalAmount),
      bookingNumber: booking.bookingNumber,
      serviceName: booking.serviceName,
      bookingName: booking.bookingName,
      scheduledAt: booking.scheduledAt?.toISOString() ?? null,
      consumerNotes: booking.consumerNotes,
      addressSnapshot: booking.addressSnapshot,
      createdAt: booking.createdAt.toISOString(),
      updatedAt: booking.updatedAt.toISOString(),
    },
  };
};

// ── Re-dispatch Logic ───────────────────────────────────────────────────────

const INITIAL_SEARCH_RADIUS_METERS = 5000; // 5km default
const RADIUS_INCREMENT_METERS = 2000; // 2km increments per re-dispatch
const MAX_SEARCH_RADIUS_METERS = 15000; // 15km max

export type ReDispatchInput = {
  bookingId: string;
  currentRadiusMeters?: number;
};

export type ReDispatchResult = {
  candidatesProposed: number;
  maxRadiusReached: boolean;
  newRadiusMeters: number;
  status: "ACCEPTED_ALREADY" | "DISPATCHED" | "NO_CANDIDATES" | "BOOKING_NOT_ELIGIBLE";
};

/**
 * Re-dispatch a booking to new partners when no one accepts within the expiry window.
 *
 * This function:
 * 1. Checks if the booking already has an accepted assignment → early return
 * 2. Expires any stale PROPOSED assignments
 * 3. Notifies the consumer that a partner is being searched
 * 4. Expands the search radius by 2km (up to 15km max)
 * 5. Finds new candidates (excluding previously proposed partners)
 * 6. Creates new assignment proposals for those candidates
 *
 * Can be triggered by any mechanism: cron job, webhook, or manual admin action.
 */
export const reDispatchBooking = async (
  input: ReDispatchInput,
): Promise<ReDispatchResult> => {
  const { bookingId } = input;
  const currentRadius = input.currentRadiusMeters ?? INITIAL_SEARCH_RADIUS_METERS;

  // 1. Verify booking exists and is in a dispatchable state
  const booking = await repo.findBookingById(bookingId);
  if (!booking) throw new NotFoundError("Booking not found.");

  // Only dispatch for bookings that are PENDING or CONFIRMED and don't yet have a partner
  if (booking.partnerId || !["PENDING", "CONFIRMED"].includes(booking.status)) {
    return {
      candidatesProposed: 0,
      maxRadiusReached: false,
      newRadiusMeters: currentRadius,
      status: "BOOKING_NOT_ELIGIBLE",
    };
  }

  // 2. Check if any assignment was already accepted
  const alreadyAccepted = await repo.hasAcceptedAssignment(bookingId);
  if (alreadyAccepted) {
    return {
      candidatesProposed: 0,
      maxRadiusReached: false,
      newRadiusMeters: currentRadius,
      status: "ACCEPTED_ALREADY",
    };
  }

  // 3. Expire all outstanding PROPOSED assignments that have passed their TTL
  await repo.expireProposedAssignments(bookingId);

  // 4. Expand radius by 2km increment
  const newRadius = Math.min(currentRadius + RADIUS_INCREMENT_METERS, MAX_SEARCH_RADIUS_METERS);
  const maxRadiusReached = newRadius >= MAX_SEARCH_RADIUS_METERS;

  // 5. Notify consumer that a partner is being searched (Requirement 3.4)
  await notificationsService.createNotification({
    body: `We're still searching for a partner for your booking ${booking.bookingNumber}. We'll notify you as soon as one is found.`,
    channel: "IN_APP",
    metadata: {
      bookingId: booking.id,
      bookingNumber: booking.bookingNumber,
      searchRadiusMeters: newRadius,
      type: "PARTNER_SEARCH_IN_PROGRESS",
    },
    recipientId: booking.consumerId,
    recipientType: "CONSUMER",
    title: "Searching for a partner",
  });

  // Also send a push notification to consumer
  await notificationsService.createNotification({
    body: `We're expanding our search to find a partner for your booking ${booking.bookingNumber}. Hang tight!`,
    channel: "PUSH",
    metadata: {
      bookingId: booking.id,
      bookingNumber: booking.bookingNumber,
      type: "PARTNER_SEARCH_IN_PROGRESS",
    },
    recipientId: booking.consumerId,
    recipientType: "CONSUMER",
    title: "Searching for a partner",
  });

  // 6. Get previously proposed partner IDs to exclude them
  const excludedPartnerIds = await repo.getProposedPartnerIds(bookingId);

  // 7. Look up the booking address coordinates
  const address = await repo.findAddressById(booking.addressId);
  if (!address || !address.latitude || !address.longitude) {
    return {
      candidatesProposed: 0,
      maxRadiusReached,
      newRadiusMeters: newRadius,
      status: "NO_CANDIDATES",
    };
  }

  // 8. Find new candidates at expanded radius
  const candidates = await findNearestPartners({
    latitude: parseFloat(address.latitude),
    limit: 5,
    longitude: parseFloat(address.longitude),
    maxDistanceMeters: newRadius,
    serviceId: booking.serviceId,
  });

  // Filter out already-proposed partners
  const newCandidates = candidates.filter(
    (c) => !excludedPartnerIds.includes(c.partnerId),
  );

  if (newCandidates.length === 0) {
    return {
      candidatesProposed: 0,
      maxRadiusReached,
      newRadiusMeters: newRadius,
      status: "NO_CANDIDATES",
    };
  }

  // 9. Propose to new candidates
  const expiresAt = new Date(Date.now() + PROPOSAL_TTL_SEC * 1000);

  await Promise.all(
    newCandidates.map((c) =>
      repo.insertAssignment({
        bookingId,
        distanceMeters: c.distanceMeters,
        expiresAt,
        partnerId: c.partnerId,
        status: "PROPOSED",
      }),
    ),
  );

  // 10. Record in status history
  await repo.insertStatusHistory({
    actorType: null,
    bookingId,
    fromStatus: booking.status,
    metadata: {
      candidates: newCandidates.map((c) => c.partnerId),
      radiusMeters: newRadius,
      type: "RE_DISPATCH",
    },
    reason: `Re-dispatch: expanded radius to ${newRadius / 1000}km`,
    toStatus: booking.status,
  });

  // 11. Emit real-time event so partners get notified
  bookingEvents.emitPartnerProposed({
    bookingId: booking.id,
    candidates: newCandidates.map((c) => c.partnerId),
    consumerId: booking.consumerId,
    timestamp: new Date().toISOString(),
  });

  return {
    candidatesProposed: newCandidates.length,
    maxRadiusReached,
    newRadiusMeters: newRadius,
    status: "DISPATCHED",
  };
};

// ── Admin Manual Partner Assignment ─────────────────────────────────────────

export type AdminAssignInput = {
  adminId: string;
  bookingId: string;
  partnerId: string;
};

const validatePartnerAssignableToBooking = async (
  booking: NonNullable<Awaited<ReturnType<typeof repo.findBookingById>>>,
  partnerId: string,
) => {
  const partnerUser = await partnersRepo.findPartnerById(partnerId);
  if (!partnerUser || !partnerUser.partner) {
    throw new NotFoundError("Partner not found.");
  }

  if (partnerUser.partner.approvalStatus !== "APPROVED") {
    throw new BadRequestError(
      `Partner must have APPROVED approval status. Current status: ${partnerUser.partner.approvalStatus}.`,
    );
  }

  const partnerSkills = await skillsRepo.getPartnerSkills(partnerId);
  const hasRequiredSkill = partnerSkills.some(
    (skill) => skill.serviceId === booking.serviceId,
  );
  if (!hasRequiredSkill) {
    throw new BadRequestError(
      "Partner does not have the required service skill for this booking.",
    );
  }

  const hasOverlap = await repo.hasOverlappingActiveBooking(
    partnerId,
    booking.scheduledAt,
    booking.scheduledEndAt,
    booking.id,
  );
  if (hasOverlap) {
    throw new ConflictError(
      "Partner already has an active booking in the same time slot.",
    );
  }
};

export const isPartnerAssignableToBooking = async (
  booking: NonNullable<Awaited<ReturnType<typeof repo.findBookingById>>>,
  partnerId: string,
): Promise<boolean> => {
  try {
    await validatePartnerAssignableToBooking(booking, partnerId);
    return true;
  } catch {
    return false;
  }
};

export const listAssignablePartnersForBooking = async (bookingId: string) => {
  const booking = await repo.findBookingById(bookingId);
  if (!booking) throw new NotFoundError("Booking not found.");

  const { partners } = await skillsRepo.listPartnersBySkill(booking.serviceId, {
    limit: 100,
  });

  const assignable = [];
  for (const partner of partners) {
    if (await isPartnerAssignableToBooking(booking, partner.id)) {
      assignable.push(partner);
    }
  }

  return assignable;
};

/**
 * Admin manually assigns a specific partner to a booking.
 *
 * Validates:
 * 1. Booking is in CONFIRMED status
 * 2. Partner has approvalStatus = 'APPROVED'
 * 3. Partner has the required service skill
 * 4. Partner doesn't have an overlapping active booking in the same time window
 *
 * On success:
 * - Transitions booking to PROFESSIONAL_ASSIGNED
 * - Creates an assignment record with ACCEPTED status
 * - Sends push notification to the assigned partner
 * - Records adminId in assignment metadata
 */
export const adminAssignPartner = async (input: AdminAssignInput) => {
  const { adminId, bookingId, partnerId } = input;

  // 1. Validate booking exists and is in CONFIRMED status
  const booking = await repo.findBookingById(bookingId);
  if (!booking) throw new NotFoundError("Booking not found.");

  if (booking.status !== "CONFIRMED") {
    throw new BadRequestError(
      `Booking must be in CONFIRMED status for admin assignment. Current status: ${booking.status}.`,
    );
  }

  // 2–4. Validate partner eligibility for this booking
  await validatePartnerAssignableToBooking(booking, partnerId);

  // 5. Set partnerId on booking and transition to PROFESSIONAL_ASSIGNED
  await repo.updateBooking(bookingId, { partnerId });

  const updated = await transitionBookingStatus({
    actor: "ADMIN",
    actorId: adminId,
    bookingId,
    metadata: { adminId, assignmentType: "ADMIN_MANUAL", partnerId },
    reason: "Admin manual assignment",
    toStatus: "PROFESSIONAL_ASSIGNED",
  });

  // 6. Create booking_assignments record with ACCEPTED status
  await repo.insertAssignment({
    bookingId,
    distanceMeters: null,
    expiresAt: new Date(), // immediate acceptance, no expiry needed
    partnerId,
    status: "ACCEPTED",
  });

  // 7. Send push notification to the assigned partner
  await notificationsService.createNotification({
    body: `You have been assigned to booking ${booking.bookingNumber} for ${booking.serviceName}. Please check your bookings.`,
    channel: "PUSH",
    metadata: {
      adminId,
      bookingId,
      bookingNumber: booking.bookingNumber,
      type: "ADMIN_ASSIGNMENT",
    },
    recipientId: partnerId,
    recipientType: "PARTNER",
    title: "New Booking Assignment",
  });

  return updated;
};
