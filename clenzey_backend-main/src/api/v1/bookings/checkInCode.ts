import { randomInt, timingSafeEqual } from "node:crypto";

import { HttpStatusCode } from "axios";

import { AppError } from "../../../errors/appErrors.ts";
import ErrorCode from "../../../errors/errorCode.ts";
import type { BookingStatus } from "./stateMachine.ts";

export const ACTIVE_CHECK_IN_STATUSES: BookingStatus[] = [
  "PENDING",
  "PAYMENT_PENDING",
  "CONFIRMED",
  "PROFESSIONAL_ASSIGNED",
  "PROFESSIONAL_EN_ROUTE",
  "CHECKED_IN",
  "IN_PROGRESS",
];

/** Statuses where the consumer may see the verification code. */
export const CONSUMER_VISIBLE_CODE_STATUSES: BookingStatus[] = [
  "PROFESSIONAL_ASSIGNED",
  "PROFESSIONAL_EN_ROUTE",
];

const MAX_GENERATION_ATTEMPTS = 10;

export const generateCheckInCode = (): string =>
  String(randomInt(1000, 10000));

type PgError = Error & { code?: string; constraint?: string };

const isPgError = (err: unknown): err is PgError =>
  err instanceof Error && typeof (err as PgError).code === "string";

const unwrapDbError = (err: unknown): unknown => {
  if (
    err &&
    typeof err === "object" &&
    "cause" in err &&
    (err as { cause: unknown }).cause
  ) {
    return (err as { cause: unknown }).cause;
  }
  return err;
};

export const isCheckInCodeUniqueViolation = (err: unknown): boolean => {
  const root = unwrapDbError(err);
  if (!isPgError(root) || root.code !== "23505") return false;
  return (
    root.constraint === "bookings_active_check_in_code_uidx" ||
    root.message?.includes("bookings_active_check_in_code_uidx") === true
  );
};

/**
 * Retry a booking insert that may fail on active check-in-code uniqueness.
 */
export const withUniqueCheckInCode = async <T>(
  insert: (code: string) => Promise<T>,
): Promise<T> => {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    const code = generateCheckInCode();
    try {
      return await insert(code);
    } catch (err) {
      lastError = err;
      if (!isCheckInCodeUniqueViolation(err)) throw err;
    }
  }

  throw new AppError(
    "Unable to allocate a unique verification code. Please try again.",
    {
      error: { code: ErrorCode.SERVER_ERROR },
      statusCode: HttpStatusCode.ServiceUnavailable,
    },
  );
};

/** Constant-time compare for 4-digit codes. */
export const codesMatch = (expected: string, provided: string): boolean => {
  const a = Buffer.from(String(expected).padStart(4, "0").slice(0, 4));
  const b = Buffer.from(String(provided).padStart(4, "0").slice(0, 4));
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
};
