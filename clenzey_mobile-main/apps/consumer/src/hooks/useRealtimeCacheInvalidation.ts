import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useServiceUpdates, useAddressUpdates, useQuotationUpdates } from '@clenzey/socket-client';
import type { SocketManager } from '@clenzey/socket-client';
import type { BookingStatusEvent } from '@clenzey/socket-client';
import { useEffect } from 'react';

/**
 * Invalidates React Query caches in response to real-time Socket.IO events.
 *
 * - service:created/updated/deleted → invalidates ['services'] queries
 * - quotation:created/updated → invalidates ['quotations'] queries
 * - address:created/updated/deleted → invalidates ['addresses'] queries
 * - booking:status_changed → invalidates ['bookings'] and ['booking', bookingId] queries
 *
 * @validates Requirements 27.4, 27.5, 27.6
 */
export function useRealtimeCacheInvalidation(socketManager: SocketManager | null): void {
  const queryClient = useQueryClient();

  // Invalidate services cache on service updates
  const handleServiceUpdate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['services'] });
  }, [queryClient]);

  useServiceUpdates(socketManager, handleServiceUpdate);

  // Invalidate quotations cache on quotation updates
  const handleQuotationUpdate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['quotations'] });
  }, [queryClient]);

  useQuotationUpdates(socketManager, handleQuotationUpdate);

  // Invalidate addresses cache on address updates
  const handleAddressUpdate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['addresses'] });
  }, [queryClient]);

  useAddressUpdates(socketManager, handleAddressUpdate);

  // Invalidate bookings cache on booking status changes
  useEffect(() => {
    if (!socketManager) return;

    const handler = (data: BookingStatusEvent) => {
      // Invalidate the bookings list queries
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      // Invalidate the specific booking detail query
      queryClient.invalidateQueries({ queryKey: ['booking', data.bookingId] });
    };

    socketManager.on('booking:status_changed', handler);

    return () => {
      socketManager.off('booking:status_changed', handler);
    };
  }, [socketManager, queryClient]);
}
