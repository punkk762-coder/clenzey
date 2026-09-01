import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useSocket,
  useBookingStatus,
  usePartnerLocation,
  useEtaUpdates,
  useServiceUpdates,
  useQuotationUpdates,
  useAddressUpdates,
} from './hooks';
import type { SocketManager } from './client';
import type { ServerEvents } from './events';

// Helper to create a mock SocketManager
function createMockSocketManager(overrides: Partial<SocketManager> = {}) {
  const listeners = new Map<string, Set<(...args: any[]) => void>>();

  const mockManager = {
    isConnected: vi.fn(() => false),
    getSocket: vi.fn(() => mockSocket),
    subscribeToBooking: vi.fn(),
    unsubscribeFromBooking: vi.fn(),
    on: vi.fn((event: string, handler: (...args: any[]) => void) => {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(handler);
    }),
    off: vi.fn((event: string, handler: (...args: any[]) => void) => {
      listeners.get(event)?.delete(handler);
    }),
    connect: vi.fn(),
    disconnect: vi.fn(),
    ...overrides,
  } as unknown as SocketManager;

  const socketListeners = new Map<string, Set<(...args: any[]) => void>>();
  const mockSocket = {
    on: vi.fn((event: string, handler: (...args: any[]) => void) => {
      if (!socketListeners.has(event)) socketListeners.set(event, new Set());
      socketListeners.get(event)!.add(handler);
    }),
    off: vi.fn((event: string, handler: (...args: any[]) => void) => {
      socketListeners.get(event)?.delete(handler);
    }),
    connected: false,
  };

  // Helper to emit events on the SocketManager's listeners
  function emit<E extends keyof ServerEvents>(
    event: E,
    ...args: Parameters<ServerEvents[E]>
  ) {
    listeners.get(event as string)?.forEach((handler) => handler(...args));
  }

  // Helper to emit socket-level events (connect/disconnect)
  function emitSocketEvent(event: string, ...args: any[]) {
    socketListeners.get(event)?.forEach((handler) => handler(...args));
  }

  return { mockManager, mockSocket, emit, emitSocketEvent, listeners, socketListeners };
}

describe('useSocket', () => {
  it('returns null socket and false isConnected when socketManager is null', () => {
    const { result } = renderHook(() => useSocket(null));
    expect(result.current.socket).toBeNull();
    expect(result.current.isConnected).toBe(false);
  });

  it('returns initial connection state from socketManager', () => {
    const { mockManager } = createMockSocketManager();
    (mockManager.isConnected as any).mockReturnValue(true);

    const { result } = renderHook(() => useSocket(mockManager));
    expect(result.current.isConnected).toBe(true);
  });

  it('updates isConnected to true on connect event', () => {
    const { mockManager, emitSocketEvent } = createMockSocketManager();

    const { result } = renderHook(() => useSocket(mockManager));
    expect(result.current.isConnected).toBe(false);

    act(() => {
      emitSocketEvent('connect');
    });

    expect(result.current.isConnected).toBe(true);
  });

  it('updates isConnected to false on disconnect event', () => {
    const { mockManager, emitSocketEvent } = createMockSocketManager();
    (mockManager.isConnected as any).mockReturnValue(true);

    const { result } = renderHook(() => useSocket(mockManager));
    expect(result.current.isConnected).toBe(true);

    act(() => {
      emitSocketEvent('disconnect');
    });

    expect(result.current.isConnected).toBe(false);
  });

  it('cleans up socket listeners on unmount', () => {
    const { mockManager, mockSocket } = createMockSocketManager();

    const { unmount } = renderHook(() => useSocket(mockManager));
    unmount();

    expect(mockSocket.off).toHaveBeenCalledWith('connect', expect.any(Function));
    expect(mockSocket.off).toHaveBeenCalledWith('disconnect', expect.any(Function));
  });
});

describe('useBookingStatus', () => {
  it('returns null when socketManager is null', () => {
    const { result } = renderHook(() => useBookingStatus(null, 'booking-1'));
    expect(result.current).toBeNull();
  });

  it('returns null when bookingId is null', () => {
    const { mockManager } = createMockSocketManager();
    const { result } = renderHook(() => useBookingStatus(mockManager, null));
    expect(result.current).toBeNull();
  });

  it('subscribes to booking on mount', () => {
    const { mockManager } = createMockSocketManager();
    renderHook(() => useBookingStatus(mockManager, 'booking-1'));
    expect(mockManager.subscribeToBooking).toHaveBeenCalledWith('booking-1');
  });

  it('unsubscribes from booking on unmount', () => {
    const { mockManager } = createMockSocketManager();
    const { unmount } = renderHook(() => useBookingStatus(mockManager, 'booking-1'));
    unmount();
    expect(mockManager.unsubscribeFromBooking).toHaveBeenCalledWith('booking-1');
  });

  it('updates state when matching booking status event is received', () => {
    const { mockManager, emit } = createMockSocketManager();
    const { result } = renderHook(() => useBookingStatus(mockManager, 'booking-1'));

    act(() => {
      emit('booking:status_changed', {
        bookingId: 'booking-1',
        status: 'CONFIRMED',
        updatedAt: '2024-01-01T00:00:00Z',
      });
    });

    expect(result.current).toEqual({
      status: 'CONFIRMED',
      updatedAt: '2024-01-01T00:00:00Z',
    });
  });

  it('ignores events for different bookingIds', () => {
    const { mockManager, emit } = createMockSocketManager();
    const { result } = renderHook(() => useBookingStatus(mockManager, 'booking-1'));

    act(() => {
      emit('booking:status_changed', {
        bookingId: 'booking-2',
        status: 'CONFIRMED',
        updatedAt: '2024-01-01T00:00:00Z',
      });
    });

    expect(result.current).toBeNull();
  });
});

describe('usePartnerLocation', () => {
  it('returns null when socketManager is null', () => {
    const { result } = renderHook(() => usePartnerLocation(null, 'booking-1'));
    expect(result.current).toBeNull();
  });

  it('returns null when bookingId is null', () => {
    const { mockManager } = createMockSocketManager();
    const { result } = renderHook(() => usePartnerLocation(mockManager, null));
    expect(result.current).toBeNull();
  });

  it('updates location on partner:location_stream event', () => {
    const { mockManager, emit } = createMockSocketManager();
    const { result } = renderHook(() => usePartnerLocation(mockManager, 'booking-1'));

    act(() => {
      emit('partner:location_stream', {
        latitude: 12.97,
        longitude: 77.59,
        heading: 45,
        etaMinutes: 10,
      });
    });

    expect(result.current).toEqual({
      latitude: 12.97,
      longitude: 77.59,
      heading: 45,
      etaMinutes: 10,
      isStale: false,
    });
  });

  it('sets isStale to true on partner:location_stale event', () => {
    const { mockManager, emit } = createMockSocketManager();
    const { result } = renderHook(() => usePartnerLocation(mockManager, 'booking-1'));

    // First set location
    act(() => {
      emit('partner:location_stream', {
        latitude: 12.97,
        longitude: 77.59,
        heading: 45,
        etaMinutes: 10,
      });
    });

    // Then mark as stale
    act(() => {
      emit('partner:location_stale', {
        bookingId: 'booking-1',
        partnerId: 'partner-1',
      });
    });

    expect(result.current?.isStale).toBe(true);
    expect(result.current?.latitude).toBe(12.97);
  });

  it('ignores stale events for different bookingIds', () => {
    const { mockManager, emit } = createMockSocketManager();
    const { result } = renderHook(() => usePartnerLocation(mockManager, 'booking-1'));

    act(() => {
      emit('partner:location_stream', {
        latitude: 12.97,
        longitude: 77.59,
        heading: 45,
        etaMinutes: 10,
      });
    });

    act(() => {
      emit('partner:location_stale', {
        bookingId: 'booking-2',
        partnerId: 'partner-1',
      });
    });

    expect(result.current?.isStale).toBe(false);
  });

  it('cleans up listeners on unmount', () => {
    const { mockManager } = createMockSocketManager();
    const { unmount } = renderHook(() => usePartnerLocation(mockManager, 'booking-1'));
    unmount();

    expect(mockManager.off).toHaveBeenCalledWith('partner:location_stream', expect.any(Function));
    expect(mockManager.off).toHaveBeenCalledWith('partner:location_stale', expect.any(Function));
  });
});

describe('useEtaUpdates', () => {
  it('returns null when socketManager is null', () => {
    const { result } = renderHook(() => useEtaUpdates(null, 'booking-1'));
    expect(result.current).toBeNull();
  });

  it('returns null when bookingId is null', () => {
    const { mockManager } = createMockSocketManager();
    const { result } = renderHook(() => useEtaUpdates(mockManager, null));
    expect(result.current).toBeNull();
  });

  it('updates etaMinutes on matching eta:updated event', () => {
    const { mockManager, emit } = createMockSocketManager();
    const { result } = renderHook(() => useEtaUpdates(mockManager, 'booking-1'));

    act(() => {
      emit('eta:updated', { bookingId: 'booking-1', etaMinutes: 5 });
    });

    expect(result.current).toEqual({ etaMinutes: 5 });
  });

  it('ignores events for different bookingIds', () => {
    const { mockManager, emit } = createMockSocketManager();
    const { result } = renderHook(() => useEtaUpdates(mockManager, 'booking-1'));

    act(() => {
      emit('eta:updated', { bookingId: 'booking-2', etaMinutes: 5 });
    });

    expect(result.current).toBeNull();
  });

  it('cleans up listeners on unmount', () => {
    const { mockManager } = createMockSocketManager();
    const { unmount } = renderHook(() => useEtaUpdates(mockManager, 'booking-1'));
    unmount();

    expect(mockManager.off).toHaveBeenCalledWith('eta:updated', expect.any(Function));
  });
});

describe('useServiceUpdates', () => {
  it('does nothing when socketManager is null', () => {
    const callback = vi.fn();
    renderHook(() => useServiceUpdates(null, callback));
    expect(callback).not.toHaveBeenCalled();
  });

  it('calls callback with created type on service:created', () => {
    const { mockManager, emit } = createMockSocketManager();
    const callback = vi.fn();

    renderHook(() => useServiceUpdates(mockManager, callback));

    act(() => {
      emit('service:created', { serviceId: 'svc-1' });
    });

    expect(callback).toHaveBeenCalledWith({ type: 'created', serviceId: 'svc-1' });
  });

  it('calls callback with updated type on service:updated', () => {
    const { mockManager, emit } = createMockSocketManager();
    const callback = vi.fn();

    renderHook(() => useServiceUpdates(mockManager, callback));

    act(() => {
      emit('service:updated', { serviceId: 'svc-1' });
    });

    expect(callback).toHaveBeenCalledWith({ type: 'updated', serviceId: 'svc-1' });
  });

  it('calls callback with deleted type on service:deleted', () => {
    const { mockManager, emit } = createMockSocketManager();
    const callback = vi.fn();

    renderHook(() => useServiceUpdates(mockManager, callback));

    act(() => {
      emit('service:deleted', { serviceId: 'svc-1' });
    });

    expect(callback).toHaveBeenCalledWith({ type: 'deleted', serviceId: 'svc-1' });
  });

  it('cleans up all three listeners on unmount', () => {
    const { mockManager } = createMockSocketManager();
    const callback = vi.fn();

    const { unmount } = renderHook(() => useServiceUpdates(mockManager, callback));
    unmount();

    expect(mockManager.off).toHaveBeenCalledWith('service:created', expect.any(Function));
    expect(mockManager.off).toHaveBeenCalledWith('service:updated', expect.any(Function));
    expect(mockManager.off).toHaveBeenCalledWith('service:deleted', expect.any(Function));
  });
});

describe('useQuotationUpdates', () => {
  it('does nothing when socketManager is null', () => {
    const callback = vi.fn();
    renderHook(() => useQuotationUpdates(null, callback));
    expect(callback).not.toHaveBeenCalled();
  });

  it('calls callback with created type on quotation:created', () => {
    const { mockManager, emit } = createMockSocketManager();
    const callback = vi.fn();

    renderHook(() => useQuotationUpdates(mockManager, callback));

    act(() => {
      emit('quotation:created', { quotationId: 'quot-1' });
    });

    expect(callback).toHaveBeenCalledWith({ type: 'created', quotationId: 'quot-1' });
  });

  it('calls callback with updated type on quotation:updated', () => {
    const { mockManager, emit } = createMockSocketManager();
    const callback = vi.fn();

    renderHook(() => useQuotationUpdates(mockManager, callback));

    act(() => {
      emit('quotation:updated', { quotationId: 'quot-1' });
    });

    expect(callback).toHaveBeenCalledWith({ type: 'updated', quotationId: 'quot-1' });
  });

  it('cleans up both listeners on unmount', () => {
    const { mockManager } = createMockSocketManager();
    const callback = vi.fn();

    const { unmount } = renderHook(() => useQuotationUpdates(mockManager, callback));
    unmount();

    expect(mockManager.off).toHaveBeenCalledWith('quotation:created', expect.any(Function));
    expect(mockManager.off).toHaveBeenCalledWith('quotation:updated', expect.any(Function));
  });
});

describe('useAddressUpdates', () => {
  it('does nothing when socketManager is null', () => {
    const callback = vi.fn();
    renderHook(() => useAddressUpdates(null, callback));
    expect(callback).not.toHaveBeenCalled();
  });

  it('calls callback with created type on address:created', () => {
    const { mockManager, emit } = createMockSocketManager();
    const callback = vi.fn();

    renderHook(() => useAddressUpdates(mockManager, callback));

    act(() => {
      emit('address:created', { addressId: 'addr-1' });
    });

    expect(callback).toHaveBeenCalledWith({ type: 'created', addressId: 'addr-1' });
  });

  it('calls callback with updated type on address:updated', () => {
    const { mockManager, emit } = createMockSocketManager();
    const callback = vi.fn();

    renderHook(() => useAddressUpdates(mockManager, callback));

    act(() => {
      emit('address:updated', { addressId: 'addr-1' });
    });

    expect(callback).toHaveBeenCalledWith({ type: 'updated', addressId: 'addr-1' });
  });

  it('calls callback with deleted type on address:deleted', () => {
    const { mockManager, emit } = createMockSocketManager();
    const callback = vi.fn();

    renderHook(() => useAddressUpdates(mockManager, callback));

    act(() => {
      emit('address:deleted', { addressId: 'addr-1' });
    });

    expect(callback).toHaveBeenCalledWith({ type: 'deleted', addressId: 'addr-1' });
  });

  it('cleans up all three listeners on unmount', () => {
    const { mockManager } = createMockSocketManager();
    const callback = vi.fn();

    const { unmount } = renderHook(() => useAddressUpdates(mockManager, callback));
    unmount();

    expect(mockManager.off).toHaveBeenCalledWith('address:created', expect.any(Function));
    expect(mockManager.off).toHaveBeenCalledWith('address:updated', expect.any(Function));
    expect(mockManager.off).toHaveBeenCalledWith('address:deleted', expect.any(Function));
  });
});
