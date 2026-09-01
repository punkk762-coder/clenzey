import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { nanoid } from "nanoid";

import { getS3Client, getUploadConfig } from "../configs/s3Config.ts";
import { BadRequestError } from "../errors/appErrors.ts";

const getUploadConfigSafe = (): ReturnType<typeof getUploadConfig> | null => {
  try {
    return getUploadConfig();
  } catch {
    return null;
  }
};

const getManagedUploadOrigins = (): Set<string> => {
  const config = getUploadConfigSafe();
  if (!config) return new Set();

  const origins = new Set<string>([
    new URL(config.publicBaseUrl).origin,
    `https://${config.bucket}.s3.${config.region}.amazonaws.com`,
    `https://${config.bucket}.s3.amazonaws.com`,
  ]);

  if (config.endpoint) {
    origins.add(new URL(config.endpoint).origin);
  }

  return origins;
};

export const ALLOWED_IMAGE_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
] as const;

export type UploadPurpose = "booking_photo" | "dispute_evidence" | "kyc" | "profile";

export type PresignedImageUploadInput = {
  bookingId?: string;
  contentType: (typeof ALLOWED_IMAGE_CONTENT_TYPES)[number];
  purpose: UploadPurpose;
  userId: string;
};

export type PresignedImageUploadResult = {
  expiresIn: number;
  fileUrl: string;
  headers: { "Content-Type": string };
  key: string;
  method: "PUT";
  uploadUrl: string;
};

const CONTENT_TYPE_TO_EXT: Record<
  (typeof ALLOWED_IMAGE_CONTENT_TYPES)[number],
  string
> = {
  "image/heic": ".heic",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export const parseStoredUploadKey = (storedUrl: string): string | null => {
  try {
    const url = new URL(storedUrl);
    let key = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
    const config = getUploadConfigSafe();

    if (
      config?.endpoint &&
      url.origin === new URL(config.endpoint).origin &&
      key.startsWith(`${config.bucket}/`)
    ) {
      key = key.slice(config.bucket.length + 1);
    }

    return key || null;
  } catch {
    return null;
  }
};

export const isManagedUploadUrl = (storedUrl: string): boolean => {
  try {
    const url = new URL(storedUrl);
    return getManagedUploadOrigins().has(url.origin);
  } catch {
    return false;
  }
};

/** True when objects are stored on a private bucket URL (not a public CDN). */
export const usesPrivateObjectUrls = (): boolean => {
  const config = getUploadConfigSafe();
  if (!config) return false;

  if (config.endpoint) return true;

  try {
    return /\.s3(\.[a-z0-9-]+)?\.amazonaws\.com$/i.test(
      new URL(config.publicBaseUrl).hostname,
    );
  } catch {
    return false;
  }
};

export const createPresignedImageDownload = async (
  key: string,
  expiresInSec?: number,
): Promise<string> => {
  const { bucket, expiresInSec: defaultExpires } = getUploadConfig();
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });

  return getSignedUrl(getS3Client(), command, {
    expiresIn: expiresInSec ?? defaultExpires,
  });
};

/**
 * Returns a browser-accessible URL for a stored upload.
 * For private S3 buckets (dev), generates a presigned GET URL.
 * For CloudFront/public CDN URLs, returns the stored URL unchanged.
 */
export const resolveUploadUrlForRead = async (
  storedUrl: string | null | undefined,
): Promise<string | null> => {
  if (!storedUrl) return null;
  if (!usesPrivateObjectUrls() || !isManagedUploadUrl(storedUrl)) {
    return storedUrl;
  }

  const key = parseStoredUploadKey(storedUrl);
  if (!key) return storedUrl;

  try {
    return await createPresignedImageDownload(key);
  } catch {
    return storedUrl;
  }
};

export const extensionForContentType = (
  contentType: string,
): string | undefined => {
  if (
    !ALLOWED_IMAGE_CONTENT_TYPES.includes(
      contentType as (typeof ALLOWED_IMAGE_CONTENT_TYPES)[number],
    )
  ) {
    return undefined;
  }
  return CONTENT_TYPE_TO_EXT[
    contentType as (typeof ALLOWED_IMAGE_CONTENT_TYPES)[number]
  ];
};

export const buildObjectKey = (
  purpose: UploadPurpose,
  userId: string,
  ext: string,
  bookingId?: string,
): string => {
  const fileName = `${nanoid()}${ext}`;

  switch (purpose) {
    case "kyc":
      return `kyc/${userId}/${fileName}`;
    case "booking_photo":
      return bookingId
        ? `booking-photos/${userId}/${bookingId}/${fileName}`
        : `booking-photos/${userId}/${fileName}`;
    case "dispute_evidence":
      if (!bookingId) {
        throw new BadRequestError("bookingId is required for dispute evidence uploads.");
      }
      return `dispute-evidence/${userId}/${bookingId}/${fileName}`;
    case "profile":
      return `profile/${userId}/${fileName}`;
  }
};

export const createPresignedImageUpload = async (
  input: PresignedImageUploadInput,
): Promise<PresignedImageUploadResult> => {
  const ext = extensionForContentType(input.contentType);
  if (!ext) {
    throw new BadRequestError("Unsupported image content type.");
  }

  const { bucket, expiresInSec, publicBaseUrl } = getUploadConfig();
  const key = buildObjectKey(
    input.purpose,
    input.userId,
    ext,
    input.bookingId,
  );

  const command = new PutObjectCommand({
    Bucket: bucket,
    ContentType: input.contentType,
    Key: key,
  });

  const uploadUrl = await getSignedUrl(getS3Client(), command, {
    expiresIn: expiresInSec,
  });

  return {
    expiresIn: expiresInSec,
    fileUrl: `${publicBaseUrl}/${key}`,
    headers: { "Content-Type": input.contentType },
    key,
    method: "PUT",
    uploadUrl,
  };
};
