import { describe, expect, it, vi } from "vitest";

const { mockCreatePresignedImageUpload, mockFindBookingById } = vi.hoisted(
  () => ({
    mockCreatePresignedImageUpload: vi.fn(),
    mockFindBookingById: vi.fn(),
  }),
);

vi.mock("../src/services/s3PresignService.ts", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("../src/services/s3PresignService.ts")
  >();
  return {
    ...actual,
    createPresignedImageUpload: mockCreatePresignedImageUpload,
  };
});

vi.mock("../src/api/v1/bookings/repository.ts", () => ({
  findBookingById: mockFindBookingById,
}));

import {
  assertPurposeAccess,
  presignUpload,
} from "../src/api/v1/uploads/service.ts";
import { ForbiddenError } from "../src/errors/appErrors.ts";
import { PURPOSE_ALLOWED_ROLES } from "../src/api/v1/uploads/validations.ts";

describe("PURPOSE_ALLOWED_ROLES", () => {
  it("restricts kyc and booking_photo to partners", () => {
    expect(PURPOSE_ALLOWED_ROLES.kyc).toEqual(["PARTNER"]);
    expect(PURPOSE_ALLOWED_ROLES.booking_photo).toEqual(["PARTNER"]);
  });

  it("allows consumers and partners to upload dispute evidence", () => {
    expect(PURPOSE_ALLOWED_ROLES.dispute_evidence).toEqual([
      "CONSUMER",
      "PARTNER",
    ]);
  });

  it("allows all authenticated roles for profile", () => {
    expect(PURPOSE_ALLOWED_ROLES.profile).toEqual([
      "ADMIN",
      "CONSUMER",
      "PARTNER",
    ]);
  });
});

describe("assertPurposeAccess", () => {
  it("allows partner for kyc", () => {
    expect(() => assertPurposeAccess("kyc", "PARTNER")).not.toThrow();
  });

  it("rejects consumer for kyc", () => {
    expect(() => assertPurposeAccess("kyc", "CONSUMER")).toThrow(ForbiddenError);
  });

  it("allows consumer for profile", () => {
    expect(() => assertPurposeAccess("profile", "CONSUMER")).not.toThrow();
  });
});

describe("presignUpload service", () => {
  it("delegates to s3 presign service when access is allowed", async () => {
    mockCreatePresignedImageUpload.mockResolvedValue({
      expiresIn: 900,
      fileUrl: "https://cdn.clenzey.com/profile/user/file.jpg",
      headers: { "Content-Type": "image/jpeg" },
      key: "profile/user/file.jpg",
      method: "PUT",
      uploadUrl: "https://bucket.s3.amazonaws.com/profile/user/file.jpg",
    });

    const result = await presignUpload({
      contentType: "image/jpeg",
      purpose: "profile",
      userId: "550e8400-e29b-41d4-a716-446655440000",
      userType: "CONSUMER",
    });

    expect(result.fileUrl).toBe("https://cdn.clenzey.com/profile/user/file.jpg");
    expect(mockCreatePresignedImageUpload).toHaveBeenCalledWith({
      contentType: "image/jpeg",
      purpose: "profile",
      userId: "550e8400-e29b-41d4-a716-446655440000",
    });
  });

  it("validates booking assignment for booking_photo", async () => {
    mockFindBookingById.mockResolvedValue({
      partnerId: "other-partner-id",
    });

    await expect(
      presignUpload({
        bookingId: "660e8400-e29b-41d4-a716-446655440001",
        contentType: "image/jpeg",
        purpose: "booking_photo",
        userId: "550e8400-e29b-41d4-a716-446655440000",
        userType: "PARTNER",
      }),
    ).rejects.toThrow("You are not assigned to this booking.");
  });

  it("throws NotFoundError when booking does not exist", async () => {
    mockFindBookingById.mockResolvedValue(null);

    await expect(
      presignUpload({
        bookingId: "660e8400-e29b-41d4-a716-446655440001",
        contentType: "image/jpeg",
        purpose: "booking_photo",
        userId: "550e8400-e29b-41d4-a716-446655440000",
        userType: "PARTNER",
      }),
    ).rejects.toThrow("Booking not found.");
  });

  it("allows partner dispute evidence for assigned booking", async () => {
    mockFindBookingById.mockResolvedValue({
      consumerId: "other-consumer-id",
      partnerId: "550e8400-e29b-41d4-a716-446655440000",
    });
    mockCreatePresignedImageUpload.mockResolvedValue({
      expiresIn: 900,
      fileUrl: "https://cdn.clenzey.com/dispute-evidence/partner/file.jpg",
      headers: { "Content-Type": "image/jpeg" },
      key: "dispute-evidence/partner/file.jpg",
      method: "PUT",
      uploadUrl: "https://bucket.s3.amazonaws.com/dispute-evidence/partner/file.jpg",
    });

    const result = await presignUpload({
      bookingId: "660e8400-e29b-41d4-a716-446655440001",
      contentType: "image/jpeg",
      purpose: "dispute_evidence",
      userId: "550e8400-e29b-41d4-a716-446655440000",
      userType: "PARTNER",
    });

    expect(result.key).toContain("dispute-evidence/");
  });

  it("rejects partner dispute evidence when not assigned", async () => {
    mockFindBookingById.mockResolvedValue({
      consumerId: "other-consumer-id",
      partnerId: "other-partner-id",
    });

    await expect(
      presignUpload({
        bookingId: "660e8400-e29b-41d4-a716-446655440001",
        contentType: "image/jpeg",
        purpose: "dispute_evidence",
        userId: "550e8400-e29b-41d4-a716-446655440000",
        userType: "PARTNER",
      }),
    ).rejects.toThrow("You are not assigned to this booking.");
  });

  it("allows consumers to presign dispute evidence for their booking", async () => {
    mockFindBookingById.mockResolvedValue({
      consumerId: "550e8400-e29b-41d4-a716-446655440000",
      partnerId: "660e8400-e29b-41d4-a716-446655440001",
    });
    mockCreatePresignedImageUpload.mockResolvedValue({
      expiresIn: 900,
      fileUrl:
        "https://cdn.clenzey.com/dispute-evidence/user/booking/file.jpg",
      headers: { "Content-Type": "image/jpeg" },
      key: "dispute-evidence/user/booking/file.jpg",
      method: "PUT",
      uploadUrl: "https://bucket.s3.amazonaws.com/dispute-evidence/user/booking/file.jpg",
    });

    const result = await presignUpload({
      bookingId: "660e8400-e29b-41d4-a716-446655440001",
      contentType: "image/jpeg",
      purpose: "dispute_evidence",
      userId: "550e8400-e29b-41d4-a716-446655440000",
      userType: "CONSUMER",
    });

    expect(result.key).toContain("dispute-evidence/");
    expect(mockCreatePresignedImageUpload).toHaveBeenCalledWith({
      bookingId: "660e8400-e29b-41d4-a716-446655440001",
      contentType: "image/jpeg",
      purpose: "dispute_evidence",
      userId: "550e8400-e29b-41d4-a716-446655440000",
    });
  });

  it("rejects dispute evidence upload for another consumer's booking", async () => {
    mockFindBookingById.mockResolvedValue({
      consumerId: "other-consumer-id",
      partnerId: "660e8400-e29b-41d4-a716-446655440001",
    });

    await expect(
      presignUpload({
        bookingId: "660e8400-e29b-41d4-a716-446655440001",
        contentType: "image/jpeg",
        purpose: "dispute_evidence",
        userId: "550e8400-e29b-41d4-a716-446655440000",
        userType: "CONSUMER",
      }),
    ).rejects.toThrow("You do not have access to this booking.");
  });
});
