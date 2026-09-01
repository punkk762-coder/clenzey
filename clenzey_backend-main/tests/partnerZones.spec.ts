import { describe, expect, it } from "vitest";
import z from "zod";

const assignZonesBody = z.object({
  primaryZoneId: z.string().uuid().optional(),
  zoneIds: z.array(z.string().uuid()).min(1),
});

describe("partner zone assignment validation", () => {
  it("requires at least one zone id", () => {
    const result = assignZonesBody.safeParse({ zoneIds: [] });
    expect(result.success).toBe(false);
  });

  it("accepts valid zone assignment payload", () => {
    const result = assignZonesBody.safeParse({
      primaryZoneId: "550e8400-e29b-41d4-a716-446655440001",
      zoneIds: ["550e8400-e29b-41d4-a716-446655440001"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid uuid in zoneIds", () => {
    const result = assignZonesBody.safeParse({ zoneIds: ["not-a-uuid"] });
    expect(result.success).toBe(false);
  });
});
