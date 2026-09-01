import { describe, expect, it, vi } from "vitest";

/**
 * Regression: `db.execute` returns snake_case columns, but Drizzle models use camelCase.
 * Spatial override lookup must map rows before pricing reads `overridePrice`.
 */
describe("zone price override SQL row mapping", () => {
  it("maps snake_case execute rows to camelCase override records", async () => {
    const { resolveOverrideForPoint } = await import(
      "../src/api/v1/zones/pricingRepository.ts"
    );

    const sqlRow = {
      id: "d1030001-0001-4001-8001-000000000002",
      zone_id: "d1010001-0001-4001-8001-000000000001",
      service_id: "e1010001-0001-4001-8001-000000000002",
      variant_id: "e1010003-0001-4001-8001-000000000002",
      override_price: "549.00",
      created_at: new Date("2026-07-11T13:22:42.468Z"),
      updated_at: new Date("2026-07-11T13:22:42.468Z"),
    };

    const dbModule = await import("../src/db/index.ts");
    const executeSpy = vi
      .spyOn(dbModule.default, "execute")
      .mockResolvedValue({ rows: [sqlRow] } as never);

    const override = await resolveOverrideForPoint(
      sqlRow.service_id,
      sqlRow.variant_id,
      23.0737625,
      72.5521719,
    );

    expect(override).toMatchObject({
      id: sqlRow.id,
      zoneId: sqlRow.zone_id,
      serviceId: sqlRow.service_id,
      variantId: sqlRow.variant_id,
      overridePrice: "549.00",
    });
    expect(Number(override?.overridePrice)).toBe(549);

    executeSpy.mockRestore();
  });
});
