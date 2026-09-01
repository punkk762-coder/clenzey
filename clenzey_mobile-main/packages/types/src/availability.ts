export type DayOfWeek = 'SUN' | 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT';

export interface AvailabilitySlot {
  id: string;
  partnerId: string;
  dayOfWeek: DayOfWeek;
  startHour: number;
  endHour: number;
}
