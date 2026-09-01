import { describe, expect, it } from "vitest";

import {
  APP_TIMEZONE,
  formatIstDateKey,
  formatIstSlotLabel,
  getIstParts,
  istLocalToDate,
} from "../src/utilities/timezoneUtils.ts";

describe("timezoneUtils", () => {
  it("uses Asia/Kolkata as app timezone", () => {
    expect(APP_TIMEZONE).toBe("Asia/Kolkata");
  });

  it("parses IST parts from a known UTC instant", () => {
    const date = new Date("2026-01-15T06:30:00.000Z");
    const parts = getIstParts(date);
    expect(parts.year).toBe(2026);
    expect(parts.month).toBe(1);
    expect(parts.day).toBe(15);
    expect(parts.hour).toBe(12);
    expect(parts.minute).toBe(0);
  });

  it("formats IST date keys", () => {
    const date = istLocalToDate({ day: 5, hour: 10, month: 3, year: 2026 });
    expect(formatIstDateKey(date)).toBe("2026-03-05");
  });

  it("formats slot labels in AM/PM", () => {
    const morning = istLocalToDate({ day: 1, hour: 9, month: 1, year: 2026 });
    const afternoon = istLocalToDate({ day: 1, hour: 14, month: 1, year: 2026 });
    expect(formatIstSlotLabel(morning)).toBe("9 AM");
    expect(formatIstSlotLabel(afternoon)).toBe("2 PM");
  });

  it("formats noon and midnight slot labels", () => {
    const noon = istLocalToDate({ day: 1, hour: 12, month: 1, year: 2026 });
    const midnight = istLocalToDate({ day: 1, hour: 0, month: 1, year: 2026 });
    expect(formatIstSlotLabel(noon)).toBe("12 PM");
    expect(formatIstSlotLabel(midnight)).toBe("12 AM");
  });

  it("builds UTC instants from IST wall-clock times", () => {
    const date = istLocalToDate({ day: 15, hour: 18, minute: 30, month: 6, year: 2026 });
    expect(date.toISOString()).toBe("2026-06-15T13:00:00.000Z");
  });

  it("parses midnight IST parts with zero minutes", () => {
    const midnight = istLocalToDate({ day: 1, hour: 0, month: 1, year: 2026 });
    const parts = getIstParts(midnight);
    expect(parts.hour).toBe(0);
    expect(parts.minute).toBe(0);
  });
});
