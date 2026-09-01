import { envConfig } from "./environmentConfig.ts";
import { isDevTunnelOrigin, normalizeOrigin } from "../utilities/originUtils.ts";

export const isAllowedCorsOrigin = (origin: string | undefined): boolean => {
  if (!origin) {
    return true;
  }

  const normalized = normalizeOrigin(origin);

  if (envConfig.CORS_ORIGINS.includes(normalized)) {
    return true;
  }

  if (envConfig.SOCKET_CORS_ORIGINS.includes(normalized)) {
    return true;
  }

  if (envConfig.NODE_ENV !== "prod" && isDevTunnelOrigin(normalized)) {
    return true;
  }

  return false;
};
