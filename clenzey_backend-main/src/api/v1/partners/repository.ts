import { HttpStatusCode } from "axios";
import { and, eq, sql } from "drizzle-orm";

import db from "../../../db/index.ts";
import {
  partnerAvailability,
  partnerLocations,
  partners,
  users,
} from "../../../db/schema.ts";
import { AppError } from "../../../errors/appErrors.ts";
import ErrorCode from "../../../errors/errorCode.ts";
import { parsePointWkt } from "../../../utilities/geoUtils.ts";

type PartnerRecord = typeof partners.$inferSelect;
type UserRecord = typeof users.$inferSelect;

export type AvailabilityRecord = typeof partnerAvailability.$inferSelect;
export type AvailabilityInsert = typeof partnerAvailability.$inferInsert;

export type PartnerUser = UserRecord & {
  partner: PartnerRecord | null;
};

const mapPartnerUser = (row: {
  partner: PartnerRecord | null;
  user: UserRecord;
}): PartnerUser => ({
  ...row.user,
  partner: row.partner ?? null,
});

export const findPartnerByPhone = async (
  phone: string,
): Promise<null | PartnerUser> => {
  const [row] = await db
    .select({ partner: partners, user: users })
    .from(users)
    .innerJoin(partners, eq(users.id, partners.id))
    .where(eq(users.phone, phone))
    .limit(1);

  return row ? mapPartnerUser(row) : null;
};

export const findPartnerById = async (
  id: string,
): Promise<null | PartnerUser> => {
  const [row] = await db
    .select({ partner: partners, user: users })
    .from(users)
    .innerJoin(partners, eq(users.id, partners.id))
    .where(eq(users.id, id))
    .limit(1);

  return row ? mapPartnerUser(row) : null;
};

export const createPartnerForPhone = async (
  phone: string,
  fullName?: string,
): Promise<PartnerUser> => {
  return await db.transaction(async (tx) => {
    // reuse existing user if they already registered as consumer
    let user = (
      await tx.select().from(users).where(eq(users.phone, phone)).limit(1)
    )[0];

    if (!user) {
      const [newUser] = await tx.insert(users).values({ phone }).returning();
      if (!newUser) {
        throw new AppError("Failed to create user record", {
          error: { code: ErrorCode.SERVER_ERROR },
          statusCode: HttpStatusCode.InternalServerError,
        });
      }
      user = newUser;
    }

    const [partner] = await tx
      .insert(partners)
      .values({ fullName: fullName ?? null, id: user.id })
      .returning();

    if (!partner) {
      throw new AppError("Failed to create partner record", {
        error: { code: ErrorCode.SERVER_ERROR },
        statusCode: HttpStatusCode.InternalServerError,
      });
    }

    return mapPartnerUser({ partner, user });
  });
};

// ── Availability & location ─────────────────────────────────────────────────

export const listAvailability = async (
  partnerId: string,
): Promise<AvailabilityRecord[]> => {
  return await db
    .select()
    .from(partnerAvailability)
    .where(eq(partnerAvailability.partnerId, partnerId))
    .orderBy(partnerAvailability.dayOfWeek, partnerAvailability.startHour);
};

export const insertAvailability = async (
  data: AvailabilityInsert,
): Promise<AvailabilityRecord> => {
  const [row] = await db
    .insert(partnerAvailability)
    .values(data)
    .returning();
  if (!row) {
    throw new AppError("Failed to create availability", {
      error: { code: ErrorCode.SERVER_ERROR },
      statusCode: HttpStatusCode.InternalServerError,
    });
  }
  return row;
};

export const deleteAvailability = async (
  id: string,
  partnerId: string,
): Promise<void> => {
  await db
    .delete(partnerAvailability)
    .where(
      and(
        eq(partnerAvailability.id, id),
        eq(partnerAvailability.partnerId, partnerId),
      ),
    );
};

export const upsertLocation = async (data: {
  heading?: number;
  isOnline?: boolean;
  latitude: number;
  longitude: number;
  partnerId: string;
  speed?: number;
}) => {
  const wkt = `POINT(${data.longitude} ${data.latitude})`;
  await db
    .insert(partnerLocations)
    .values({
      heading: data.heading !== undefined ? String(data.heading) : null,
      isOnline: data.isOnline ?? true,
      lastSeenAt: new Date(),
      location: wkt,
      partnerId: data.partnerId,
      speed: data.speed !== undefined ? String(data.speed) : null,
    })
    .onConflictDoUpdate({
      set: {
        heading: data.heading !== undefined ? String(data.heading) : null,
        isOnline: data.isOnline ?? true,
        lastSeenAt: new Date(),
        location: wkt,
        speed: data.speed !== undefined ? String(data.speed) : null,
      },
      target: partnerLocations.partnerId,
    });
};

export const setOnlineStatus = async (
  partnerId: string,
  isOnline: boolean,
) => {
  let coords: { lat: number; lng: number } | null = null;
  try {
    const coordsResult = await db.execute<{ lat: number; lng: number }>(sql`
      SELECT
        ST_Y(base_location::geometry) AS lat,
        ST_X(base_location::geometry) AS lng
      FROM partners
      WHERE id = ${partnerId}
        AND base_location IS NOT NULL
      LIMIT 1
    `);
    coords = coordsResult.rows[0] ?? null;
  } catch {
    // PostGIS unavailable — parse WKT directly
    const [row] = await db
      .select({ baseLocation: partners.baseLocation })
      .from(partners)
      .where(eq(partners.id, partnerId))
      .limit(1);
    if (row?.baseLocation) {
      coords = parsePointWkt(row.baseLocation as string);
    }
  }

  const location =
    coords != null
      ? `SRID=4326;POINT(${coords.lng} ${coords.lat})`
      : undefined;

  await db
    .insert(partnerLocations)
    .values({
      isOnline,
      lastSeenAt: new Date(),
      ...(location ? { location } : {}),
      partnerId,
    })
    .onConflictDoUpdate({
      set: {
        isOnline,
        lastSeenAt: new Date(),
        ...(isOnline && location ? { location } : {}),
      },
      target: partnerLocations.partnerId,
    });
};

// ── Password auth repository methods ────────────────────────────────────────

export const findUserByEmail = async (
  email: string,
): Promise<null | PartnerUser> => {
  const [row] = await db
    .select({ partner: partners, user: users })
    .from(users)
    .leftJoin(partners, eq(users.id, partners.id))
    .where(eq(users.email, email))
    .limit(1);

  return row ? mapPartnerUser(row) : null;
};

export const findUserByPhone = async (
  phone: string,
): Promise<null | PartnerUser> => {
  const [row] = await db
    .select({ partner: partners, user: users })
    .from(users)
    .leftJoin(partners, eq(users.id, partners.id))
    .where(eq(users.phone, phone))
    .limit(1);

  return row ? mapPartnerUser(row) : null;
};

export type PartnerProfileUpdate = Partial<{
  bio: null | string;
  dob: null | string;
  experienceYears: null | number;
  fullName: string;
  gender: "female" | "male" | "other" | null;
  languages: string[];
  profileImage: null | string;
}>;

export const updatePartnerProfile = async (
  partnerId: string,
  data: PartnerProfileUpdate,
): Promise<PartnerUser> => {
  if (Object.keys(data).length === 0) {
    const user = await findPartnerById(partnerId);
    if (!user) {
      throw new AppError("Partner not found.", {
        error: { code: ErrorCode.NOT_FOUND_ERROR },
        statusCode: HttpStatusCode.NotFound,
      });
    }
    return user;
  }

  const { dob, ...rest } = data;
  const updateData = {
    ...rest,
    ...(dob !== undefined ? { dob: dob === null ? null : new Date(dob) } : {}),
  };

  const [updatedPartner] = await db
    .update(partners)
    .set(updateData)
    .where(eq(partners.id, partnerId))
    .returning();

  if (!updatedPartner) {
    throw new AppError("Partner not found.", {
      error: { code: ErrorCode.NOT_FOUND_ERROR },
      statusCode: HttpStatusCode.NotFound,
    });
  }

  const user = await findPartnerById(partnerId);
  if (!user) {
    throw new AppError("Partner not found.", {
      error: { code: ErrorCode.NOT_FOUND_ERROR },
      statusCode: HttpStatusCode.NotFound,
    });
  }

  return user;
};

export const createPartnerWithPassword = async (
  email: string,
  phone: string,
  passwordHash: string,
  fullName: string,
): Promise<PartnerUser> => {
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

    const [partner] = await tx
      .insert(partners)
      .values({
        approvalStatus: "PENDING",
        fullName,
        id: user.id,
      })
      .returning();

    if (!partner) {
      throw new AppError("Failed to create partner record", {
        error: { code: ErrorCode.SERVER_ERROR },
        statusCode: HttpStatusCode.InternalServerError,
      });
    }

    return mapPartnerUser({ partner, user });
  });
};
