"use client";

import { useEffect } from "react";

import { connectSocket } from "@/lib/socket/client";

export function useQuotationEvents(onEvent: () => void) {
  useEffect(() => {
    const socket = connectSocket();

    socket.on("quotation:created", onEvent);
    socket.on("quotation:updated", onEvent);

    return () => {
      socket.off("quotation:created", onEvent);
      socket.off("quotation:updated", onEvent);
    };
  }, [onEvent]);
}
