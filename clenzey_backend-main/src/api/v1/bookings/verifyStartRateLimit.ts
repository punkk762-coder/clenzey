import { HttpStatusCode } from "axios";

import { AppError } from "../../../errors/appErrors.ts";
import ErrorCode from "../../../errors/errorCode.ts";
import { getRedisClient } from "../../../configs/redisConfig.ts";

const BOOKING_MAX_ATTEMPTS = 5;
const BOOKING_LOCK_TTL_MS = 15 * 60 * 1000;
const PARTNER_MAX_ATTEMPTS_PER_HOUR = 20;
const PARTNER_WINDOW_MS = 60 * 60 * 1000;

type MemoryEntry = { count: number; expiresAt: number };

const memoryLocks = new Map<string, MemoryEntry>();
const memoryPartnerWindows = new Map<string, number[]>();

const bookingLockKey = (bookingId: string) => `verify-start:booking:${bookingId}`;
const partnerWindowKey = (partnerId: string) => `verify-start:partner:${partnerId}`;

const now = () => Date.now();

const getMemoryLock = (key: string): boolean => {
  const entry = memoryLocks.get(key);
  if (!entry) return false;
  if (entry.expiresAt <= now()) {
    memoryLocks.delete(key);
    return false;
  }
  return true;
};

const setMemoryLock = (key: string, ttlMs: number) => {
  memoryLocks.set(key, { count: 1, expiresAt: now() + ttlMs });
  setTimeout(() => memoryLocks.delete(key), ttlMs).unref();
};

const assertPartnerWindowMemory = (partnerId: string) => {
  const key = partnerId;
  const cutoff = now() - PARTNER_WINDOW_MS;
  const timestamps = (memoryPartnerWindows.get(key) ?? []).filter((t) => t > cutoff);
  if (timestamps.length >= PARTNER_MAX_ATTEMPTS_PER_HOUR) {
    throw new AppError("Too many verification attempts. Please try again later.", {
      error: { code: ErrorCode.RATE_LIMIT_ERROR },
      statusCode: HttpStatusCode.TooManyRequests,
    });
  }
  timestamps.push(now());
  memoryPartnerWindows.set(key, timestamps);
};

const assertPartnerWindowRedis = async (partnerId: string) => {
  const redis = getRedisClient();
  if (!redis) {
    assertPartnerWindowMemory(partnerId);
    return;
  }

  const key = partnerWindowKey(partnerId);
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.pexpire(key, PARTNER_WINDOW_MS);
  }
  if (count > PARTNER_MAX_ATTEMPTS_PER_HOUR) {
    throw new AppError("Too many verification attempts. Please try again later.", {
      error: { code: ErrorCode.RATE_LIMIT_ERROR },
      statusCode: HttpStatusCode.TooManyRequests,
    });
  }
};

export const assertVerifyStartAllowed = async (params: {
  bookingId: string;
  partnerId: string;
  attempts: number;
}): Promise<void> => {
  const redis = getRedisClient();
  const lockKey = bookingLockKey(params.bookingId);

  if (redis) {
    const locked = await redis.get(lockKey);
    if (locked) {
      throw new AppError("Too many verification attempts. Please try again in 15 minutes.", {
        error: { code: ErrorCode.RATE_LIMIT_ERROR },
        statusCode: HttpStatusCode.TooManyRequests,
      });
    }
  } else if (getMemoryLock(lockKey)) {
    throw new AppError("Too many verification attempts. Please try again in 15 minutes.", {
      error: { code: ErrorCode.RATE_LIMIT_ERROR },
      statusCode: HttpStatusCode.TooManyRequests,
    });
  }

  if (params.attempts >= BOOKING_MAX_ATTEMPTS) {
    if (redis) {
      await redis.set(lockKey, "1", "PX", BOOKING_LOCK_TTL_MS);
    } else {
      setMemoryLock(lockKey, BOOKING_LOCK_TTL_MS);
    }
    throw new AppError("Too many verification attempts. Please try again in 15 minutes.", {
      error: { code: ErrorCode.RATE_LIMIT_ERROR },
      statusCode: HttpStatusCode.TooManyRequests,
    });
  }

  await assertPartnerWindowRedis(params.partnerId);
};

export const lockBookingAfterFailedAttempts = async (
  bookingId: string,
  attempts: number,
): Promise<void> => {
  if (attempts < BOOKING_MAX_ATTEMPTS) return;
  const redis = getRedisClient();
  const lockKey = bookingLockKey(bookingId);
  if (redis) {
    await redis.set(lockKey, "1", "PX", BOOKING_LOCK_TTL_MS);
  } else {
    setMemoryLock(lockKey, BOOKING_LOCK_TTL_MS);
  }
};

export const clearBookingVerifyLock = async (bookingId: string): Promise<void> => {
  const redis = getRedisClient();
  const lockKey = bookingLockKey(bookingId);
  if (redis) {
    await redis.del(lockKey);
  } else {
    memoryLocks.delete(lockKey);
  }
};

/** @internal — test helpers */
export const _testing = {
  BOOKING_MAX_ATTEMPTS,
  PARTNER_MAX_ATTEMPTS_PER_HOUR,
  clearMemory: () => {
    memoryLocks.clear();
    memoryPartnerWindows.clear();
  },
};
