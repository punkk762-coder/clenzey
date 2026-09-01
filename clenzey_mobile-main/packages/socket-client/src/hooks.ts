import { useState, useEffect, useRef, useCallback } from 'react';
import type { SocketManager } from './client';
import type {
  BookingStatusEvent,
  LocationStreamEvent,
  LocationStaleEvent,
  EtaUpdatedEvent,
  ServiceCreatedEvent,
  ServiceUpdatedEvent,
  ServiceDeletedEvent,
  QuotationCreatedEvent,
  QuotationUpdatedEvent,
  AddressCreatedEvent,
  AddressUpdatedEvent,
  AddressDeletedEvent,
} from './events';

// --- useSocket ---

export interface UseSocketResult {
  socket: ReturnType<SocketManager['getSocket']>;
  isConnected: boolean;
}

/**
 * Returns the current socket instance and connection status.
 * Listens to connect/disconnect events and updates state accordingly.
 *
 * @validates Requirements 27.1, 27.2
 */
export function useSocket(socketManager: SocketManager | null): UseSocketResult {
  const [isConnected, setIsConnected] = useState<boolean>(
    socketManager?.isConnected() ?? false,
  );

  useEffect(() => {
    if (!socketManager) {
      setIsConnected(false);
      return;
    }

    // Sync initial state
    setIsConnected(socketManager.isConnected());

    const socket = socketManager.getSocket();
    if (!socket) return;

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [socketManager]);

  return {
    socket: socketManager?.getSocket() ?? null,
    isConnected,
  };
}

// --- useBookingStatus ---

export interface BookingStatusState {
  status: string;
  updatedAt: string;
}

/**
 * Listens for 'booking:status_changed' events filtered by bookingId.
 * Subscribes to the booking room on mount, unsubscribes on unmount.
 *
 * @validates Requirements 11.5
 */
export function useBookingStatus(
  socketManager: SocketManager | null,
  bookingId: string | null,
): BookingStatusState | null {
  const [state, setState] = useState<BookingStatusState | null>(null);

  useEffect(() => {
    if (!socketManager || !bookingId) {
      setState(null);
      return;
    }

    // Subscribe to booking room
    socketManager.subscribeToBooking(bookingId);

    const handler = (data: BookingStatusEvent) => {
      if (data.bookingId === bookingId) {
        setState({ status: data.status, updatedAt: data.updatedAt });
      }
    };

    socketManager.on('booking:status_changed', handler);

    return () => {
      socketManager.off('booking:status_changed', handler);
      socketManager.unsubscribeFromBooking(bookingId);
    };
  }, [socketManager, bookingId]);

  return state;
}

// --- usePartnerLocation ---

export interface PartnerLocationState {
  latitude: number;
  longitude: number;
  heading: number;
  etaMinutes: number;
  isStale: boolean;
}

/**
 * Listens for 'partner:location_stream' events for map marker updates.
 * Also listens for 'partner:location_stale' to set isStale=true.
 *
 * @validates Requirements 11.2, 11.4
 */
export function usePartnerLocation(
  socketManager: SocketManager | null,
  bookingId: string | null,
): PartnerLocationState | null {
  const [state, setState] = useState<PartnerLocationState | null>(null);

  useEffect(() => {
    if (!socketManager || !bookingId) {
      setState(null);
      return;
    }

    const locationHandler = (data: LocationStreamEvent) => {
      setState({
        latitude: data.latitude,
        longitude: data.longitude,
        heading: data.heading,
        etaMinutes: data.etaMinutes,
        isStale: false,
      });
    };

    const staleHandler = (data: LocationStaleEvent) => {
      if (data.bookingId === bookingId) {
        setState((prev) =>
          prev ? { ...prev, isStale: true } : null,
        );
      }
    };

    socketManager.on('partner:location_stream', locationHandler);
    socketManager.on('partner:location_stale', staleHandler);

    return () => {
      socketManager.off('partner:location_stream', locationHandler);
      socketManager.off('partner:location_stale', staleHandler);
    };
  }, [socketManager, bookingId]);

  return state;
}

// --- useEtaUpdates ---

export interface EtaState {
  etaMinutes: number;
}

/**
 * Listens for 'eta:updated' events filtered by bookingId.
 *
 * @validates Requirements 11.3
 */
export function useEtaUpdates(
  socketManager: SocketManager | null,
  bookingId: string | null,
): EtaState | null {
  const [state, setState] = useState<EtaState | null>(null);

  useEffect(() => {
    if (!socketManager || !bookingId) {
      setState(null);
      return;
    }

    const handler = (data: EtaUpdatedEvent) => {
      if (data.bookingId === bookingId) {
        setState({ etaMinutes: data.etaMinutes });
      }
    };

    socketManager.on('eta:updated', handler);

    return () => {
      socketManager.off('eta:updated', handler);
    };
  }, [socketManager, bookingId]);

  return state;
}

// --- useServiceUpdates ---

export type ServiceUpdateType = 'created' | 'updated' | 'deleted';

export interface ServiceUpdatePayload {
  type: ServiceUpdateType;
  serviceId: string;
}

/**
 * Listens for 'service:created', 'service:updated', 'service:deleted' events.
 * Calls the provided callback with { type, serviceId } when an event is received.
 *
 * @validates Requirements 27.4
 */
export function useServiceUpdates(
  socketManager: SocketManager | null,
  callback: (payload: ServiceUpdatePayload) => void,
): void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!socketManager) return;

    const createdHandler = (data: ServiceCreatedEvent) => {
      callbackRef.current({ type: 'created', serviceId: data.serviceId });
    };

    const updatedHandler = (data: ServiceUpdatedEvent) => {
      callbackRef.current({ type: 'updated', serviceId: data.serviceId });
    };

    const deletedHandler = (data: ServiceDeletedEvent) => {
      callbackRef.current({ type: 'deleted', serviceId: data.serviceId });
    };

    socketManager.on('service:created', createdHandler);
    socketManager.on('service:updated', updatedHandler);
    socketManager.on('service:deleted', deletedHandler);

    return () => {
      socketManager.off('service:created', createdHandler);
      socketManager.off('service:updated', updatedHandler);
      socketManager.off('service:deleted', deletedHandler);
    };
  }, [socketManager]);
}

// --- useQuotationUpdates ---

export type QuotationUpdateType = 'created' | 'updated';

export interface QuotationUpdatePayload {
  type: QuotationUpdateType;
  quotationId: string;
}

/**
 * Listens for 'quotation:created' and 'quotation:updated' events.
 * Calls the provided callback with { type, quotationId } when an event is received.
 *
 * @validates Requirements 27.5
 */
export function useQuotationUpdates(
  socketManager: SocketManager | null,
  callback: (payload: QuotationUpdatePayload) => void,
): void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!socketManager) return;

    const createdHandler = (data: QuotationCreatedEvent) => {
      callbackRef.current({ type: 'created', quotationId: data.quotationId });
    };

    const updatedHandler = (data: QuotationUpdatedEvent) => {
      callbackRef.current({ type: 'updated', quotationId: data.quotationId });
    };

    socketManager.on('quotation:created', createdHandler);
    socketManager.on('quotation:updated', updatedHandler);

    return () => {
      socketManager.off('quotation:created', createdHandler);
      socketManager.off('quotation:updated', updatedHandler);
    };
  }, [socketManager]);
}

// --- useAddressUpdates ---

export type AddressUpdateType = 'created' | 'updated' | 'deleted';

export interface AddressUpdatePayload {
  type: AddressUpdateType;
  addressId: string;
}

/**
 * Listens for 'address:created', 'address:updated', 'address:deleted' events.
 * Calls the provided callback with { type, addressId } when an event is received.
 *
 * @validates Requirements 27.6
 */
export function useAddressUpdates(
  socketManager: SocketManager | null,
  callback: (payload: AddressUpdatePayload) => void,
): void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!socketManager) return;

    const createdHandler = (data: AddressCreatedEvent) => {
      callbackRef.current({ type: 'created', addressId: data.addressId });
    };

    const updatedHandler = (data: AddressUpdatedEvent) => {
      callbackRef.current({ type: 'updated', addressId: data.addressId });
    };

    const deletedHandler = (data: AddressDeletedEvent) => {
      callbackRef.current({ type: 'deleted', addressId: data.addressId });
    };

    socketManager.on('address:created', createdHandler);
    socketManager.on('address:updated', updatedHandler);
    socketManager.on('address:deleted', deletedHandler);

    return () => {
      socketManager.off('address:created', createdHandler);
      socketManager.off('address:updated', updatedHandler);
      socketManager.off('address:deleted', deletedHandler);
    };
  }, [socketManager]);
}
