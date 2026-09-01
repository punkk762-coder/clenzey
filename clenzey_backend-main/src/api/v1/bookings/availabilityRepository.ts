import { and, eq } from "drizzle-orm";

import db from "../../../db/index.ts";
import { partnerAvailability } from "../../../db/schema.ts";
import type { dayOfWeekEnum } from "../../../db/schema/enums.ts";

type DayOfWeek = (typeof dayOfWeekEnum.enumValues)[number];

export type PartnerAvailabilityWindow = {
  dayOfWeek: DayOfWeek;
  endHour: number;
  id: string;
  partnerId: string;
  startHour: number;
};

export const listPartnerAvailabilityForDay = async (
  partnerId: string,
  dayOfWeek: DayOfWeek,
): Promise<PartnerAvailabilityWindow[]> => {
  return await db
    .select({
      dayOfWeek: partnerAvailability.dayOfWeek,
      endHour: partnerAvailability.endHour,
      id: partnerAvailability.id,
      partnerId: partnerAvailability.partnerId,
      startHour: partnerAvailability.startHour,
    })
    .from(partnerAvailability)
    .where(
      and(
        eq(partnerAvailability.partnerId, partnerId),
        eq(partnerAvailability.dayOfWeek, dayOfWeek),
        eq(partnerAvailability.isActive, true),
      ),
    )
    .orderBy(partnerAvailability.startHour);
};
