import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetSignedUrl, mockGetS3Client, mockGetUploadConfig } = vi.hoisted(
  () => ({
    mockGetSignedUrl: vi.fn(),
    mockGetS3Client: vi.fn(),
    mockGetUploadConfig: vi.fn(),
  }),
);

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: mockGetSignedUrl,
}));

vi.mock("../src/configs/s3Config.ts", () => ({
  getS3Client: mockGetS3Client,
  getUploadConfig: mockGetUploadConfig,
}));

import {
  buildObjectKey,
  createPresignedImageDownload,
  createPresignedImageUpload,
  extensionForContentType,
  isManagedUploadUrl,
  parseStoredUploadKey,
  resolveUploadUrlForRead,
  usesPrivateObjectUrls,
} from "../src/services/s3PresignService.ts";

describe("extensionForContentType", () => {
  it("maps jpeg to .jpg", () => {
    expect(extensionForContentType("image/jpeg")).toBe(".jpg");
  });

  it("maps png to .png", () => {
    expect(extensionForContentType("image/png")).toBe(".png");
  });

  it("returns undefined for unsupported types", () => {
    expect(extensionForContentType("image/gif")).toBeUndefined();
  });
});

describe("parseStoredUploadKey", () => {
  beforeEach(() => {
    mockGetUploadConfig.mockReturnValue({
      bucket: "clenzey-dev-uploads",
      expiresInSec: 900,
      publicBaseUrl:
        "https://clenzey-dev-uploads.s3.ap-south-1.amazonaws.com",
      region: "ap-south-1",
    });
  });

  it("returns null for invalid URLs", () => {
    expect(parseStoredUploadKey("not-a-url")).toBeNull();
  });

  it("extracts object key from S3 URL", () => {
    expect(
      parseStoredUploadKey(
        "https://clenzey-dev-uploads.s3.ap-south-1.amazonaws.com/profile/user/file.jpg",
      ),
    ).toBe("profile/user/file.jpg");
  });

  it("strips bucket prefix from path-style S3-compatible URLs", () => {
    mockGetUploadConfig.mockReturnValue({
      bucket: "clenzey-uploads",
      endpoint: "https://inmumbai.utho.io",
      expiresInSec: 900,
      publicBaseUrl: "https://storage.clenzey.com",
      region: "auto",
    });

    expect(
      parseStoredUploadKey(
        "https://inmumbai.utho.io/clenzey-uploads/profile/user/file.jpg",
      ),
    ).toBe("profile/user/file.jpg");
  });
});

describe("buildObjectKey", () => {
  const userId = "550e8400-e29b-41d4-a716-446655440000";
  const bookingId = "660e8400-e29b-41d4-a716-446655440001";

  it("builds kyc key under partner folder", () => {
    const key = buildObjectKey("kyc", userId, ".jpg");
    expect(key).toMatch(/^kyc\/550e8400-e29b-41d4-a716-446655440000\/.+\.jpg$/);
  });

  it("builds booking photo key with booking id", () => {
    const key = buildObjectKey("booking_photo", userId, ".png", bookingId);
    expect(key).toMatch(
      /^booking-photos\/550e8400-e29b-41d4-a716-446655440000\/660e8400-e29b-41d4-a716-446655440001\/.+\.png$/,
    );
  });

  it("builds booking photo key without booking id", () => {
    const key = buildObjectKey("booking_photo", userId, ".webp");
    expect(key).toMatch(
      /^booking-photos\/550e8400-e29b-41d4-a716-446655440000\/.+\.webp$/,
    );
  });

  it("builds profile key under user folder", () => {
    const key = buildObjectKey("profile", userId, ".heic");
    expect(key).toMatch(/^profile\/550e8400-e29b-41d4-a716-446655440000\/.+\.heic$/);
  });

  it("builds dispute evidence key under user and booking folders", () => {
    const key = buildObjectKey(
      "dispute_evidence",
      userId,
      ".jpg",
      bookingId,
    );
    expect(key).toMatch(
      /^dispute-evidence\/550e8400-e29b-41d4-a716-446655440000\/660e8400-e29b-41d4-a716-446655440001\/.+\.jpg$/,
    );
  });
});

describe("usesPrivateObjectUrls", () => {
  it("returns true for direct S3 base URLs", () => {
    mockGetUploadConfig.mockReturnValue({
      bucket: "clenzey-dev-uploads",
      expiresInSec: 900,
      publicBaseUrl:
        "https://clenzey-dev-uploads.s3.ap-south-1.amazonaws.com",
      region: "ap-south-1",
    });

    expect(usesPrivateObjectUrls()).toBe(true);
  });

  it("returns false for CloudFront base URLs", () => {
    mockGetUploadConfig.mockReturnValue({
      bucket: "clenzey-dev-uploads",
      expiresInSec: 900,
      publicBaseUrl: "https://cdn.clenzey.com",
      region: "ap-south-1",
    });

    expect(usesPrivateObjectUrls()).toBe(false);
  });

  it("returns true when S3-compatible endpoint is configured (Utho)", () => {
    mockGetUploadConfig.mockReturnValue({
      bucket: "clenzey-uploads",
      endpoint: "https://inmumbai.utho.io",
      expiresInSec: 900,
      publicBaseUrl: "https://storage.clenzey.com",
      region: "auto",
    });

    expect(usesPrivateObjectUrls()).toBe(true);
  });
});

describe("isManagedUploadUrl", () => {
  beforeEach(() => {
    mockGetUploadConfig.mockReturnValue({
      bucket: "clenzey-dev-uploads",
      expiresInSec: 900,
      publicBaseUrl:
        "https://clenzey-dev-uploads.s3.ap-south-1.amazonaws.com",
      region: "ap-south-1",
    });
  });

  it("accepts URLs from configured bucket origin", () => {
    expect(
      isManagedUploadUrl(
        "https://clenzey-dev-uploads.s3.ap-south-1.amazonaws.com/profile/user/file.jpg",
      ),
    ).toBe(true);
  });

  it("rejects unrelated origins", () => {
    expect(isManagedUploadUrl("https://evil.example.com/profile/user/file.jpg")).toBe(
      false,
    );
  });

  it("accepts URLs from S3-compatible endpoint origin", () => {
    mockGetUploadConfig.mockReturnValue({
      bucket: "clenzey-uploads",
      endpoint: "https://inmumbai.utho.io",
      expiresInSec: 900,
      publicBaseUrl: "https://storage.clenzey.com",
      region: "auto",
    });

    expect(
      isManagedUploadUrl(
        "https://inmumbai.utho.io/clenzey-uploads/profile/user/file.jpg",
      ),
    ).toBe(true);
  });
});

describe("resolveUploadUrlForRead", () => {
  beforeEach(() => {
    mockGetSignedUrl.mockReset();
    mockGetUploadConfig.mockReturnValue({
      bucket: "clenzey-dev-uploads",
      expiresInSec: 900,
      publicBaseUrl:
        "https://clenzey-dev-uploads.s3.ap-south-1.amazonaws.com",
      region: "ap-south-1",
    });
    mockGetS3Client.mockReturnValue({});
    mockGetSignedUrl.mockResolvedValue(
      "https://clenzey-dev-uploads.s3.ap-south-1.amazonaws.com/profile/user/file.jpg?X-Amz-Signature=abc",
    );
  });

  it("returns presigned GET URL for private S3 stored URLs", async () => {
    const stored =
      "https://clenzey-dev-uploads.s3.ap-south-1.amazonaws.com/profile/user/file.jpg";
    const resolved = await resolveUploadUrlForRead(stored);

    expect(resolved).toContain("X-Amz-Signature=abc");
    expect(mockGetSignedUrl).toHaveBeenCalledOnce();
  });

  it("returns presigned GET URL for Utho stored URLs via public base URL", async () => {
    mockGetUploadConfig.mockReturnValue({
      bucket: "clenzey-uploads",
      endpoint: "https://inmumbai.utho.io",
      expiresInSec: 900,
      publicBaseUrl: "https://storage.clenzey.com",
      region: "auto",
    });

    const stored = "https://storage.clenzey.com/profile/user/file.jpg";
    const resolved = await resolveUploadUrlForRead(stored);

    expect(resolved).toContain("X-Amz-Signature=abc");
    expect(mockGetSignedUrl).toHaveBeenCalledOnce();
  });

  it("returns CloudFront URLs unchanged", async () => {
    mockGetUploadConfig.mockReturnValue({
      bucket: "clenzey-dev-uploads",
      expiresInSec: 900,
      publicBaseUrl: "https://cdn.clenzey.com",
      region: "ap-south-1",
    });

    const stored = "https://cdn.clenzey.com/profile/user/file.jpg";
    const resolved = await resolveUploadUrlForRead(stored);

    expect(resolved).toBe(stored);
    expect(mockGetSignedUrl).not.toHaveBeenCalled();
  });

  it("returns null for null input", async () => {
    expect(await resolveUploadUrlForRead(null)).toBeNull();
  });
});

describe("createPresignedImageUpload", () => {
  beforeEach(() => {
    mockGetSignedUrl.mockReset();
    mockGetUploadConfig.mockReset();
    mockGetS3Client.mockReset();

    mockGetUploadConfig.mockReturnValue({
      bucket: "clenzey-test-uploads",
      expiresInSec: 900,
      publicBaseUrl: "https://cdn.clenzey.com",
      region: "ap-south-1",
    });
    mockGetS3Client.mockReturnValue({});
    mockGetSignedUrl.mockResolvedValue(
      "https://clenzey-test-uploads.s3.ap-south-1.amazonaws.com/kyc/user/file.jpg?X-Amz-Signature=abc",
    );
  });

  it("returns presigned upload payload with CloudFront fileUrl", async () => {
    const result = await createPresignedImageUpload({
      contentType: "image/jpeg",
      purpose: "kyc",
      userId: "550e8400-e29b-41d4-a716-446655440000",
    });

    expect(result.method).toBe("PUT");
    expect(result.expiresIn).toBe(900);
    expect(result.headers).toEqual({ "Content-Type": "image/jpeg" });
    expect(result.uploadUrl).toContain("clenzey-test-uploads.s3.ap-south-1.amazonaws.com");
    expect(result.fileUrl).toMatch(
      /^https:\/\/cdn\.clenzey\.com\/kyc\/550e8400-e29b-41d4-a716-446655440000\/.+\.jpg$/,
    );
    expect(result.key).toBe(result.fileUrl.replace("https://cdn.clenzey.com/", ""));
    expect(mockGetSignedUrl).toHaveBeenCalledOnce();
  });

  it("rejects unsupported content types", async () => {
    await expect(
      createPresignedImageUpload({
        contentType: "image/gif" as "image/jpeg",
        purpose: "profile",
        userId: "550e8400-e29b-41d4-a716-446655440000",
      }),
    ).rejects.toThrow("Unsupported image content type");
  });
});

describe("createPresignedImageDownload", () => {
  beforeEach(() => {
    mockGetSignedUrl.mockReset();
    mockGetUploadConfig.mockReturnValue({
      bucket: "clenzey-test-uploads",
      expiresInSec: 900,
      publicBaseUrl: "https://cdn.clenzey.com",
      region: "ap-south-1",
    });
    mockGetS3Client.mockReturnValue({});
    mockGetSignedUrl.mockResolvedValue(
      "https://clenzey-test-uploads.s3.ap-south-1.amazonaws.com/profile/user/file.jpg?X-Amz-Signature=abc",
    );
  });

  it("returns a presigned GET URL for an object key", async () => {
    const url = await createPresignedImageDownload("profile/user/file.jpg", 600);
    expect(url).toContain("X-Amz-Signature=abc");
    expect(mockGetSignedUrl).toHaveBeenCalledOnce();
  });
});
