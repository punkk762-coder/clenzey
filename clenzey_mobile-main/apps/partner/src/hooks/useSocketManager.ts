import { useEffect, useRef, useState } from 'react';
import { SocketManager } from '@clenzey/socket-client';
import { useAuthStore } from '../store/auth';

const SOCKET_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'https://api.clenzey.com').replace(/\/api\/v\d+$/, '');

/**
 * Manages the Socket.IO connection lifecycle for the Partner app.
 *
 * - Connects when authenticated (token + user available)
 * - Disconnects on logout or unmount
 * - Returns the SocketManager instance for use in other hooks
 *
 * Requirements: 27.1, 27.2, 27.3
 */
export function useSocketManager(): SocketManager | null {
  const { accessToken, user, isAuthenticated } = useAuthStore();
  const [socketManager, setSocketManager] = useState<SocketManager | null>(null);
  const managerRef = useRef<SocketManager | null>(null);

  useEffect(() => {
    if (isAuthenticated && accessToken && user?.id) {
      // Create and connect socket manager
      const manager = new SocketManager({
        url: SOCKET_URL,
        roomPrefix: 'partner',
      });
      manager.connect(accessToken, user.id);
      managerRef.current = manager;
      setSocketManager(manager);

      return () => {
        manager.disconnect();
        managerRef.current = null;
        setSocketManager(null);
      };
    } else {
      // Not authenticated — disconnect if connected
      if (managerRef.current) {
        managerRef.current.disconnect();
        managerRef.current = null;
        setSocketManager(null);
      }
    }
  }, [isAuthenticated, accessToken, user?.id]);

  return socketManager;
}
