"use client";

import { useEffect, useState } from "react";

import { connectSocket } from "@/lib/socket/client";

/**
 * Lightweight hook that exposes the socket connection state.
 * Used by the Sidebar live-status footer to toggle between
 * emerald (connected) and rose (disconnected) indicator dots.
 */
export function useSocketStatus(): boolean {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socket = connectSocket();

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    // Sync with current state on mount
    setIsConnected(socket.connected);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, []);

  return isConnected;
}
