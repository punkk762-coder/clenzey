import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEtaUpdates, usePartnerLocation } from '@clenzey/socket-client';
import type { SocketManager } from '@clenzey/socket-client';
import { etaApi } from '../lib/api';
import {
  estimateTravelMinutes,
  isEtaUnavailableError,
  normalizeEtaResponse,
  type BookingEta,
} from '../utils/eta-response';

const POLL_PENDING_MS = 15_000;
const POLL_READY_MS = 60_000;

export function bookingEtaQueryKey(bookingId: string) {
  return ['bookings', bookingId, 'eta'] as const;
}

export interface UseBookingEtaOptions {
  destinationLatitude?: number;
  destinationLongitude?: number;
}

/**
 * Fetches and tracks partner ETA for a booking.
 * - Calls GET /bookings/:id/eta while status is PROFESSIONAL_EN_ROUTE
 * - Keeps polling while the API reports ETA is not yet calculated
 * - Applies real-time eta:updated / partner:location_stream values
 * - Estimates travel time from live partner coordinates when needed
 */
export function useBookingEta(
  bookingId: string | null | undefined,
  bookingStatus: string,
  socketManager: SocketManager | null,
  options?: UseBookingEtaOptions,
) {
  const queryClient = useQueryClient();
  const isEnRoute = bookingStatus === 'PROFESSIONAL_EN_ROUTE';
  const enabled = Boolean(bookingId && isEnRoute);

  const etaUpdates = useEtaUpdates(socketManager, enabled ? bookingId ?? null : null);
  const partnerLocation = usePartnerLocation(socketManager, enabled ? bookingId ?? null : null);

  const {
    data: fetchedEta,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useQuery<BookingEta | null>({
    queryKey: bookingId ? bookingEtaQueryKey(bookingId) : ['bookings', 'unknown', 'eta'],
    queryFn: async () => {
      try {
        return normalizeEtaResponse(await etaApi.getEta(bookingId!));
      } catch (error) {
        if (isEtaUnavailableError(error)) {
          return null;
        }
        throw error;
      }
    },
    enabled,
    staleTime: 10_000,
    refetchInterval: (query) => {
      if (!enabled) return false;
      return query.state.data?.etaMinutes != null ? POLL_READY_MS : POLL_PENDING_MS;
    },
    retry: (failureCount, error) => {
      if (isEtaUnavailableError(error)) return false;
      return failureCount < 1;
    },
  });

  useEffect(() => {
    if (!bookingId || etaUpdates?.etaMinutes == null) return;

    queryClient.setQueryData(bookingEtaQueryKey(bookingId), {
      etaMinutes: etaUpdates.etaMinutes,
    });
  }, [bookingId, etaUpdates, queryClient]);

  const estimatedEtaMinutes = useMemo(() => {
    if (
      !partnerLocation ||
      partnerLocation.isStale ||
      options?.destinationLatitude == null ||
      options?.destinationLongitude == null
    ) {
      return null;
    }

    return estimateTravelMinutes(
      partnerLocation.latitude,
      partnerLocation.longitude,
      options.destinationLatitude,
      options.destinationLongitude,
    );
  }, [partnerLocation, options?.destinationLatitude, options?.destinationLongitude]);

  const etaMinutes =
    etaUpdates?.etaMinutes ??
    fetchedEta?.etaMinutes ??
    (partnerLocation?.etaMinutes != null && partnerLocation.etaMinutes > 0
      ? partnerLocation.etaMinutes
      : null) ??
    estimatedEtaMinutes ??
    null;

  const isPending = enabled && etaMinutes == null;

  return {
    etaMinutes,
    isLoading: enabled && isLoading && etaMinutes == null,
    isFetching: enabled && isFetching,
    isPending,
    isError,
    refetch,
  };
}
