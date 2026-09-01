import { describe, expect, it, vi } from "vitest";
import z from "zod";

const updateConsumerProfileBody = z
  .object({
    fullName: z.string().min(1).max(100).optional(),
    profileImage: z.string().url().nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one profile field is required.",
  });

describe("consumer profile update validation", () => {
  it("accepts profileImage only", () => {
    const result = updateConsumerProfileBody.safeParse({
      profileImage: "https://cdn.clenzey.com/profile/user/file.jpg",
    });
    expect(result.success).toBe(true);
  });

  it("accepts fullName only", () => {
    const result = updateConsumerProfileBody.safeParse({
      fullName: "Priya Sharma",
    });
    expect(result.success).toBe(true);
  });

  it("accepts both fullName and profileImage", () => {
    const result = updateConsumerProfileBody.safeParse({
      fullName: "Priya Sharma",
      profileImage: "https://cdn.clenzey.com/profile/user/file.jpg",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty patch bodies", () => {
    const result = updateConsumerProfileBody.safeParse({});
    expect(result.success).toBe(false);
  });

  it("accepts clearing profileImage", () => {
    const result = updateConsumerProfileBody.safeParse({ profileImage: null });
    expect(result.success).toBe(true);
  });

  it("rejects invalid profileImage URL", () => {
    const result = updateConsumerProfileBody.safeParse({
      profileImage: "not-a-url",
    });
    expect(result.success).toBe(false);
  });
});

const {
  mockFindUserById,
  mockIsAllowedUploadUrl,
  mockUpdateConsumerProfile,
} = vi.hoisted(() => ({
  mockFindUserById: vi.fn(),
  mockIsAllowedUploadUrl: vi.fn(),
  mockUpdateConsumerProfile: vi.fn(),
}));

vi.mock("../src/validations/uploadUrlValidator.ts", () => ({
  isAllowedUploadUrl: mockIsAllowedUploadUrl,
}));

vi.mock("../src/api/v1/consumers/repository.ts", () => ({
  findUserById: mockFindUserById,
  updateConsumerProfile: mockUpdateConsumerProfile,
}));

import { BadRequestError } from "../src/errors/appErrors.ts";
import { updateProfile as updateConsumerProfile } from "../src/api/v1/consumers/service.ts";

describe("consumer updateProfile service", () => {
  it("rejects profileImage from a disallowed origin", async () => {
    mockIsAllowedUploadUrl.mockReturnValue(false);

    await expect(
      updateConsumerProfile("user-id", {
        profileImage: "https://evil.example.com/profile/user/file.jpg",
      }),
    ).rejects.toThrow(BadRequestError);

    expect(mockUpdateConsumerProfile).not.toHaveBeenCalled();
  });

  it("persists allowed profileImage and returns updated profile", async () => {
    mockIsAllowedUploadUrl.mockReturnValue(true);
    mockUpdateConsumerProfile.mockResolvedValue(undefined);
    mockFindUserById.mockResolvedValue({
      consumer: {
        fullName: "Priya Sharma",
        profileImage: "https://cdn.clenzey.com/profile/user/file.jpg",
        referralCode: "REF123",
      },
      id: "user-id",
      phone: "+919876543210",
    });

    const profile = await updateConsumerProfile("user-id", {
      profileImage: "https://cdn.clenzey.com/profile/user/file.jpg",
    });

    expect(mockUpdateConsumerProfile).toHaveBeenCalledWith("user-id", {
      profileImage: "https://cdn.clenzey.com/profile/user/file.jpg",
    });
    expect(profile.profileImage).toBe(
      "https://cdn.clenzey.com/profile/user/file.jpg",
    );
  });
});

const {
  mockFindPartnerById,
  mockUpdatePartnerProfile,
} = vi.hoisted(() => ({
  mockFindPartnerById: vi.fn(),
  mockUpdatePartnerProfile: vi.fn(),
}));

vi.mock("../src/api/v1/partners/repository.ts", () => ({
  findPartnerById: mockFindPartnerById,
  updatePartnerProfile: mockUpdatePartnerProfile,
}));

import { updateProfile as updatePartnerProfile } from "../src/api/v1/partners/service.ts";

describe("partner updateProfile service", () => {
  it("rejects profileImage from a disallowed origin", async () => {
    mockIsAllowedUploadUrl.mockReturnValue(false);

    await expect(
      updatePartnerProfile("partner-id", {
        profileImage: "https://evil.example.com/profile/partner/file.jpg",
      }),
    ).rejects.toThrow(BadRequestError);

    expect(mockUpdatePartnerProfile).not.toHaveBeenCalled();
  });
});
