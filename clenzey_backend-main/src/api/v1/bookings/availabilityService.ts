import {
  BadRequestError,
  NotFoundError,
} from "../../../errors/appErrors.ts";
import {
  formatIstDateKey,
  formatIstSlotLabel,
  getIstParts,
  istLocalToDate,
} from "../../../utilities/timezoneUtils.ts";
import * as servicesRepo from "../services/repository.ts";
import * as zonesService from "../zones/service.ts";
import * as availabilityRepo from "./availabilityRepository.ts";
import { findNearestEligiblePartnersForScheduled } from "./partnerMatcher.ts";
import * as repo from "./repository.ts";

const DEFAULT_DURATION_MIN = 60;
const SLOT_DURATION_MIN = 60;

const DEFAULT_DURATION_MIN_BY_VARIANT_VALUE: Record<string, number> = {
  "1BHK": 120,
  "2BHK": 180,
  "3BHK": 240,
  "4BHK": 300,
  "30": 30,
  "60": 60,
  "90": 90,
};

const DAY_OF_WEEK = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;

type DayOfWeek = (typeof DAY_OF_WEEK)[number];
type TimePeriod = "AFTERNOON" | "EVENING" | "MORNING";

export type AvailabilitySlot = {
  available: boolean;
  endAt: string;
  label: string;
  startAt: string;
};

export type CheckAvailabilityInput = {
  addressId?: string;
  consumerId: string;
  latitude?: number;
  longitude?: number;
  scheduledAt: string;
  serviceId: string;
  variantId?: string;
};

export type CheckAvailabilityResult =
  | {
      distanceMeters: number;
      matched: true;
      partnerId: string;
      scheduledAt: string;
      scheduledEndAt: string;
    }
  | {
      alternatives: {
        date: string;
        periods: { period: TimePeriod; slots: AvailabilitySlot[] }[];
      };
      matched: false;
      nearestPartner?: {
        distanceMeters: number;
        partnerId: string;
      };
      reason: "NO_AVAILABLE_SLOT" | "NO_PARTNER_IN_AREA" | "NOT_SERVICEABLE";
      requestedAt: string;
    };

const toDayOfWeek = (date: Date): DayOfWeek =>
  DAY_OF_WEEK[getIstParts(date).dayOfWeek]!;

const getPeriod = (hour: number): TimePeriod => {
  if (hour < 12) return "MORNING";
  if (hour < 17) return "AFTERNOON";
  return "EVENING";
};

const requiredEndHourIst = (slotStart: Date, durationMin: number): number => {
  const endAt = new Date(slotStart.getTime() + durationMin * 60_000);
  const endParts = getIstParts(endAt);
  if (endParts.minute > 0 || endParts.second > 0) {
    return endParts.hour + 1;
  }
  return endParts.hour;
};

const windowCoversSlot = (
  window: availabilityRepo.PartnerAvailabilityWindow,
  slotStart: Date,
  durationMin: number,
): boolean => {
  const { hour: startHour } = getIstParts(slotStart);
  const endHour = requiredEndHourIst(slotStart, durationMin);
  return window.startHour <= startHour && window.endHour >= endHour;
};

const resolveDurationMin = async (
  serviceId: string,
  variantId?: string,
): Promise<number> => {
  if (!variantId) return DEFAULT_DURATION_MIN;
  const service = await servicesRepo.findServiceById(serviceId);
  if (!service) return DEFAULT_DURATION_MIN;
  const variant = service.variants.find((v) => v.id === variantId);
  if (!variant) return DEFAULT_DURATION_MIN;
  return DEFAULT_DURATION_MIN_BY_VARIANT_VALUE[variant.value] ?? DEFAULT_DURATION_MIN;
};

const resolveCoordinates = async (
  input: CheckAvailabilityInput,
): Promise<{ latitude: number; longitude: number }> => {
  if (input.addressId) {
    const address = await repo.findAddressById(input.addressId);
    if (!address || address.consumerId !== input.consumerId) {
      throw new BadRequestError("Invalid address for this consumer.");
    }
    if (address.latitude == null || address.longitude == null) {
      throw new BadRequestError(
        "Address has no coordinates. Pick an address with a location or pass latitude/longitude.",
      );
    }
    const latitude = Number(address.latitude);
    const longitude = Number(address.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new BadRequestError("Address coordinates are invalid.");
    }
    return { latitude, longitude };
  }

  if (input.latitude == null || input.longitude == null) {
    throw new BadRequestError(
      "Either addressId or both latitude and longitude are required.",
    );
  }

  return { latitude: input.latitude, longitude: input.longitude };
};

const partnerAvailableAt = async (
  partnerId: string,
  scheduledAt: Date,
  durationMin: number,
): Promise<boolean> => {
  const dayOfWeek = toDayOfWeek(scheduledAt);
  const windows = await availabilityRepo.listPartnerAvailabilityForDay(
    partnerId,
    dayOfWeek,
  );

  const inWindow = windows.some((w) =>
    windowCoversSlot(w, scheduledAt, durationMin),
  );
  if (!inWindow) return false;

  const scheduledEndAt = new Date(
    scheduledAt.getTime() + durationMin * 60_000,
  );
  const hasOverlap = await repo.hasOverlappingActiveBooking(
    partnerId,
    scheduledAt,
    scheduledEndAt,
  );
  return !hasOverlap;
};

const buildHourlySlotsForDate = async (
  partnerId: string,
  anchor: Date,
  durationMin: number,
): Promise<AvailabilitySlot[]> => {
  const dayOfWeek = toDayOfWeek(anchor);
  const windows = await availabilityRepo.listPartnerAvailabilityForDay(
    partnerId,
    dayOfWeek,
  );

  const istAnchor = getIstParts(anchor);
  const slots: AvailabilitySlot[] = [];
  const now = new Date();
  const isToday = formatIstDateKey(anchor) === formatIstDateKey(now);

  for (const window of windows) {
    for (let hour = window.startHour; hour + 1 <= window.endHour; hour += 1) {
      const slotStart = istLocalToDate({
        day: istAnchor.day,
        hour,
        month: istAnchor.month,
        year: istAnchor.year,
      });
      const slotEnd = new Date(slotStart.getTime() + SLOT_DURATION_MIN * 60_000);

      let available = windowCoversSlot(window, slotStart, durationMin);

      if (available && isToday && slotStart.getTime() <= now.getTime()) {
        available = false;
      }

      if (available) {
        const scheduledEndAt = new Date(
          slotStart.getTime() + durationMin * 60_000,
        );
        const hasOverlap = await repo.hasOverlappingActiveBooking(
          partnerId,
          slotStart,
          scheduledEndAt,
        );
        if (hasOverlap) available = false;
      }

      slots.push({
        available,
        endAt: slotEnd.toISOString(),
        label: formatIstSlotLabel(slotStart),
        startAt: slotStart.toISOString(),
      });
    }
  }

  slots.sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
  );
  return slots;
};

const groupSlotsByPeriod = (
  slots: AvailabilitySlot[],
): { period: TimePeriod; slots: AvailabilitySlot[] }[] => {
  const groups = new Map<TimePeriod, AvailabilitySlot[]>();
  for (const slot of slots) {
    const { hour } = getIstParts(new Date(slot.startAt));
    const period = getPeriod(hour);
    const list = groups.get(period) ?? [];
    list.push(slot);
    groups.set(period, list);
  }

  const order: TimePeriod[] = ["MORNING", "AFTERNOON", "EVENING"];
  return order
    .filter((period) => groups.has(period))
    .map((period) => ({ period, slots: groups.get(period)! }));
};

export const checkAvailability = async (
  input: CheckAvailabilityInput,
): Promise<CheckAvailabilityResult> => {
  const scheduledAt = new Date(input.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime())) {
    throw new BadRequestError("scheduledAt is invalid.");
  }
  if (scheduledAt.getTime() <= Date.now()) {
    throw new BadRequestError("scheduledAt must be in the future.");
  }

  const service = await servicesRepo.findServiceById(input.serviceId);
  if (!service) throw new NotFoundError("Service not found.");

  if (input.variantId) {
    const variant = service.variants.find((v) => v.id === input.variantId);
    if (!variant) {
      throw new BadRequestError("Invalid variant for this service.");
    }
  }

  const { latitude, longitude } = await resolveCoordinates(input);
  const durationMin = await resolveDurationMin(
    input.serviceId,
    input.variantId,
  );

  const serviceability = await zonesService.checkServiceability(
    latitude,
    longitude,
    input.serviceId,
  );
  if (!serviceability.isServiceable) {
    return {
      alternatives: { date: formatIstDateKey(scheduledAt), periods: [] },
      matched: false,
      reason: "NOT_SERVICEABLE",
      requestedAt: scheduledAt.toISOString(),
    };
  }

  const candidates = await findNearestEligiblePartnersForScheduled({
    latitude,
    longitude,
    serviceId: input.serviceId,
  });

  if (candidates.length === 0) {
    return {
      alternatives: { date: formatIstDateKey(scheduledAt), periods: [] },
      matched: false,
      reason: "NO_PARTNER_IN_AREA",
      requestedAt: scheduledAt.toISOString(),
    };
  }

  for (const candidate of candidates) {
    const available = await partnerAvailableAt(
      candidate.partnerId,
      scheduledAt,
      durationMin,
    );
    if (available) {
      const scheduledEndAt = new Date(
        scheduledAt.getTime() + durationMin * 60_000,
      );
      return {
        distanceMeters: candidate.distanceMeters,
        matched: true,
        partnerId: candidate.partnerId,
        scheduledAt: scheduledAt.toISOString(),
        scheduledEndAt: scheduledEndAt.toISOString(),
      };
    }
  }

  const nearest = candidates[0]!;
  const slots = await buildHourlySlotsForDate(
    nearest.partnerId,
    scheduledAt,
    durationMin,
  );

  return {
    alternatives: {
      date: formatIstDateKey(scheduledAt),
      periods: groupSlotsByPeriod(slots),
    },
    matched: false,
    nearestPartner: {
      distanceMeters: nearest.distanceMeters,
      partnerId: nearest.partnerId,
    },
    reason: "NO_AVAILABLE_SLOT",
    requestedAt: scheduledAt.toISOString(),
  };
};
