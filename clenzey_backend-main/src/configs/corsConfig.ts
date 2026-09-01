import { envConfig } from "./environmentConfig.ts";
import { isDevTunnelOrigin, normalizeOrigin } from "../utilities/originUtils.ts";

export const isAllowedCorsOrigin = (origin: string | undefined): boolean => {
  if (!origin) {
    return true;
  }

  const normalized = normalizeOrigin(origin);

  // If wildcard configured or matches Vercel deployments
  if (
    envConfig.CORS_ORIGINS.includes("*") ||
    envConfig.CORS_ORIGINS.includes(normalized) ||
    envConfig.SOCKET_CORS_ORIGINS.includes("*") ||
    envConfig.SOCKET_CORS_ORIGINS.includes(normalized) ||
    normalized.endsWith(".vercel.app") ||
    normalized.includes("localhost") ||
    normalized.includes("127.0.0.1") ||
    (envConfig.NODE_ENV !== "prod" && isDevTunnelOrigin(normalized))
  ) {
    return true;
  }

  return false;
};

