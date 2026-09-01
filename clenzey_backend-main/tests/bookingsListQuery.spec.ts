import { describe, expect, it } from "vitest";
import z from "zod";

import { bookingStatusEnum } from "../src/db/schema/enums.ts";

const BOOKING_STATUSES = bookingStatusEnum.enumValues;

const listBookingsQueryDto = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  status: z.enum(BOOKING_STATUSES).optional(),
  statuses: z
    .string()
    .transform((value) =>
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.enum(BOOKING_STATUSES)).min(1))
    .optional(),
}).superRefine((value, ctx) => {
  if (value.status && value.statuses?.length) {
    ctx.addIssue({
      code: "custom",
      message: "Use either status or statuses, not both.",
      path: ["statuses"],
    });
  }
});

describe("list bookings query validation", () => {
  it("accepts a comma-separated statuses filter", () => {
    const parsed = listBookingsQueryDto.parse({
      statuses: "CONFIRMED,IN_PROGRESS",
      limit: "10",
      offset: "0",
    });

    expect(parsed.statuses).toEqual(["CONFIRMED", "IN_PROGRESS"]);
  });

  it("rejects using status and statuses together", () => {
    const result = listBookingsQueryDto.safeParse({
      status: "CONFIRMED",
      statuses: "IN_PROGRESS",
    });

    expect(result.success).toBe(false);
  });
});
