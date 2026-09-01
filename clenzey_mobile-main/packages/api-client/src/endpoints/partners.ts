import { AxiosInstance } from 'axios';
import { AvailabilitySlot, DayOfWeek, PartnerLocation, Assignment } from '@clenzey/types';

/**
 * Payload for adding an availability slot.
 */
export interface AddAvailabilityPayload {
  dayOfWeek: DayOfWeek;
  startHour: number;
  endHour: number;
}

/**
 * Payload for updating partner location.
 */
export interface UpdateLocationPayload {
  latitude: number;
  longitude: number;
  heading: number;
  speed: number;
  isOnline: boolean;
}

/**
 * Creates the partner-specific endpoint module.
 *
 * Provides typed methods for partner operations:
 * - getAvailability: Fetch the partner's availability slots
 * - addAvailability: Add a new availability slot
 * - removeAvailability: Remove an availability slot
 * - updateLocation: Post current location data
 * - setOnlineStatus: Toggle online/offline status
 * - getAssignments: Fetch pending booking assignments
 * - acceptAssignment: Accept a booking assignment
 * - declineAssignment: Decline a booking assignment with optional reason
 */
export function createPartnersEndpoints(client: AxiosInstance) {
  return {
    /** GET /api/v1/partners/availability — Get partner availability slots */
    getAvailability: () =>
      client.get<AvailabilitySlot[]>('/api/v1/partners/availability'),

    /** POST /api/v1/partners/availability — Add an availability slot */
    addAvailability: (data: AddAvailabilityPayload) =>
      client.post<AvailabilitySlot>('/api/v1/partners/availability', data),

    /** DELETE /api/v1/partners/availability/:availabilityId — Remove a slot */
    removeAvailability: (availabilityId: string) =>
      client.delete<void>(
        `/api/v1/partners/availability/${availabilityId}`
      ),

    /** POST /api/v1/partners/location — Update partner location */
    updateLocation: (data: UpdateLocationPayload) =>
      client.post<void>('/api/v1/partners/location', data),

    /** POST /api/v1/partners/online — Set online/offline status */
    setOnlineStatus: (isOnline: boolean) =>
      client.post<void>('/api/v1/partners/online', { isOnline }),

    /** GET /api/v1/bookings/assignments/me — Get partner's assignments */
    getAssignments: () =>
      client.get<Assignment[]>('/api/v1/bookings/assignments/me'),

    /** POST /api/v1/bookings/assignments/:assignmentId/accept — Accept assignment */
    acceptAssignment: (assignmentId: string) =>
      client.post<Assignment>(
        `/api/v1/bookings/assignments/${assignmentId}/accept`
      ),

    /** POST /api/v1/bookings/assignments/:assignmentId/decline — Decline assignment */
    declineAssignment: (assignmentId: string, reason?: string) =>
      client.post<Assignment>(
        `/api/v1/bookings/assignments/${assignmentId}/decline`,
        { reason }
      ),
  };
}
