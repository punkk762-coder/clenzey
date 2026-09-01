/** Target arrival window for instant bookings (minutes from now). */
const INSTANT_ARRIVAL_BUFFER_MINUTES = 25;

/**
 * Returns the scheduled start time for an instant booking — roughly 20–30 minutes
 * from now, used for partner availability matching.
 */
export function getInstantScheduledAt(from: Date = new Date()): Date {
  const scheduled = new Date(from);
  scheduled.setMinutes(scheduled.getMinutes() + INSTANT_ARRIVAL_BUFFER_MINUTES, 0, 0);
  return scheduled;
}
