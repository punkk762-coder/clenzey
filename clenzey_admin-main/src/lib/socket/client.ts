"use client";

import { io, type Socket } from "socket.io-client";

import { getStoredToken } from "@/lib/api/client";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || "https://clenzey.onrender.com";


let socket: null | Socket = null;

export const getSocket = (): Socket => {
  if (socket) return socket;
  socket = io(SOCKET_URL, {
    autoConnect: false,
    transports: ["websocket", "polling"],
    withCredentials: true,
    auth: (cb) => {
      cb({ token: getStoredToken() });
    },
  });
  return socket;
};

export const connectSocket = () => {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
};

export const disconnectSocket = () => {
  if (!socket) return;
  socket.removeAllListeners();
  if (socket.connected) socket.disconnect();
  socket = null;
};
