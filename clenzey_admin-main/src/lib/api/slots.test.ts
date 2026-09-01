import { describe, expect, it } from "vitest";

import { toIsoDateTime } from "./slots";

describe("toIsoDateTime", () => {
  it("converts date-only values to start/end of day ISO strings", () => {
    const start = toIsoDateTime("2026-06-22", "start");
    const end = toIsoDateTime("2026-06-22", "end");

    expect(start).toMatch(/^2026-06-2[12]T/);
    expect(end).toMatch(/^2026-06-2[12]T/);
    expect(new Date(end).getTime()).toBeGreaterThan(new Date(start).getTime());
  });

  it("converts datetime-local values to ISO strings", () => {
    const iso = toIsoDateTime("2026-06-22T08:00");
    expect(iso).toContain("T");
    expect(iso.endsWith("Z")).toBe(true);
  });
});
