import { envConfig } from "../configs/environmentConfig.ts";

export const isAllowedUploadUrl = (fileUrl: string): boolean => {
  if (envConfig.ALLOWED_UPLOAD_URL_ORIGINS.length === 0) {
    return true;
  }

  try {
    const origin = new URL(fileUrl).origin;
    return envConfig.ALLOWED_UPLOAD_URL_ORIGINS.includes(origin);
  } catch {
    return false;
  }
};
