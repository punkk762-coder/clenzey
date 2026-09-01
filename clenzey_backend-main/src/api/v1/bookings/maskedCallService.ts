import { HttpStatusCode } from "axios";

import { AppError } from "../../../errors/appErrors.ts";
import ErrorCode from "../../../errors/errorCode.ts";

/**
 * Returns HTTP 503 — masked calling is unavailable until Phase 2 (Exotel).
 */
export const initiateCall = async (
  bookingId: string,
  consumerId: string,
): Promise<never> => {
  throw new AppError("Calling service is temporarily unavailable", {
    error: { code: ErrorCode.EXTERNAL_SERVICE_ERROR },
    statusCode: HttpStatusCode.ServiceUnavailable,
  });
};

/**
 * No-op. Returns immediately without performing any external calls.
 */
export const deactivateSession = async (bookingId: string): Promise<void> => {
  // Intentionally empty — masked calling is stubbed out pending Phase 2 (Exotel).
};
