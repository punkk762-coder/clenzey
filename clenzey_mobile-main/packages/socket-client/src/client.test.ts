import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SocketManager } from './client';
import type { SocketConfig } from './client';

// Mock socket.io-client
const mockSocket = {
  connected: false,
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  disconnect: vi.fn(),
  removeAllListeners: vi.fn(),
};

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
}));

describe('SocketManager', () => {
  let manager: SocketManager;
  const consumerConfig: SocketConfig = {
    url: 'http://localhost:3000',
    roomPrefix: 'consumer',
  };
  const partnerConfig: SocketConfig = {
    url: 'http://localhost:3000',
    roomPrefix: 'partner',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket.connected = false;
  });

  describe('constructor', () => {
    it('should create an instance with config', () => {
      manager = new SocketManager(consumerConfig);
      expect(manager).toBeInstanceOf(SocketManager);
      expect(manager.getSocket()).toBeNull();
      expect(manager.isConnected()).toBe(false);
    });
  });

  describe('connect', () => {
    it('should create a socket connection with auth token and websocket transport', async () => {
      const { io } = await import('socket.io-client');
      manager = new SocketManager(consumerConfig);
      const socket = manager.connect('test-token', 'user-123');

      expect(io).toHaveBeenCalledWith('http://localhost:3000', {
        auth: { token: 'test-token' },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 30000,
        randomizationFactor: 0,
      });
      expect(socket).toBe(mockSocket);
    });

    it('should return existing socket if already connected', async () => {
      const { io } = await import('socket.io-client');
      manager = new SocketManager(consumerConfig);
      mockSocket.connected = true;
      // Set a socket directly via connect - first call sets it up
      manager.connect('token1', 'user-1');
      vi.clearAllMocks();
      mockSocket.connected = true;

      // Second call should return the existing socket
      const result = manager.connect('token2', 'user-2');
      expect(io).not.toHaveBeenCalled();
      expect(result).toBe(mockSocket);
    });

    it('should register connect, disconnect, and connect_error handlers', () => {
      manager = new SocketManager(consumerConfig);
      manager.connect('test-token', 'user-123');

      // The socket.on should be called for connect, disconnect, connect_error
      const onCalls = mockSocket.on.mock.calls.map((call) => call[0]);
      expect(onCalls).toContain('connect');
      expect(onCalls).toContain('disconnect');
      expect(onCalls).toContain('connect_error');
    });

    it('should join consumer rooms on connect event', () => {
      manager = new SocketManager(consumerConfig);
      manager.connect('test-token', 'user-123');

      // Find the connect handler and call it
      const connectCall = mockSocket.on.mock.calls.find(
        (call) => call[0] === 'connect',
      );
      expect(connectCall).toBeDefined();
      const connectHandler = connectCall![1];
      connectHandler();

      // Should emit room:join for consumer:{userId} and consumers
      expect(mockSocket.emit).toHaveBeenCalledWith('room:join', {
        room: 'consumer:user-123',
      });
      expect(mockSocket.emit).toHaveBeenCalledWith('room:join', {
        room: 'consumers',
      });
    });

    it('should join partner room on connect event', () => {
      manager = new SocketManager(partnerConfig);
      manager.connect('test-token', 'partner-456');

      // Find the connect handler and call it
      const connectCall = mockSocket.on.mock.calls.find(
        (call) => call[0] === 'connect',
      );
      const connectHandler = connectCall![1];
      connectHandler();

      // Should emit room:join for partner:{userId} only
      expect(mockSocket.emit).toHaveBeenCalledWith('room:join', {
        room: 'partner:partner-456',
      });
      expect(mockSocket.emit).not.toHaveBeenCalledWith('room:join', {
        room: 'consumers',
      });
    });
  });

  describe('disconnect', () => {
    it('should disconnect and clean up listeners', () => {
      manager = new SocketManager(consumerConfig);
      manager.connect('test-token', 'user-123');

      manager.disconnect();

      expect(mockSocket.removeAllListeners).toHaveBeenCalled();
      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect(manager.getSocket()).toBeNull();
      expect(manager.isConnected()).toBe(false);
    });

    it('should be safe to call disconnect when not connected', () => {
      manager = new SocketManager(consumerConfig);
      expect(() => manager.disconnect()).not.toThrow();
    });
  });

  describe('subscribeToBooking', () => {
    it('should emit booking:subscribe event', () => {
      manager = new SocketManager(consumerConfig);
      manager.connect('test-token', 'user-123');

      manager.subscribeToBooking('booking-789');

      expect(mockSocket.emit).toHaveBeenCalledWith('booking:subscribe', {
        bookingId: 'booking-789',
      });
    });

    it('should not throw if socket is null', () => {
      manager = new SocketManager(consumerConfig);
      expect(() => manager.subscribeToBooking('booking-789')).not.toThrow();
    });
  });

  describe('unsubscribeFromBooking', () => {
    it('should emit booking:unsubscribe event', () => {
      manager = new SocketManager(consumerConfig);
      manager.connect('test-token', 'user-123');

      manager.unsubscribeFromBooking('booking-789');

      expect(mockSocket.emit).toHaveBeenCalledWith('booking:unsubscribe', {
        bookingId: 'booking-789',
      });
    });
  });

  describe('on / off', () => {
    it('should register an event handler', () => {
      manager = new SocketManager(consumerConfig);
      manager.connect('test-token', 'user-123');

      const handler = vi.fn();
      manager.on('booking:status_changed', handler);

      expect(mockSocket.on).toHaveBeenCalledWith(
        'booking:status_changed',
        handler,
      );
    });

    it('should unregister an event handler', () => {
      manager = new SocketManager(consumerConfig);
      manager.connect('test-token', 'user-123');

      const handler = vi.fn();
      manager.off('booking:status_changed', handler);

      expect(mockSocket.off).toHaveBeenCalledWith(
        'booking:status_changed',
        handler,
      );
    });
  });

  describe('getSocket', () => {
    it('should return null when not connected', () => {
      manager = new SocketManager(consumerConfig);
      expect(manager.getSocket()).toBeNull();
    });

    it('should return the socket after connect', () => {
      manager = new SocketManager(consumerConfig);
      manager.connect('test-token', 'user-123');
      expect(manager.getSocket()).toBe(mockSocket);
    });
  });

  describe('isConnected', () => {
    it('should return false when no socket exists', () => {
      manager = new SocketManager(consumerConfig);
      expect(manager.isConnected()).toBe(false);
    });

    it('should return the socket connected state', () => {
      manager = new SocketManager(consumerConfig);
      manager.connect('test-token', 'user-123');
      mockSocket.connected = true;
      expect(manager.isConnected()).toBe(true);
    });
  });

  describe('reconnection behavior', () => {
    it('should re-join rooms on reconnect (connect event fired again)', () => {
      manager = new SocketManager(consumerConfig);
      manager.connect('test-token', 'user-123');

      // Simulate initial connect
      const connectCall = mockSocket.on.mock.calls.find(
        (call) => call[0] === 'connect',
      );
      const connectHandler = connectCall![1];
      connectHandler();

      vi.clearAllMocks();

      // Simulate reconnect (connect event fires again)
      connectHandler();

      expect(mockSocket.emit).toHaveBeenCalledWith('room:join', {
        room: 'consumer:user-123',
      });
      expect(mockSocket.emit).toHaveBeenCalledWith('room:join', {
        room: 'consumers',
      });
    });
  });
});
