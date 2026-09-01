import { HttpStatusCode } from "axios";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";

import db from "../../../db/index.ts";
import {
  bookings,
  consumerAddresses,
  consumers,
  deviceTokens,
  users,
} from "../../../db/schema.ts";
import { AppError } from "../../../errors/appErrors.ts";
import ErrorCode from "../../../errors/errorCode.ts";

export type ConsumerUser = UserRecord & {
  consumer: ConsumerRecord | null;
};

type ConsumerRecord = typeof consumers.$inferSelect;
type UserRecord = typeof users.$inferSelect;

const mapConsumerUser = (row: {
  consumer: ConsumerRecord | null;
  user: UserRecord;
}): ConsumerUser => {
  // Drizzle's leftJoin can return an all-nulls object instead of null when
  // there is no matching row. Treat a missing primary key as "no record".
  const hasConsumer = !!row.consumer && !!row.consumer.id;
  return {
    consumer: hasConsumer ? row.consumer : null,
    createdAt: row.user.createdAt,
    email: row.user.email,
    id: row.user.id,
    isActive: row.user.isActive,
    passwordHash: row.user.passwordHash,
    phone: row.user.phone,
    updatedAt: row.user.updatedAt,
  };
};

export const findUserByPhone = async (
  phone: string,
): Promise<ConsumerUser | null> => {
  const [row] = await db
    .select({ consumer: consumers, user: users })
    .from(users)
    .leftJoin(consumers, eq(users.id, consumers.id))
    .where(eq(users.phone, phone))
    .limit(1);

  return row ? mapConsumerUser(row) : null;
};

export const findUserById = async (
  id: string,
): Promise<ConsumerUser | null> => {
  const [row] = await db
    .select({ consumer: consumers, user: users })
    .from(users)
    .leftJoin(consumers, eq(users.id, consumers.id))
    .where(eq(users.id, id))
    .limit(1);

  return row ? mapConsumerUser(row) : null;
};

export const createUserWithConsumer = async (
  phone: string,
  referralCode: string,
): Promise<ConsumerUser> => {
  return await db.transaction(async (tx) => {
    const [user] = await tx.insert(users).values({ phone }).returning();
    if (!user) {
      throw new AppError("Failed to create user record", {
        error: { code: ErrorCode.SERVER_ERROR },
        statusCode: HttpStatusCode.InternalServerError,
      });
    }

    const [consumer] = await tx
      .insert(consumers)
      .values({ id: user.id, referralCode })
      .returning();
    if (!consumer) {
      throw new AppError("Failed to create consumer record", {
        error: { code: ErrorCode.SERVER_ERROR },
        statusCode: HttpStatusCode.InternalServerError,
      });
    }

    return mapConsumerUser({ consumer, user });
  });
};

export const createConsumerForUser = async (
  userId: string,
  referralCode: string,
): Promise<ConsumerUser> => {
  const [consumer] = await db
    .insert(consumers)
    .values({ id: userId, referralCode })
    .returning();
  if (!consumer) {
    throw new AppError("Failed to create consumer record", {
      error: { code: ErrorCode.SERVER_ERROR },
      statusCode: HttpStatusCode.InternalServerError,
    });
  }
  const user = await findUserById(userId);
  if (!user) {
    throw new AppError("User record disappeared after consumer create", {
      error: { code: ErrorCode.SERVER_ERROR },
      statusCode: HttpStatusCode.InternalServerError,
    });
  }
  return user;
};

export type ConsumerProfileUpdate = Partial<{
  fullName: string;
  profileImage: null | string;
}>;

export const updateConsumerProfile = async (
  id: string,
  data: ConsumerProfileUpdate,
): Promise<void> => {
  if (Object.keys(data).length === 0) {
    return;
  }

  await db
    .update(consumers)
    .set(data)
    .where(eq(consumers.id, id));
};

const ACTIVE_BOOKING_STATUSES = [
  "PENDING",
  "PAYMENT_PENDING",
  "CONFIRMED",
  "PROFESSIONAL_ASSIGNED",
  "PROFESSIONAL_EN_ROUTE",
  "CHECKED_IN",
  "IN_PROGRESS",
] as const;

export const countActiveBookings = async (consumerId: string): Promise<number> => {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(bookings)
    .where(
      and(
        eq(bookings.consumerId, consumerId),
        inArray(bookings.status, [...ACTIVE_BOOKING_STATUSES]),
      ),
    );

  return row?.count ?? 0;
};

export const deactivateAccount = async (userId: string): Promise<void> => {
  const deletedPhone = `+deleted-${userId}`;

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({
        email: null,
        isActive: false,
        passwordHash: null,
        phone: deletedPhone,
      })
      .where(eq(users.id, userId));

    await tx
      .update(consumers)
      .set({
        fullName: null,
        isActive: false,
        profileImage: null,
      })
      .where(eq(consumers.id, userId));

    await tx
      .update(consumerAddresses)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(consumerAddresses.consumerId, userId),
          isNull(consumerAddresses.deletedAt),
        ),
      );

    await tx.delete(deviceTokens).where(eq(deviceTokens.userId, userId));
  });
};

export const findUserByEmail = async (
  email: string,
): Promise<ConsumerUser | null> => {
  const [row] = await db
    .select({ consumer: consumers, user: users })
    .from(users)
    .leftJoin(consumers, eq(users.id, consumers.id))
    .where(eq(users.email, email))
    .limit(1);

  return row ? mapConsumerUser(row) : null;
};

export const createUserWithConsumerAndPassword = async (
  email: string,
  phone: string,
  passwordHash: string,
  referralCode: string,
): Promise<ConsumerUser> => {
  return await db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({ email, passwordHash, phone })
      .returning();
    if (!user) {
      throw new AppError("Failed to create user record", {
        error: { code: ErrorCode.SERVER_ERROR },
        statusCode: HttpStatusCode.InternalServerError,
      });
    }

    const [consumer] = await tx
      .insert(consumers)
      .values({ id: user.id, referralCode })
      .returning();
    if (!consumer) {
      throw new AppError("Failed to create consumer record", {
        error: { code: ErrorCode.SERVER_ERROR },
        statusCode: HttpStatusCode.InternalServerError,
      });
    }

    return mapConsumerUser({ consumer, user });
  });
};
