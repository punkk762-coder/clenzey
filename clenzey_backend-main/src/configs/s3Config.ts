import { S3Client, type S3ClientConfig } from "@aws-sdk/client-s3";

import { envConfig } from "./environmentConfig.ts";

let cachedClient: null | S3Client = null;

export type UploadConfig = {
  bucket: string;
  endpoint?: string;
  expiresInSec: number;
  publicBaseUrl: string;
  region: string;
};

export const getUploadConfig = (): UploadConfig => {
  if (
    !envConfig.OBJECT_STORAGE_BUCKET ||
    !envConfig.OBJECT_STORAGE_PUBLIC_BASE_URL
  ) {
    throw new Error(
      "Object storage uploads are not configured. Set OBJECT_STORAGE_BUCKET and OBJECT_STORAGE_PUBLIC_BASE_URL.",
    );
  }

  return {
    bucket: envConfig.OBJECT_STORAGE_BUCKET,
    ...(envConfig.OBJECT_STORAGE_ENDPOINT
      ? { endpoint: envConfig.OBJECT_STORAGE_ENDPOINT }
      : {}),
    expiresInSec: envConfig.OBJECT_STORAGE_PRESIGN_EXPIRES_SEC,
    publicBaseUrl: envConfig.OBJECT_STORAGE_PUBLIC_BASE_URL.replace(/\/$/, ""),
    region: envConfig.OBJECT_STORAGE_REGION,
  };
};

export const getS3Client = (): S3Client => {
  if (cachedClient) return cachedClient;

  const { region, endpoint } = getUploadConfig();

  const clientConfig: S3ClientConfig = { region };

  if (endpoint) {
    clientConfig.endpoint = endpoint;
    clientConfig.forcePathStyle = true;
  }

  if (
    envConfig.OBJECT_STORAGE_ACCESS_KEY_ID &&
    envConfig.OBJECT_STORAGE_SECRET_ACCESS_KEY
  ) {
    clientConfig.credentials = {
      accessKeyId: envConfig.OBJECT_STORAGE_ACCESS_KEY_ID,
      secretAccessKey: envConfig.OBJECT_STORAGE_SECRET_ACCESS_KEY,
    };
  }

  cachedClient = new S3Client(clientConfig);

  return cachedClient;
};
