import { afterEach, describe, expect, it, vi } from "vitest";

import type { BookingRecord } from "../src/api/v1/bookings/repository.ts";
import * as repo from "../src/api/v1/bookings/repository.ts";
import { transitionBookingStatus } from "../src/api/v1/bookings/service.ts";
import * as photosService from "../src/api/v1/photos/service.ts";
import * as notificationsService from "../src/api/v1/notifications/service.ts";

const makeBooking = (overrides: Partial<BookingRecord> = {}): BookingRecord =>
  ({
    bookingNumber: "BK-1001",
    consumerId: "consumer-1",
    id: "booking-1",
    partnerId: "partner-1",
    status: "IN_PROGRESS",
    timeSlotId: null,
    ...overrides,
  }) as BookingRecord;

describe("booking photo transition gates", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("blocks partners from completing without after-photos", async () => {
    vi.spyOn(repo, "findBookingById").mockResolvedValue(makeBooking());
    vi.spyOn(photosService, "getPhotoCount").mockResolvedValue(0);

    await expect(
      transitionBookingStatus({
        actor: "PARTNER",
        actorId: "partner-1",
        bookingId: "booking-1",
        toStatus: "COMPLETED",
      }),
    ).rejects.toThrow("At least 1 after-photo is required to complete.");
  });

  it("allows admins to complete without after-photos", async () => {
    const updated = makeBooking({ status: "COMPLETED" });

    vi.spyOn(repo, "findBookingById").mockResolvedValue(makeBooking());
    vi.spyOn(photosService, "getPhotoCount").mockResolvedValue(0);
    vi.spyOn(repo, "updateBooking").mockResolvedValue(updated);
    vi.spyOn(repo, "insertStatusHistory").mockResolvedValue(undefined as never);
    vi.spyOn(notificationsService, "createNotification").mockResolvedValue(
      undefined as never,
    );

    const result = await transitionBookingStatus({
      actor: "ADMIN",
      actorId: "admin-1",
      bookingId: "booking-1",
      toStatus: "COMPLETED",
    });

    expect(result.status).toBe("COMPLETED");
    expect(photosService.getPhotoCount).not.toHaveBeenCalled();
  });
});
