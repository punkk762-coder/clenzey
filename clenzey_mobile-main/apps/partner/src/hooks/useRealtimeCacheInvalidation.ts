import { useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useServiceUpdates } from '@clenzey/socket-client';
import type { SocketManager } from '@clenzey/socket-client';
import type { BookingStatusEvent } from '@clenzey/socket-client';

/**
 * Invalidates React Query caches in response to real-time Socket.IO events
 * for the Partner app.
 *
 * - service:created/updated/deleted → invalidates ['services'] queries (if partner browses services)
 * - booking:status_changed → invalidates ['partner-bookings'] and ['assignments'] queries
 *
 * @validates Requirements 27.4, 27.5, 27.6
 */
export function useRealtimeCacheInvalidation(socketManager: SocketManager | null): void {
  const queryClient = useQueryClient();

  // Invalidate services cache on service updates (partner may view service details)
  const handleServiceUpdate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['services'] });
  }, [queryClient]);

  useServiceUpdates(socketManager, handleServiceUpdate);

  // Invalidate partner-bookings and assignments on booking status changes
  useEffect(() => {
    if (!socketManager) return;

    const handler = (data: BookingStatusEvent) => {
      // Invalidate the partner bookings list
      queryClient.invalidateQueries({ queryKey: ['partner-bookings'] });
      // Invalidate assignments (status changes may affect assignment state)
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      // Invalidate specific booking detail if cached
      queryClient.invalidateQueries({ queryKey: ['booking', data.bookingId] });
    };

    socketManager.on('booking:status_changed', handler);

    return () => {
      socketManager.off('booking:status_changed', handler);
    };
  }, [socketManager, queryClient]);
}
