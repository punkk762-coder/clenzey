import {
  BadRequestError,
  NotFoundError,
} from "../../../errors/appErrors.ts";
import * as repo from "./repository.ts";

type GenerateSlotsInput = {
  capacity?: number;
  endHour?: number;
  fromDate: string;
  serviceId: string;
  slotDurationMin?: number;
  startHour?: number;
  toDate: string;
};

const buildDayRange = (start: Date, end: Date): Date[] => {
  const days: Date[] = [];
  const d = new Date(start);
  d.setHours(0, 0, 0, 0);
  const last = new Date(end);
  last.setHours(0, 0, 0, 0);
  while (d <= last) {
    days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
};

export const generateSlots = async (input: GenerateSlotsInput) => {
  const start = new Date(input.fromDate);
  const end = new Date(input.toDate);
  if (end < start) throw new BadRequestError("toDate must be on or after fromDate.");

  const startHour = input.startHour ?? 8;
  const endHour = input.endHour ?? 20;
  const durationMin = input.slotDurationMin ?? 60;
  const capacity = input.capacity ?? 5;

  if (endHour <= startHour) {
    throw new BadRequestError("endHour must be greater than startHour.");
  }

  const days = buildDayRange(start, end);
  const rows: repo.TimeSlotInsert[] = [];

  for (const day of days) {
    for (let m = startHour * 60; m + durationMin <= endHour * 60; m += durationMin) {
      const slotStart = new Date(day);
      slotStart.setHours(0, 0, 0, 0);
      slotStart.setMinutes(m);
      const slotEnd = new Date(slotStart.getTime() + durationMin * 60 * 1000);
      rows.push({
        capacity,
        endAt: slotEnd,
        serviceId: input.serviceId,
        startAt: slotStart,
      });
    }
  }

  const inserted = await repo.insertTimeSlots(rows);
  return { generated: inserted.length, skipped: rows.length - inserted.length };
};

export const listAvailableSlots = async (
  serviceId: string,
  date: string,
) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const now = new Date();
  const fromAt = start > now ? start : now;
  return await repo.listAvailableSlots(serviceId, fromAt, end);
};

export const listSlotsForAdmin = async (
  serviceId: string,
  fromAt: string,
  toAt: string,
) => {
  return await repo.listSlotsForAdmin(
    serviceId,
    new Date(fromAt),
    new Date(toAt),
  );
};

export const updateCapacity = async (slotId: string, capacity: number) => {
  const slot = await repo.findSlotById(slotId);
  if (!slot) throw new NotFoundError("Slot not found.");
  if (capacity < slot.reservedCount) {
    throw new BadRequestError(
      `Capacity cannot be below current reservations (${slot.reservedCount}).`,
    );
  }
  return await repo.updateSlotCapacity(slotId, capacity);
};

export const findSlotById = repo.findSlotById;
export const tryReserveSlot = repo.tryReserveSlot;
export const releaseSlot = repo.releaseSlot;
