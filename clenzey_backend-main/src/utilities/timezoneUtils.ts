/** Business timezone — all consumer-facing slot times use IST. */
export const APP_TIMEZONE = "Asia/Kolkata";

export type IstParts = {
  day: number;
  dayOfWeek: number;
  hour: number;
  minute: number;
  month: number;
  second: number;
  year: number;
};

const WEEKDAY_TO_INDEX: Record<string, number> = {
  Fri: 5,
  Mon: 1,
  Sat: 6,
  Sun: 0,
  Thu: 4,
  Tue: 2,
  Wed: 3,
};

const istFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  hour: "2-digit",
  hourCycle: "h23",
  minute: "2-digit",
  month: "2-digit",
  second: "2-digit",
  timeZone: APP_TIMEZONE,
  weekday: "short",
  year: "numeric",
});

export const getIstParts = (date: Date): IstParts => {
  const parts = istFormatter.formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((p) => p.type === type)?.value ?? "0";

  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "Sun";

  return {
    day: Number(pick("day")),
    dayOfWeek: WEEKDAY_TO_INDEX[weekday] ?? 0,
    hour: Number(pick("hour")),
    minute: Number(pick("minute")),
    month: Number(pick("month")),
    second: Number(pick("second")),
    year: Number(pick("year")),
  };
};

export const formatIstDateKey = (date: Date): string => {
  const p = getIstParts(date);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
};

/** Build a UTC instant for a wall-clock time in IST. */
export const istLocalToDate = (params: {
  day: number;
  hour: number;
  minute?: number;
  month: number;
  year: number;
}): Date => {
  const { day, hour, minute = 0, month, year } = params;
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  const hh = String(hour).padStart(2, "0");
  const mi = String(minute).padStart(2, "0");
  return new Date(`${year}-${mm}-${dd}T${hh}:${mi}:00+05:30`);
};

export const formatIstSlotLabel = (date: Date): string => {
  const { hour } = getIstParts(date);
  const period = hour >= 12 ? "PM" : "AM";
  const display = hour % 12 || 12;
  return `${display} ${period}`;
};
