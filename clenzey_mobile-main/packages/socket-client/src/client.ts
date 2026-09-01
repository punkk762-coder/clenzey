import { io, Socket } from 'socket.io-client';
import type { ServerEvents, ClientEvents } from './events';

declare const __DEV__: boolean | undefined;

export type TypedSocket = Socket<ServerEvents, ClientEvents>;

export interface SocketConfig {
  url: string;
  /** The room prefix to join on connection (e.g. "consumer" or "partner") */
  roomPrefix: 'consumer' | 'partner';
}

/**
 * Manages the Socket.IO client connection lifecycle.
 *
 * - Connects with auth token
 * - Auto-joins the user room on connection
 * - Handles reconnection with exponential backoff
 * - Provides subscribe/unsubscribe for booking tracking
 *
 * @validates Requirements 27.1, 27.2, 27.3, 27.7
 */
export class SocketManager {
  private socket: TypedSocket | null = null;
  private config: SocketConfig;
  private userId: string | null = null;
  private token: string | null = null;

  constructor(config: SocketConfig) {
    this.config = config;
  }

  /**
   * Connect to the Socket.IO server with the given auth token.
   * Automatically joins the user-specific room(s) based on roomPrefix.
   *
   * For consumer: joins rooms `consumer:{userId}` and `consumers`
   * For partner: joins room `partner:{userId}`
   *
   * Reconnection uses exponential backoff:
   * - Initial delay: 1000ms
   * - Max delay: 30000ms
   * - Factor: 2 (handled by Socket.IO's built-in randomizationFactor)
   *
   * @validates Requirements 27.1, 27.2, 27.3, 27.7
   */
  connect(token: string, userId: string): TypedSocket {
    if (this.socket?.connected) {
      return this.socket;
    }

    // Store for reconnection room re-joining
    this.token = token;
    this.userId = userId;

    this.socket = io(this.config.url, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      randomizationFactor: 0, // Clean exponential backoff with factor ~2
    }) as TypedSocket;

    this.setupEventHandlers();

    return this.socket;
  }

  /**
   * Disconnect from the Socket.IO server and clean up all listeners.
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.userId = null;
    this.token = null;
  }

  /**
   * Subscribe to real-time updates for a specific booking.
   */
  subscribeToBooking(bookingId: string): void {
    this.socket?.emit('booking:subscribe', { bookingId });
  }

  /**
   * Unsubscribe from real-time updates for a specific booking.
   */
  unsubscribeFromBooking(bookingId: string): void {
    this.socket?.emit('booking:unsubscribe', { bookingId });
  }

  /**
   * Register an event listener on the socket.
   */
  on<E extends keyof ServerEvents>(
    event: E,
    handler: ServerEvents[E],
  ): void {
    this.socket?.on(event, handler as any);
  }

  /**
   * Remove an event listener from the socket.
   */
  off<E extends keyof ServerEvents>(
    event: E,
    handler: ServerEvents[E],
  ): void {
    this.socket?.off(event, handler as any);
  }

  /**
   * Get the underlying socket instance.
   */
  getSocket(): TypedSocket | null {
    return this.socket;
  }

  /**
   * Check if the socket is currently connected.
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Set up internal event handlers for connection lifecycle.
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.joinRooms();
    });

    this.socket.on('disconnect', (reason) => {
      // Socket.IO will auto-reconnect unless disconnect was initiated by server
      // with `server namespace disconnect` or client called disconnect()
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.log(`[SocketManager] Disconnected: ${reason}`);
      }
    });

    this.socket.on('connect_error', (error) => {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn(`[SocketManager] Connection error: ${error.message}`);
      }
      // Auth errors typically contain "unauthorized" or similar messaging.
      // Transient network errors will be retried by Socket.IO's reconnection logic.
    });
  }

  /**
   * Join the appropriate rooms based on the configured roomPrefix.
   *
   * Consumer joins: `consumer:{userId}` and `consumers`
   * Partner joins: `partner:{userId}`
   *
   * Note: Room joining is primarily handled server-side via the auth token,
   * but we emit a join event for explicit tracking on the client.
   */
  private joinRooms(): void {
    if (!this.socket || !this.userId) return;

    const rooms: string[] = [];

    if (this.config.roomPrefix === 'consumer') {
      rooms.push(`consumer:${this.userId}`, 'consumers');
    } else {
      rooms.push(`partner:${this.userId}`);
    }

    // Emit room join for tracking purposes.
    // The server handles actual room assignment via auth token validation.
    for (const room of rooms) {
      this.socket.emit('room:join', { room });
    }
  }
}
