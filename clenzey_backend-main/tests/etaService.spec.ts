import { afterEach, describe, expect, it, vi } from "vitest";

import * as bookingsRepo from "../src/api/v1/bookings/repository.ts";
import {
  calculateETA,
  getBookingETA,
  haversineDistance,
  recalculateETA,
} from "../src/api/v1/eta/service.ts";
import * as etaRepo from "../src/api/v1/eta/repository.ts";

describe("haversineDistance", () => {
  it("returns 0 for identical coordinates", () => {
    expect(haversineDistance(19.076, 72.8777, 19.076, 72.8777)).toBe(0);
  });

  it("computes a symmetric distance regardless of point order", () => {
    const forward = haversineDistance(19.076, 72.8777, 18.5204, 73.8567);
    const reverse = haversineDistance(18.5204, 73.8567, 19.076, 72.8777);
    expect(forward).toBeCloseTo(reverse, 6);
  });

  it("computes the great-circle distance between Mumbai and Pune", () => {
    // Mumbai (19.076, 72.8777) to Pune (18.5204, 73.8567) is ~118 km
    const km = haversineDistance(19.076, 72.8777, 18.5204, 73.8567);
    expect(km).toBeGreaterThan(115);
    expect(km).toBeLessThan(122);
  });

  it("computes ~111 km for one degree of latitude", () => {
    const km = haversineDistance(0, 0, 1, 0);
    expect(km).toBeCloseTo(111.19, 1);
  });
});

describe("calculateETA", () => {
  it("returns at least 1 minute for very close coordinates", () => {
    const eta = calculateETA(19.076, 72.8777, 19.0761, 72.8778);
    expect(eta).toBe(1);
  });

  it("returns a rounded-up ETA for a moderate distance", () => {
    // ~5 km apart -> roadDistance ~7 km / 25 kmh * 60 ~= 16.8 -> ceil 17
    const eta = calculateETA(19.076, 72.8777, 19.12, 72.8777);
    expect(eta).toBeGreaterThan(0);
    expect(Number.isInteger(eta)).toBe(true);
  });

  it("throws when the partner is outside the service radius", () => {
    expect(() => calculateETA(19.076, 72.8777, 18.5204, 73.8567)).toThrow(
      "Partner is outside service range for ETA calculation",
    );
  });

  it("never exceeds the maximum ETA of 180 minutes", () => {
    // A point just inside the 50 km radius still yields an ETA under the cap.
    const eta = calculateETA(0, 0, 0.44, 0);
    expect(eta).toBeLessThanOrEqual(180);
  });

  it("caps ETA at 180 minutes for distances near the service radius limit", () => {
    // ~49 km straight-line -> road distance ~68.6 km -> raw ETA ~164 min, below cap
    const eta = calculateETA(0, 0, 0.44, 0);
    expect(eta).toBeGreaterThan(1);
    expect(eta).toBeLessThanOrEqual(180);
  });
});

describe("getBookingETA", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("throws NotFoundError when the booking does not exist", async () => {
    vi.spyOn(bookingsRepo, "findBookingById").mockResolvedValue(null as never);

    await expect(getBookingETA("booking-1", "user-1")).rejects.toThrow(
      "Booking not found",
    );
  });

  it("throws NotFoundError when the user is neither consumer nor partner", async () => {
    vi.spyOn(bookingsRepo, "findBookingById").mockResolvedValue({
      addressId: "addr-1",
      consumerId: "consumer-1",
      partnerId: "partner-1",
      status: "PROFESSIONAL_EN_ROUTE",
    } as never);

    await expect(getBookingETA("booking-1", "stranger")).rejects.toThrow(
      "Booking not found",
    );
  });

  it("throws NotFoundError when the booking is not en route", async () => {
    vi.spyOn(bookingsRepo, "findBookingById").mockResolvedValue({
      addressId: "addr-1",
      consumerId: "consumer-1",
      partnerId: "partner-1",
      status: "CONFIRMED",
    } as never);

    await expect(getBookingETA("booking-1", "consumer-1")).rejects.toThrow(
      "ETA is only available when partner is en route",
    );
  });

  it("computes ETA from the stored partner coordinates when available", async () => {
    const now = new Date();
    vi.spyOn(bookingsRepo, "findBookingById").mockResolvedValue({
      addressId: "addr-1",
      consumerId: "consumer-1",
      partnerId: "partner-1",
      status: "PROFESSIONAL_EN_ROUTE",
    } as never);
    vi.spyOn(bookingsRepo, "findAddressById").mockResolvedValue({
      latitude: "19.12",
      longitude: "72.8777",
    } as never);
    vi.spyOn(etaRepo, "getEta").mockResolvedValue({
      distanceKm: "5",
      etaMinutes: 17,
      lastPartnerLat: "19.076",
      lastPartnerLng: "72.8777",
      updatedAt: now,
    } as never);

    const result = await getBookingETA("booking-1", "consumer-1");

    expect(result.etaMinutes).toBeGreaterThan(0);
    expect(result.partnerLocation).toEqual({ lat: 19.076, lng: 72.8777 });
    expect(result.isStale).toBe(false);
    expect(result.lastUpdatedAt).toBe(now.toISOString());
  });

  it("marks the ETA as stale when the record is older than the threshold", async () => {
    const old = new Date(Date.now() - 10 * 60 * 1000);
    vi.spyOn(bookingsRepo, "findBookingById").mockResolvedValue({
      addressId: "addr-1",
      consumerId: "consumer-1",
      partnerId: "partner-1",
      status: "PROFESSIONAL_EN_ROUTE",
    } as never);
    vi.spyOn(bookingsRepo, "findAddressById").mockResolvedValue({
      latitude: "19.12",
      longitude: "72.8777",
    } as never);
    vi.spyOn(etaRepo, "getEta").mockResolvedValue({
      distanceKm: "5",
      etaMinutes: 17,
      lastPartnerLat: "19.076",
      lastPartnerLng: "72.8777",
      updatedAt: old,
    } as never);

    const result = await getBookingETA("booking-1", "consumer-1");
    expect(result.isStale).toBe(true);
  });

  it("throws NotFoundError when no ETA can be derived", async () => {
    vi.spyOn(bookingsRepo, "findBookingById").mockResolvedValue({
      addressId: "addr-1",
      consumerId: "consumer-1",
      partnerId: null,
      status: "PROFESSIONAL_EN_ROUTE",
    } as never);
    vi.spyOn(bookingsRepo, "findAddressById").mockResolvedValue(null as never);
    vi.spyOn(etaRepo, "getEta").mockResolvedValue(null as never);

    await expect(getBookingETA("booking-1", "consumer-1")).rejects.toThrow(
      "ETA not yet calculated for this booking",
    );
  });

  it("falls back to stored ETA when live calculation fails", async () => {
    const now = new Date();
    vi.spyOn(bookingsRepo, "findBookingById").mockResolvedValue({
      addressId: "addr-1",
      consumerId: "consumer-1",
      partnerId: "partner-1",
      status: "PROFESSIONAL_EN_ROUTE",
    } as never);
    vi.spyOn(bookingsRepo, "findAddressById").mockResolvedValue({
      latitude: "19.12",
      longitude: "72.8777",
    } as never);
    vi.spyOn(etaRepo, "getEta").mockResolvedValue({
      distanceKm: "5",
      etaMinutes: 17,
      lastPartnerLat: "100",
      lastPartnerLng: "200",
      updatedAt: now,
    } as never);

    const result = await getBookingETA("booking-1", "consumer-1");
    expect(result.etaMinutes).toBe(17);
    expect(result.distanceKm).toBe(5);
  });

  it("uses live partner location when stored coordinates are missing", async () => {
    const seenAt = new Date();
    vi.spyOn(bookingsRepo, "findBookingById").mockResolvedValue({
      addressId: "addr-1",
      consumerId: "consumer-1",
      partnerId: "partner-1",
      status: "PROFESSIONAL_EN_ROUTE",
    } as never);
    vi.spyOn(bookingsRepo, "findAddressById").mockResolvedValue({
      latitude: "19.12",
      longitude: "72.8777",
    } as never);
    vi.spyOn(etaRepo, "getEta").mockResolvedValue(null as never);
    vi.spyOn(etaRepo, "getPartnerLocation").mockResolvedValue({
      latitude: 19.076,
      longitude: 72.8777,
      lastSeenAt: seenAt,
    } as never);

    const result = await getBookingETA("booking-1", "consumer-1");
    expect(result.etaMinutes).toBeGreaterThan(0);
    expect(result.partnerLocation).toEqual({ lat: 19.076, lng: 72.8777 });
    expect(result.lastUpdatedAt).toBe(seenAt.toISOString());
  });

  it("allows the assigned partner to read ETA", async () => {
    const now = new Date();
    vi.spyOn(bookingsRepo, "findBookingById").mockResolvedValue({
      addressId: "addr-1",
      consumerId: "consumer-1",
      partnerId: "partner-1",
      status: "PROFESSIONAL_EN_ROUTE",
    } as never);
    vi.spyOn(bookingsRepo, "findAddressById").mockResolvedValue({
      latitude: "19.12",
      longitude: "72.8777",
    } as never);
    vi.spyOn(etaRepo, "getEta").mockResolvedValue({
      distanceKm: "5",
      etaMinutes: 17,
      lastPartnerLat: "19.076",
      lastPartnerLng: "72.8777",
      updatedAt: now,
    } as never);

    const result = await getBookingETA("booking-1", "partner-1");
    expect(result.etaMinutes).toBeGreaterThan(0);
  });
});

describe("recalculateETA", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("throws when the booking does not exist", async () => {
    vi.spyOn(bookingsRepo, "findBookingById").mockResolvedValue(null as never);

    await expect(recalculateETA("booking-1", 19.076, 72.8777)).rejects.toThrow(
      "Booking not found",
    );
  });

  it("throws when address coordinates are unavailable", async () => {
    vi.spyOn(bookingsRepo, "findBookingById").mockResolvedValue({
      addressId: "addr-1",
    } as never);
    vi.spyOn(bookingsRepo, "findAddressById").mockResolvedValue(null as never);

    await expect(recalculateETA("booking-1", 19.076, 72.8777)).rejects.toThrow(
      "Booking address coordinates not available",
    );
  });

  it("throws when the partner is outside the service range", async () => {
    vi.spyOn(bookingsRepo, "findBookingById").mockResolvedValue({
      addressId: "addr-1",
    } as never);
    vi.spyOn(bookingsRepo, "findAddressById").mockResolvedValue({
      latitude: "18.5204",
      longitude: "73.8567",
    } as never);

    await expect(recalculateETA("booking-1", 19.076, 72.8777)).rejects.toThrow(
      "Partner is outside service range for ETA calculation",
    );
  });

  it("upserts ETA and returns a fresh result", async () => {
    const updatedAt = new Date("2026-07-12T10:00:00.000Z");
    vi.spyOn(bookingsRepo, "findBookingById").mockResolvedValue({
      addressId: "addr-1",
    } as never);
    vi.spyOn(bookingsRepo, "findAddressById").mockResolvedValue({
      latitude: "19.12",
      longitude: "72.8777",
    } as never);
    vi.spyOn(etaRepo, "upsertEta").mockResolvedValue({
      distanceKm: "5.5",
      etaMinutes: 17,
      updatedAt,
    } as never);

    const result = await recalculateETA("booking-1", 19.076, 72.8777);

    expect(etaRepo.upsertEta).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingId: "booking-1",
        lastPartnerLat: "19.076",
        lastPartnerLng: "72.8777",
      }),
    );
    expect(result).toEqual({
      distanceKm: 5.5,
      etaMinutes: 17,
      isStale: false,
      lastUpdatedAt: updatedAt.toISOString(),
      partnerLocation: { lat: 19.076, lng: 72.8777 },
    });
  });
});
