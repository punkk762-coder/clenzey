import { afterEach, describe, expect, it, vi } from "vitest";

import type { BookingRecord } from "../src/api/v1/bookings/repository.ts";
import * as bookingsRepo from "../src/api/v1/bookings/repository.ts";
import type { DisputeRecord } from "../src/api/v1/disputes/repository.ts";
import * as repo from "../src/api/v1/disputes/repository.ts";
import * as uploadUrlValidator from "../src/validations/uploadUrlValidator.ts";
import { domainEvents } from "../src/realtime/domainEvents.ts";
import * as s3PresignService from "../src/services/s3PresignService.ts";
import * as notificationsService from "../src/api/v1/notifications/service.ts";
import {
  addDisputeEvidence,
  buildDisputeStatus,
  createDispute,
  getAdminDisputeById,
  getDisputeById,
  getDisputeStatusForBooking,
  listDisputeEvidence,
  listDisputes,
  listDisputesAdmin,
  updateDispute,
} from "../src/api/v1/disputes/service.ts";

const makeBooking = (overrides: Partial<BookingRecord> = {}): BookingRecord =>
  ({
    cancelledAt: null,
    completedAt: new Date(),
    consumerId: "consumer-1",
    partnerId: "partner-1",
    status: "COMPLETED",
    updatedAt: new Date(),
    ...overrides,
  }) as BookingRecord;

const makeDispute = (overrides: Partial<DisputeRecord> = {}): DisputeRecord =>
  ({
    bookingId: "booking-1",
    category: "SERVICE_QUALITY",
    createdAt: new Date(),
    description: "Something went wrong",
    id: "dispute-1",
    raisedById: "consumer-1",
    raisedByType: "CONSUMER",
    resolutionNotes: null,
    resolvedAt: null,
    status: "OPEN",
    ...overrides,
  }) as DisputeRecord;

describe("buildDisputeStatus", () => {
  it("allows a consumer to raise a dispute on a recently completed booking", () => {
    const status = buildDisputeStatus(makeBooking(), null, {
      forUser: true,
      userId: "consumer-1",
      userType: "CONSUMER",
    });

    expect(status.canRaiseDispute).toBe(true);
    expect(status.hasActiveDispute).toBe(false);
    expect(status.dispute).toBeNull();
  });

  it("denies raising when the user has no access to the booking", () => {
    const status = buildDisputeStatus(makeBooking(), null, {
      forUser: true,
      userId: "someone-else",
      userType: "CONSUMER",
    });

    expect(status.canRaiseDispute).toBe(false);
  });

  it("allows the assigned partner to raise a dispute", () => {
    const status = buildDisputeStatus(makeBooking(), null, {
      forUser: true,
      userId: "partner-1",
      userType: "PARTNER",
    });

    expect(status.canRaiseDispute).toBe(true);
  });

  it("blocks raising when an active dispute already exists", () => {
    const status = buildDisputeStatus(makeBooking(), makeDispute(), {
      forUser: true,
      userId: "consumer-1",
      userType: "CONSUMER",
    });

    expect(status.hasActiveDispute).toBe(true);
    expect(status.canRaiseDispute).toBe(false);
    expect(status.dispute).not.toBeNull();
    expect(status.dispute?.id).toBe("dispute-1");
  });

  it("does not treat resolved disputes as active", () => {
    const status = buildDisputeStatus(
      makeBooking(),
      makeDispute({ status: "RESOLVED", resolvedAt: new Date() }),
      { forUser: true, userId: "consumer-1", userType: "CONSUMER" },
    );

    expect(status.hasActiveDispute).toBe(false);
    // A resolved dispute is not active, so a new one may be raised.
    expect(status.canRaiseDispute).toBe(true);
  });

  it("blocks raising when the booking is not completed or cancelled", () => {
    const status = buildDisputeStatus(
      makeBooking({ status: "CONFIRMED", completedAt: null }),
      null,
      { forUser: true, userId: "consumer-1", userType: "CONSUMER" },
    );

    expect(status.canRaiseDispute).toBe(false);
  });

  it("blocks raising after the 7-day dispute window has passed", () => {
    const longAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    const status = buildDisputeStatus(
      makeBooking({ completedAt: longAgo, updatedAt: longAgo }),
      null,
      { forUser: true, userId: "consumer-1", userType: "CONSUMER" },
    );

    expect(status.canRaiseDispute).toBe(false);
  });

  it("blocks raising when forUser is false", () => {
    const status = buildDisputeStatus(makeBooking(), null, {
      forUser: false,
      userId: "consumer-1",
      userType: "CONSUMER",
    });

    expect(status.canRaiseDispute).toBe(false);
  });

  it("supports cancelled bookings within the window", () => {
    const status = buildDisputeStatus(
      makeBooking({
        status: "CANCELLED",
        completedAt: null,
        cancelledAt: new Date(),
      }),
      null,
      { forUser: true, userId: "consumer-1", userType: "CONSUMER" },
    );

    expect(status.canRaiseDispute).toBe(true);
  });
});

describe("dispute service repository wrappers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("getDisputeStatusForBooking throws when the booking is missing", async () => {
    vi.spyOn(bookingsRepo, "findBookingById").mockResolvedValue(null as never);

    await expect(
      getDisputeStatusForBooking("booking-1", "consumer-1", "CONSUMER"),
    ).rejects.toThrow("Booking not found.");
  });

  it("getDisputeStatusForBooking rejects a consumer who does not own the booking", async () => {
    vi.spyOn(bookingsRepo, "findBookingById").mockResolvedValue(
      makeBooking({ consumerId: "other" }) as never,
    );

    await expect(
      getDisputeStatusForBooking("booking-1", "consumer-1", "CONSUMER"),
    ).rejects.toThrow("You do not have access to this booking.");
  });

  it("getDisputeStatusForBooking returns a built status for the owner", async () => {
    vi.spyOn(bookingsRepo, "findBookingById").mockResolvedValue(
      makeBooking() as never,
    );
    vi.spyOn(repo, "findLatestByBookingAndUser").mockResolvedValue(null as never);

    const status = await getDisputeStatusForBooking(
      "booking-1",
      "consumer-1",
      "CONSUMER",
    );
    expect(status.canRaiseDispute).toBe(true);
  });

  it("listDisputes delegates to the repository", async () => {
    const payload = { disputes: [makeDispute()], total: 1 };
    const spy = vi.spyOn(repo, "listByUser").mockResolvedValue(payload as never);

    const result = await listDisputes("consumer-1", { limit: 10 });
    expect(spy).toHaveBeenCalledWith("consumer-1", { limit: 10 });
    expect(result).toBe(payload);
  });

  it("listDisputesAdmin delegates to the repository", async () => {
    const payload = { disputes: [], total: 0 };
    const spy = vi.spyOn(repo, "listAdmin").mockResolvedValue(payload as never);

    const result = await listDisputesAdmin({ status: "OPEN" });
    expect(spy).toHaveBeenCalledWith({ status: "OPEN" });
    expect(result).toBe(payload);
  });

  it("getDisputeStatusForBooking rejects a partner who is not assigned", async () => {
    vi.spyOn(bookingsRepo, "findBookingById").mockResolvedValue(
      makeBooking({ partnerId: "other-partner" }) as never,
    );

    await expect(
      getDisputeStatusForBooking("booking-1", "partner-1", "PARTNER"),
    ).rejects.toThrow("You do not have access to this booking.");
  });
});

describe("createDispute", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("throws when the booking does not exist", async () => {
    vi.spyOn(bookingsRepo, "findBookingById").mockResolvedValue(null as never);

    await expect(
      createDispute({
        bookingId: "booking-1",
        category: "SERVICE_QUALITY",
        description: "Issue",
        raisedById: "consumer-1",
        raisedByType: "CONSUMER",
      }),
    ).rejects.toThrow("Booking not found.");
  });

  it("rejects a consumer who does not own the booking", async () => {
    vi.spyOn(bookingsRepo, "findBookingById").mockResolvedValue(
      makeBooking({ consumerId: "other" }) as never,
    );

    await expect(
      createDispute({
        bookingId: "booking-1",
        category: "SERVICE_QUALITY",
        description: "Issue",
        raisedById: "consumer-1",
        raisedByType: "CONSUMER",
      }),
    ).rejects.toThrow("You do not have access to dispute this booking.");
  });

  it("rejects a partner who is not assigned to the booking", async () => {
    vi.spyOn(bookingsRepo, "findBookingById").mockResolvedValue(
      makeBooking({ partnerId: "other-partner" }) as never,
    );

    await expect(
      createDispute({
        bookingId: "booking-1",
        category: "SERVICE_QUALITY",
        description: "Issue",
        raisedById: "partner-1",
        raisedByType: "PARTNER",
      }),
    ).rejects.toThrow("You can only dispute bookings assigned to you.");
  });

  it("rejects bookings that are not completed or cancelled", async () => {
    vi.spyOn(bookingsRepo, "findBookingById").mockResolvedValue(
      makeBooking({ status: "CONFIRMED", completedAt: null }) as never,
    );

    await expect(
      createDispute({
        bookingId: "booking-1",
        category: "SERVICE_QUALITY",
        description: "Issue",
        raisedById: "consumer-1",
        raisedByType: "CONSUMER",
      }),
    ).rejects.toThrow(
      "Disputes can only be raised for bookings in COMPLETED or CANCELLED status.",
    );
  });

  it("rejects bookings without a reference date", async () => {
    vi.spyOn(bookingsRepo, "findBookingById").mockResolvedValue(
      makeBooking({
        completedAt: null,
        updatedAt: null,
      }) as never,
    );

    await expect(
      createDispute({
        bookingId: "booking-1",
        category: "SERVICE_QUALITY",
        description: "Issue",
        raisedById: "consumer-1",
        raisedByType: "CONSUMER",
      }),
    ).rejects.toThrow("Booking has no completion or cancellation date.");
  });

  it("rejects disputes outside the 7-day window", async () => {
    const longAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    vi.spyOn(bookingsRepo, "findBookingById").mockResolvedValue(
      makeBooking({ completedAt: longAgo, updatedAt: longAgo }) as never,
    );

    await expect(
      createDispute({
        bookingId: "booking-1",
        category: "SERVICE_QUALITY",
        description: "Issue",
        raisedById: "consumer-1",
        raisedByType: "CONSUMER",
      }),
    ).rejects.toThrow(
      "Disputes can only be raised within 7 days of booking completion or cancellation.",
    );
  });

  it("rejects when an active dispute already exists", async () => {
    vi.spyOn(bookingsRepo, "findBookingById").mockResolvedValue(
      makeBooking() as never,
    );
    vi.spyOn(repo, "findActiveByBookingAndUser").mockResolvedValue(
      makeDispute() as never,
    );

    await expect(
      createDispute({
        bookingId: "booking-1",
        category: "SERVICE_QUALITY",
        description: "Issue",
        raisedById: "consumer-1",
        raisedByType: "CONSUMER",
      }),
    ).rejects.toThrow("An active dispute already exists for this booking.");
  });

  it("creates a dispute and emits a domain event", async () => {
    const dispute = makeDispute();
    vi.spyOn(bookingsRepo, "findBookingById").mockResolvedValue(
      makeBooking() as never,
    );
    vi.spyOn(repo, "findActiveByBookingAndUser").mockResolvedValue(null as never);
    vi.spyOn(repo, "insertDispute").mockResolvedValue(dispute as never);
    const emitSpy = vi.spyOn(domainEvents, "emitDisputeCreated");

    const result = await createDispute({
      bookingId: "booking-1",
      category: "SERVICE_QUALITY",
      description: "Issue",
      raisedById: "consumer-1",
      raisedByType: "CONSUMER",
    });

    expect(result).toBe(dispute);
    expect(emitSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingId: "booking-1",
        disputeId: "dispute-1",
        raisedById: "consumer-1",
        raisedByType: "CONSUMER",
      }),
    );
  });
});

describe("updateDispute", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("throws when the dispute does not exist", async () => {
    vi.spyOn(repo, "findDisputeById").mockResolvedValue(null as never);

    await expect(
      updateDispute({
        adminId: "admin-1",
        disputeId: "dispute-1",
        status: "UNDER_REVIEW",
      }),
    ).rejects.toThrow("Dispute not found.");
  });

  it("rejects updates to closed disputes", async () => {
    vi.spyOn(repo, "findDisputeById").mockResolvedValue(
      makeDispute({ status: "CLOSED" }) as never,
    );

    await expect(
      updateDispute({
        adminId: "admin-1",
        disputeId: "dispute-1",
        status: "UNDER_REVIEW",
      }),
    ).rejects.toThrow("This dispute is closed and cannot be updated.");
  });

  it("rejects invalid transitions from resolved status", async () => {
    vi.spyOn(repo, "findDisputeById").mockResolvedValue(
      makeDispute({ status: "RESOLVED" }) as never,
    );

    await expect(
      updateDispute({
        adminId: "admin-1",
        disputeId: "dispute-1",
        status: "UNDER_REVIEW",
      }),
    ).rejects.toThrow("A resolved dispute can only be moved to CLOSED.");
  });

  it("resolves a dispute, notifies the user, and emits an event", async () => {
    const resolved = makeDispute({
      status: "RESOLVED",
      resolutionNotes: "Refund issued",
      resolvedAt: new Date(),
    });
    vi.spyOn(repo, "findDisputeById").mockResolvedValue(makeDispute() as never);
    vi.spyOn(repo, "updateDispute").mockResolvedValue(resolved as never);
    const emitSpy = vi.spyOn(domainEvents, "emit");
    const notifySpy = vi
      .spyOn(notificationsService, "createNotification")
      .mockResolvedValue(undefined as never);

    const result = await updateDispute({
      adminId: "admin-1",
      disputeId: "dispute-1",
      resolutionNotes: "Refund issued",
      status: "RESOLVED",
    });

    expect(result.status).toBe("RESOLVED");
    expect(emitSpy).toHaveBeenCalledWith(
      "dispute:resolved",
      expect.objectContaining({
        disputeId: "dispute-1",
        resolutionNotes: "Refund issued",
      }),
    );
    expect(notifySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: "consumer-1",
        title: "Dispute resolved",
      }),
    );
  });

  it("updates status without resolution side effects", async () => {
    const updated = makeDispute({ status: "UNDER_REVIEW" });
    vi.spyOn(repo, "findDisputeById").mockResolvedValue(makeDispute() as never);
    vi.spyOn(repo, "updateDispute").mockResolvedValue(updated as never);
    const emitSpy = vi.spyOn(domainEvents, "emit");
    const notifySpy = vi.spyOn(notificationsService, "createNotification");

    const result = await updateDispute({
      adminId: "admin-1",
      disputeId: "dispute-1",
      status: "UNDER_REVIEW",
    });

    expect(result.status).toBe("UNDER_REVIEW");
    expect(emitSpy).not.toHaveBeenCalled();
    expect(notifySpy).not.toHaveBeenCalled();
  });

  it("allows moving a resolved dispute to closed", async () => {
    const closed = makeDispute({ status: "CLOSED" });
    vi.spyOn(repo, "findDisputeById").mockResolvedValue(
      makeDispute({ status: "RESOLVED" }) as never,
    );
    vi.spyOn(repo, "updateDispute").mockResolvedValue(closed as never);

    const result = await updateDispute({
      adminId: "admin-1",
      disputeId: "dispute-1",
      status: "CLOSED",
    });

    expect(result.status).toBe("CLOSED");
  });
});

describe("getDisputeById and evidence", () => {
  const evidenceUrl =
    "https://clenzey-dev-uploads.s3.ap-south-1.amazonaws.com/dispute-evidence/consumer-1/booking-1/photo.jpg";

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("getDisputeById throws when the dispute is missing", async () => {
    vi.spyOn(repo, "findDisputeById").mockResolvedValue(null as never);

    await expect(getDisputeById("dispute-1", "consumer-1")).rejects.toThrow(
      "Dispute not found.",
    );
  });

  it("getDisputeById rejects users without access", async () => {
    vi.spyOn(repo, "findDisputeById").mockResolvedValue(makeDispute() as never);

    await expect(getDisputeById("dispute-1", "other-user")).rejects.toThrow(
      "You do not have access to this dispute.",
    );
  });

  it("getDisputeById returns dispute detail with mapped evidence", async () => {
    const dispute = makeDispute();
    const evidenceRecord = {
      createdAt: new Date("2026-01-02T00:00:00.000Z"),
      fileUrl: evidenceUrl,
      id: "evidence-1",
      uploadedById: "consumer-1",
    };
    vi.spyOn(repo, "findDisputeById").mockResolvedValue(dispute as never);
    vi.spyOn(repo, "listEvidenceByDisputeId").mockResolvedValue([
      evidenceRecord,
    ] as never);
    vi.spyOn(s3PresignService, "resolveUploadUrlForRead").mockResolvedValue(
      "https://signed.example.com/photo.jpg",
    );

    const result = await getDisputeById("dispute-1", "consumer-1");

    expect(result.dispute).toBe(dispute);
    expect(result.evidence).toEqual([
      {
        createdAt: "2026-01-02T00:00:00.000Z",
        fileUrl: "https://signed.example.com/photo.jpg",
        id: "evidence-1",
        uploadedById: "consumer-1",
      },
    ]);
  });

  it("listDisputeEvidence delegates through access checks", async () => {
    vi.spyOn(repo, "findDisputeById").mockResolvedValue(makeDispute() as never);
    vi.spyOn(repo, "listEvidenceByDisputeId").mockResolvedValue([] as never);

    const result = await listDisputeEvidence("dispute-1", "consumer-1");
    expect(result).toEqual([]);
  });
});

describe("addDisputeEvidence", () => {
  const evidenceUrl =
    "https://clenzey-dev-uploads.s3.ap-south-1.amazonaws.com/dispute-evidence/consumer-1/booking-1/photo.jpg";

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("throws when the dispute does not exist", async () => {
    vi.spyOn(repo, "findDisputeById").mockResolvedValue(null as never);

    await expect(
      addDisputeEvidence({
        disputeId: "dispute-1",
        fileUrl: evidenceUrl,
        userId: "consumer-1",
      }),
    ).rejects.toThrow("Dispute not found.");
  });

  it("rejects users without access", async () => {
    vi.spyOn(repo, "findDisputeById").mockResolvedValue(makeDispute() as never);

    await expect(
      addDisputeEvidence({
        disputeId: "dispute-1",
        fileUrl: evidenceUrl,
        userId: "other-user",
      }),
    ).rejects.toThrow("You do not have access to this dispute.");
  });

  it("rejects evidence on closed disputes", async () => {
    vi.spyOn(repo, "findDisputeById").mockResolvedValue(
      makeDispute({ status: "CLOSED" }) as never,
    );

    await expect(
      addDisputeEvidence({
        disputeId: "dispute-1",
        fileUrl: evidenceUrl,
        userId: "consumer-1",
      }),
    ).rejects.toThrow(
      "Evidence can only be added while the dispute is open or under review.",
    );
  });

  it("rejects disallowed file origins", async () => {
    vi.spyOn(repo, "findDisputeById").mockResolvedValue(makeDispute() as never);
    vi.spyOn(uploadUrlValidator, "isAllowedUploadUrl").mockReturnValue(false);

    await expect(
      addDisputeEvidence({
        disputeId: "dispute-1",
        fileUrl: "https://evil.example.com/file.jpg",
        userId: "consumer-1",
      }),
    ).rejects.toThrow("fileUrl must use an allowed upload origin.");
  });

  it("rejects evidence uploaded outside the booking prefix", async () => {
    vi.spyOn(repo, "findDisputeById").mockResolvedValue(makeDispute() as never);

    await expect(
      addDisputeEvidence({
        disputeId: "dispute-1",
        fileUrl:
          "https://clenzey-dev-uploads.s3.ap-south-1.amazonaws.com/dispute-evidence/consumer-1/other-booking/photo.jpg",
        userId: "consumer-1",
      }),
    ).rejects.toThrow(
      "fileUrl must be a dispute evidence upload for this booking.",
    );
  });

  it("rejects when the evidence limit is reached", async () => {
    vi.spyOn(repo, "findDisputeById").mockResolvedValue(makeDispute() as never);
    vi.spyOn(repo, "countEvidenceByDisputeId").mockResolvedValue(10 as never);

    await expect(
      addDisputeEvidence({
        disputeId: "dispute-1",
        fileUrl: evidenceUrl,
        userId: "consumer-1",
      }),
    ).rejects.toThrow("Maximum of 10 evidence files per dispute has been reached.");
  });

  it("inserts evidence and returns a mapped summary", async () => {
    const record = {
      createdAt: new Date("2026-01-02T00:00:00.000Z"),
      fileUrl: evidenceUrl,
      id: "evidence-1",
      uploadedById: "consumer-1",
    };
    vi.spyOn(repo, "findDisputeById").mockResolvedValue(makeDispute() as never);
    vi.spyOn(repo, "countEvidenceByDisputeId").mockResolvedValue(0 as never);
    vi.spyOn(repo, "insertDisputeEvidence").mockResolvedValue(record as never);
    vi.spyOn(s3PresignService, "resolveUploadUrlForRead").mockResolvedValue(
      "https://signed.example.com/photo.jpg",
    );

    const result = await addDisputeEvidence({
      disputeId: "dispute-1",
      fileUrl: evidenceUrl,
      userId: "consumer-1",
    });

    expect(result).toEqual({
      createdAt: "2026-01-02T00:00:00.000Z",
      fileUrl: "https://signed.example.com/photo.jpg",
      id: "evidence-1",
      uploadedById: "consumer-1",
    });
  });
});

describe("getAdminDisputeById", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("throws when the dispute is missing", async () => {
    vi.spyOn(repo, "findAdminDetailById").mockResolvedValue(null as never);

    await expect(getAdminDisputeById("dispute-1")).rejects.toThrow(
      "Dispute not found.",
    );
  });

  it("returns admin detail with mapped evidence", async () => {
    const detail = {
      booking: {
        bookingNumber: "BK-001",
        cancelledAt: null,
        completedAt: new Date(),
        consumerId: "consumer-1",
        consumerName: "Alice",
        id: "booking-1",
        partnerId: "partner-1",
        status: "COMPLETED",
        totalAmount: "500.00",
      },
      dispute: makeDispute(),
    };
    const evidenceRecord = {
      createdAt: new Date("2026-01-02T00:00:00.000Z"),
      fileUrl: "https://example.com/file.jpg",
      id: "evidence-1",
      uploadedById: "consumer-1",
    };
    vi.spyOn(repo, "findAdminDetailById").mockResolvedValue(detail as never);
    vi.spyOn(repo, "listEvidenceByDisputeId").mockResolvedValue([
      evidenceRecord,
    ] as never);
    vi.spyOn(s3PresignService, "resolveUploadUrlForRead").mockResolvedValue(
      null,
    );

    const result = await getAdminDisputeById("dispute-1");

    expect(result.booking.bookingNumber).toBe("BK-001");
    expect(result.evidence[0]?.fileUrl).toBe("https://example.com/file.jpg");
  });
});
