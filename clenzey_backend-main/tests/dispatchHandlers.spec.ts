import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Job } from "bullmq";

const {
  mockProcessInstantDispatch,
  mockEscalateToAdmin,
  mockExpandRadius,
  mockEnqueueRedispatch,
  mockFindBookingById,
  mockFindUnassignedScheduledBookings,
  mockFindBookingsDueForRevalidation,
  mockEnqueueScheduledAssign,
  mockEnqueueRevalidate,
  mockProcessScheduledAssign,
  mockRevalidateScheduledBooking,
} = vi.hoisted(() => ({
  mockProcessInstantDispatch: vi.fn(),
  mockEscalateToAdmin: vi.fn(),
  mockExpandRadius: vi.fn(),
  mockEnqueueRedispatch: vi.fn(),
  mockFindBookingById: vi.fn(),
  mockFindUnassignedScheduledBookings: vi.fn(),
  mockFindBookingsDueForRevalidation: vi.fn(),
  mockEnqueueScheduledAssign: vi.fn(),
  mockEnqueueRevalidate: vi.fn(),
  mockProcessScheduledAssign: vi.fn(),
  mockRevalidateScheduledBooking: vi.fn(),
}));

vi.mock("../src/api/v1/bookings/dispatchService.ts", () => ({
  processInstantDispatch: mockProcessInstantDispatch,
  escalateToAdmin: mockEscalateToAdmin,
  expandRadius: mockExpandRadius,
  findUnassignedScheduledBookings: mockFindUnassignedScheduledBookings,
  findBookingsDueForRevalidation: mockFindBookingsDueForRevalidation,
  processScheduledAssign: mockProcessScheduledAssign,
  revalidateScheduledBooking: mockRevalidateScheduledBooking,
}));

vi.mock("../src/api/v1/bookings/repository.ts", () => ({
  findBookingById: mockFindBookingById,
}));

vi.mock("../src/queues/dispatchQueue.ts", () => ({
  enqueueRedispatch: mockEnqueueRedispatch,
  enqueueScheduledAssign: mockEnqueueScheduledAssign,
  enqueueRevalidate: mockEnqueueRevalidate,
}));

import {
  handleEscalate,
  handleInstantDispatch,
  handleRedispatch,
  handleRevalidate,
  handleScheduledAssign,
  runRevalidateScan,
  runScheduledBatch,
} from "../src/workers/dispatchHandlers.ts";

const instantJob = (data: {
  bookingId: string;
  firstDispatchAt?: string;
  radiusMeters?: number;
}) => ({ data }) as Job<{ bookingId: string; firstDispatchAt?: string; radiusMeters?: number }>;

describe("handleInstantDispatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnqueueRedispatch.mockResolvedValue(true);
  });

  it("returns immediately when dispatch assigns or skips", async () => {
    mockProcessInstantDispatch.mockResolvedValue({
      status: "ASSIGNED",
      escalated: false,
      maxRadiusReached: false,
      radiusMeters: 5000,
    });

    const result = await handleInstantDispatch(
      instantJob({ bookingId: "booking-1", radiusMeters: 5000 }),
    );

    expect(result.status).toBe("ASSIGNED");
    expect(mockEnqueueRedispatch).not.toHaveBeenCalled();
  });

  it("returns escalated results without re-enqueueing", async () => {
    mockProcessInstantDispatch.mockResolvedValue({
      status: "ESCALATED",
      escalated: true,
      maxRadiusReached: true,
      radiusMeters: 15000,
    });

    const result = await handleInstantDispatch(
      instantJob({ bookingId: "booking-1", radiusMeters: 15000 }),
    );

    expect(result.status).toBe("ESCALATED");
    expect(mockEnqueueRedispatch).not.toHaveBeenCalled();
  });

  it("enqueues redispatch with expanded radius when candidates are missing", async () => {
    mockProcessInstantDispatch.mockResolvedValue({
      status: "NO_CANDIDATES",
      escalated: false,
      maxRadiusReached: false,
      radiusMeters: 5000,
    });
    mockExpandRadius.mockReturnValue(7000);

    await handleInstantDispatch(
      instantJob({
        bookingId: "booking-1",
        firstDispatchAt: "2026-07-12T10:00:00.000Z",
        radiusMeters: 5000,
      }),
    );

    expect(mockEnqueueRedispatch).toHaveBeenCalledWith({
      bookingId: "booking-1",
      firstDispatchAt: "2026-07-12T10:00:00.000Z",
      radiusMeters: 7000,
    });
  });

  it("re-enqueues at same radius when max radius is reached but not escalated", async () => {
    mockProcessInstantDispatch.mockResolvedValue({
      status: "NO_CANDIDATES",
      escalated: false,
      maxRadiusReached: true,
      radiusMeters: 15000,
    });
    mockExpandRadius.mockReturnValue(15000);

    await handleInstantDispatch(
      instantJob({
        bookingId: "booking-1",
        firstDispatchAt: "2026-07-12T10:00:00.000Z",
        radiusMeters: 15000,
      }),
    );

    expect(mockEnqueueRedispatch).toHaveBeenCalledWith({
      bookingId: "booking-1",
      firstDispatchAt: "2026-07-12T10:00:00.000Z",
      radiusMeters: 15000,
    });
  });
});

describe("handleRedispatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnqueueRedispatch.mockResolvedValue(true);
  });

  it("returns without re-enqueueing when dispatch finishes", async () => {
    mockProcessInstantDispatch.mockResolvedValue({
      status: "NO_CANDIDATES",
      escalated: false,
      maxRadiusReached: true,
      radiusMeters: 15000,
    });

    const result = await handleRedispatch(
      instantJob({
        bookingId: "booking-2",
        firstDispatchAt: "2026-07-12T10:00:00.000Z",
        radiusMeters: 15000,
      }),
    );

    expect(result.status).toBe("NO_CANDIDATES");
    expect(mockEnqueueRedispatch).not.toHaveBeenCalled();
  });

  it("does not re-enqueue when dispatch reports no candidates", async () => {
    mockProcessInstantDispatch.mockResolvedValue({
      status: "NO_CANDIDATES",
      escalated: false,
      maxRadiusReached: false,
      radiusMeters: 7000,
    });

    const result = await handleRedispatch(
      instantJob({
        bookingId: "booking-2",
        firstDispatchAt: "2026-07-12T10:00:00.000Z",
        radiusMeters: 7000,
      }),
    );

    expect(result.status).toBe("NO_CANDIDATES");
    expect(mockEnqueueRedispatch).not.toHaveBeenCalled();
    expect(mockExpandRadius).not.toHaveBeenCalled();
  });

  it("enqueues expanded radius during redispatch when more radius remains", async () => {
    mockProcessInstantDispatch.mockResolvedValue({
      status: "SEARCHING",
      escalated: false,
      maxRadiusReached: false,
      radiusMeters: 7000,
    });
    mockExpandRadius.mockReturnValue(9000);

    await handleRedispatch(
      instantJob({
        bookingId: "booking-2",
        firstDispatchAt: "2026-07-12T10:00:00.000Z",
        radiusMeters: 7000,
      }),
    );

    expect(mockEnqueueRedispatch).toHaveBeenCalledWith({
      bookingId: "booking-2",
      firstDispatchAt: "2026-07-12T10:00:00.000Z",
      radiusMeters: 9000,
    });
  });
});

describe("handleEscalate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skips when booking is missing or no longer eligible", async () => {
    mockFindBookingById.mockResolvedValue(null);

    const result = await handleEscalate(
      instantJob({ bookingId: "booking-3" }),
    );

    expect(result).toEqual({ status: "SKIPPED" });
    expect(mockEscalateToAdmin).not.toHaveBeenCalled();
  });

  it("escalates eligible instant bookings to admin", async () => {
    mockFindBookingById.mockResolvedValue({
      id: "booking-3",
      partnerId: null,
      status: "CONFIRMED",
      bookingType: "INSTANT",
    });
    mockEscalateToAdmin.mockResolvedValue(true);

    const result = await handleEscalate(
      instantJob({ bookingId: "booking-3" }),
    );

    expect(mockEscalateToAdmin).toHaveBeenCalledWith("booking-3", {
      id: "booking-3",
      partnerId: null,
      status: "CONFIRMED",
      bookingType: "INSTANT",
    });
    expect(result).toEqual({ status: "ESCALATED" });
  });

  it("skips when escalation helper declines", async () => {
    mockFindBookingById.mockResolvedValue({
      id: "booking-4",
      partnerId: null,
      status: "CONFIRMED",
      bookingType: "INSTANT",
    });
    mockEscalateToAdmin.mockResolvedValue(false);

    const result = await handleEscalate(
      instantJob({ bookingId: "booking-4" }),
    );

    expect(result).toEqual({ status: "SKIPPED" });
  });
});

describe("handleScheduledAssign", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("delegates to processScheduledAssign with explicit mode", async () => {
    mockProcessScheduledAssign.mockResolvedValue({ status: "ASSIGNED" });

    const result = await handleScheduledAssign(
      instantJob({
        bookingId: "booking-scheduled",
        mode: "SCHEDULED_REVALIDATE",
      } as { bookingId: string; mode?: string }),
    );

    expect(mockProcessScheduledAssign).toHaveBeenCalledWith(
      "booking-scheduled",
      "SCHEDULED_REVALIDATE",
    );
    expect(result).toEqual({ status: "ASSIGNED" });
  });

  it("defaults mode to SCHEDULED_BATCH", async () => {
    mockProcessScheduledAssign.mockResolvedValue({ status: "NO_CANDIDATES" });

    await handleScheduledAssign(
      instantJob({ bookingId: "booking-scheduled" }),
    );

    expect(mockProcessScheduledAssign).toHaveBeenCalledWith(
      "booking-scheduled",
      "SCHEDULED_BATCH",
    );
  });
});

describe("handleRevalidate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("delegates to revalidateScheduledBooking", async () => {
    mockRevalidateScheduledBooking.mockResolvedValue({ status: "REVALIDATED" });

    const result = await handleRevalidate(
      instantJob({ bookingId: "booking-revalidate" }),
    );

    expect(mockRevalidateScheduledBooking).toHaveBeenCalledWith(
      "booking-revalidate",
    );
    expect(result).toEqual({ status: "REVALIDATED" });
  });
});

describe("runScheduledBatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnqueueScheduledAssign.mockResolvedValue(true);
  });

  it("enqueues unique scheduled assignments from tomorrow and catchup windows", async () => {
    mockFindUnassignedScheduledBookings
      .mockResolvedValueOnce(["booking-a", "booking-b"])
      .mockResolvedValueOnce(["booking-b", "booking-c"]);

    const result = await runScheduledBatch();

    expect(result).toEqual({ enqueuedCount: 3 });
    expect(mockEnqueueScheduledAssign).toHaveBeenCalledTimes(3);
    expect(mockEnqueueScheduledAssign).toHaveBeenCalledWith(
      "booking-a",
      "SCHEDULED_BATCH",
    );
    expect(mockEnqueueScheduledAssign).toHaveBeenCalledWith(
      "booking-c",
      "SCHEDULED_BATCH",
    );
  });

  it("returns zero when no bookings are due", async () => {
    mockFindUnassignedScheduledBookings.mockResolvedValue([]);

    const result = await runScheduledBatch();

    expect(result).toEqual({ enqueuedCount: 0 });
    expect(mockEnqueueScheduledAssign).not.toHaveBeenCalled();
  });
});

describe("runRevalidateScan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnqueueRevalidate.mockResolvedValue(true);
  });

  it("enqueues revalidation jobs for due bookings", async () => {
    mockFindBookingsDueForRevalidation.mockResolvedValue([
      "booking-1",
      "booking-2",
    ]);

    const result = await runRevalidateScan();

    expect(result).toEqual({ enqueuedCount: 2 });
    expect(mockFindBookingsDueForRevalidation).toHaveBeenCalled();
    expect(mockEnqueueRevalidate).toHaveBeenCalledWith("booking-1");
    expect(mockEnqueueRevalidate).toHaveBeenCalledWith("booking-2");
  });

  it("returns zero when no bookings need revalidation", async () => {
    mockFindBookingsDueForRevalidation.mockResolvedValue([]);

    const result = await runRevalidateScan();

    expect(result).toEqual({ enqueuedCount: 0 });
    expect(mockEnqueueRevalidate).not.toHaveBeenCalled();
  });
});
