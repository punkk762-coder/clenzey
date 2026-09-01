import { HttpStatusCode } from "axios";
import { and, desc, eq, isNull, sql } from "drizzle-orm";

import db from "../../../db/index.ts";
import { consumerAddresses, consumers } from "../../../db/schema.ts";
import {
  BadRequestError,
  ConflictError,
  AppError,
  UnauthorizedError,
} from "../../../errors/appErrors.ts";
import ErrorCode from "../../../errors/errorCode.ts";

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

const rethrowAddressDbError = (err: unknown): never => {
  const root = unwrapDbError(err);
  if (!isPgError(root)) throw err;

  if (root.code === "23505") {
    if (root.constraint === "consumer_addresses_consumer_label_idx") {
      throw new ConflictError(
        "An address with this label already exists. Use a different label or edit the existing one.",
      );
    }
  }

  if (root.code === "23503") {
    if (root.constraint === "consumer_addresses_consumer_id_consumers_id_fk") {
      throw new UnauthorizedError(
        "Your session is no longer valid. Please sign in again.",
      );
    }
    if (root.constraint === "consumer_addresses_zone_id_service_zones_id_fk") {
      throw new BadRequestError(
        "The service zone for this address is no longer valid.",
      );
    }
  }

  throw err;
};

export type AddressRecord = typeof consumerAddresses.$inferSelect;
type RawAddressInsert = typeof consumerAddresses.$inferInsert;

type CommonFields = Omit<
  RawAddressInsert,
  "latitude" | "location" | "longitude"
>;

export type AddressCreateInput = CommonFields & {
  latitude?: null | number;
  longitude?: null | number;
};

export type AddressUpdateInput = Partial<CommonFields> & {
  latitude?: null | number;
  longitude?: null | number;
};

const numericOrNull = (n: null | number | undefined): null | string => {
  if (n === null || n === undefined) return null;
  return String(n);
};

const buildLocationWkt = (
  lat: null | number,
  lng: null | number,
): null | string => {
  if (lat == null || lng == null) return null;
  return `POINT(${lng} ${lat})`;
};

export const consumerExists = async (consumerId: string): Promise<boolean> => {
  const [row] = await db
    .select({ id: consumers.id })
    .from(consumers)
    .where(eq(consumers.id, consumerId))
    .limit(1);
  return !!row;
};

export const findAddressByLabel = async (
  consumerId: string,
  label: string,
): Promise<AddressRecord | null> => {
  const [row] = await db
    .select()
    .from(consumerAddresses)
    .where(
      and(
        eq(consumerAddresses.consumerId, consumerId),
        eq(consumerAddresses.label, label),
        isNull(consumerAddresses.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
};

export const insertAddress = async (
  input: AddressCreateInput,
): Promise<AddressRecord> => {
  const { latitude, longitude, ...rest } = input;
  const values: Record<string, unknown> = { ...rest };
  if (latitude !== undefined) values["latitude"] = numericOrNull(latitude);
  if (longitude !== undefined) values["longitude"] = numericOrNull(longitude);
  const location = buildLocationWkt(latitude ?? null, longitude ?? null);
  if (location) values["location"] = location;

  try {
    const [record] = await db
      .insert(consumerAddresses)
      .values(values as RawAddressInsert)
      .returning();
    if (!record) {
      throw new AppError("Failed to create address", {
        error: { code: ErrorCode.SERVER_ERROR },
        statusCode: HttpStatusCode.InternalServerError,
      });
    }
    return record;
  } catch (err) {
    return rethrowAddressDbError(err);
  }
};

export const findAddressById = async (
  id: string,
  options: { includeDeleted?: boolean } = {},
): Promise<AddressRecord | null> => {
  const conditions = [eq(consumerAddresses.id, id)];
  if (!options.includeDeleted) conditions.push(isNull(consumerAddresses.deletedAt));
  const [row] = await db
    .select()
    .from(consumerAddresses)
    .where(and(...conditions))
    .limit(1);
  return row ?? null;
};

/**
 * Lists every active address that has lat/lng coordinates. Used by the
 * zone-change recompute fan-out — most callers should not need this.
 */
export const listAllAddressesWithLocation = async (): Promise<
  AddressRecord[]
> => {
  return await db
    .select()
    .from(consumerAddresses)
    .where(
      and(
        isNull(consumerAddresses.deletedAt),
        sql`${consumerAddresses.latitude} IS NOT NULL`,
        sql`${consumerAddresses.longitude} IS NOT NULL`,
      ),
    );
};

export const listAddressesForConsumer = async (
  consumerId: string,
): Promise<AddressRecord[]> => {
  return await db
    .select()
    .from(consumerAddresses)
    .where(
      and(
        eq(consumerAddresses.consumerId, consumerId),
        isNull(consumerAddresses.deletedAt),
      ),
    )
    .orderBy(
      desc(consumerAddresses.isDefault),
      desc(consumerAddresses.updatedAt),
    );
};

export const findDefaultAddressForConsumer = async (
  consumerId: string,
): Promise<AddressRecord | null> => {
  const [row] = await db
    .select()
    .from(consumerAddresses)
    .where(
      and(
        eq(consumerAddresses.consumerId, consumerId),
        eq(consumerAddresses.isDefault, true),
        isNull(consumerAddresses.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
};

export const countAddressesForConsumer = async (
  consumerId: string,
): Promise<number> => {
  const result = await db.execute<{ count: number }>(
    sql`SELECT COUNT(*)::int AS count FROM consumer_addresses WHERE consumer_id = ${consumerId} AND deleted_at IS NULL`,
  );
  return result.rows[0]?.count ?? 0;
};

export const updateAddress = async (
  id: string,
  patch: AddressUpdateInput,
): Promise<AddressRecord> => {
  const { latitude, longitude, ...rest } = patch;
  const values: Record<string, unknown> = { ...rest };
  if (latitude !== undefined) values["latitude"] = numericOrNull(latitude);
  if (longitude !== undefined) values["longitude"] = numericOrNull(longitude);
  if (latitude !== undefined || longitude !== undefined) {
    values["location"] = buildLocationWkt(
      latitude ?? null,
      longitude ?? null,
    );
  }
  try {
    const [row] = await db
      .update(consumerAddresses)
      .set(values as Partial<RawAddressInsert>)
      .where(eq(consumerAddresses.id, id))
      .returning();
    if (!row) {
      throw new AppError("Failed to update address", {
        error: { code: ErrorCode.SERVER_ERROR },
        statusCode: HttpStatusCode.InternalServerError,
      });
    }
    return row;
  } catch (err) {
    return rethrowAddressDbError(err);
  }
};

export const softDeleteAddress = async (id: string): Promise<void> => {
  await db
    .update(consumerAddresses)
    .set({ deletedAt: new Date(), isDefault: false })
    .where(eq(consumerAddresses.id, id));
};

/**
 * Atomically clears the default flag on all of a consumer's addresses,
 * then sets it on the target. Run inside a transaction.
 */
export const setDefaultAddress = async (
  consumerId: string,
  addressId: string,
): Promise<AddressRecord> => {
  return await db.transaction(async (tx) => {
    await tx
      .update(consumerAddresses)
      .set({ isDefault: false })
      .where(
        and(
          eq(consumerAddresses.consumerId, consumerId),
          eq(consumerAddresses.isDefault, true),
        ),
      );
    const [row] = await tx
      .update(consumerAddresses)
      .set({ isDefault: true })
      .where(
        and(
          eq(consumerAddresses.id, addressId),
          eq(consumerAddresses.consumerId, consumerId),
          isNull(consumerAddresses.deletedAt),
        ),
      )
      .returning();
    if (!row) {
      throw new AppError("Failed to set default address", {
        error: { code: ErrorCode.SERVER_ERROR },
        statusCode: HttpStatusCode.InternalServerError,
      });
    }
    return row;
  });
};

/**
 * Find a possible duplicate: same consumer, same placeId OR within 25 m
 * of the given point. Excludes deleted rows.
 */
export const findDuplicateAddress = async (
  consumerId: string,
  params: { latitude?: number; longitude?: number; placeId?: string },
): Promise<AddressRecord | null> => {
  if (params.placeId) {
    const [byPlace] = await db
      .select()
      .from(consumerAddresses)
      .where(
        and(
          eq(consumerAddresses.consumerId, consumerId),
          eq(consumerAddresses.placeId, params.placeId),
          isNull(consumerAddresses.deletedAt),
        ),
      )
      .limit(1);
    if (byPlace) return byPlace;
  }
  if (params.latitude != null && params.longitude != null) {
    try {
      const result = await db.execute<AddressRecord>(sql`
        SELECT * FROM consumer_addresses
        WHERE consumer_id = ${consumerId}
          AND deleted_at IS NULL
          AND location IS NOT NULL
          AND ST_DWithin(
            location,
            ST_SetSRID(ST_MakePoint(${params.longitude}, ${params.latitude}), 4326)::geography,
            25
          )
        LIMIT 1
      `);
      return result.rows[0] ?? null;
    } catch {
      // PostGIS unavailable — return first non-deleted address for consumer
      const [fallback] = await db
        .select()
        .from(consumerAddresses)
        .where(
          and(
            eq(consumerAddresses.consumerId, consumerId),
            isNull(consumerAddresses.deletedAt),
          ),
        )
        .limit(1);
      return fallback ?? null;
    }
  }
  return null;
};
