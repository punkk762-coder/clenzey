"use client";

import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { getSocket } from "@/lib/socket/client";
import {
  partnerOperationalStatusApi,
  type PartnerOperationalSnapshot,
} from "@/lib/api/partnerOperationalStatus";
import { useSocketStatus } from "@/hooks/useSocketStatus";

export const partnerOperationalQueryKey = ["partners", "operational-status"] as const;

export function usePartnerOperationalStatus() {
  const queryClient = useQueryClient();
  const isConnected = useSocketStatus();
  const [socketDown, setSocketDown] = useState(false);

  const query = useQuery({
    queryKey: partnerOperationalQueryKey,
    queryFn: () => partnerOperationalStatusApi.list({ limit: 200 }),
    refetchInterval: isConnected ? false : 30_000,
  });

  const upsertSnapshot = useCallback(
    (snapshot: PartnerOperationalSnapshot) => {
      queryClient.setQueryData(
        partnerOperationalQueryKey,
        (prev: { partners: PartnerOperationalSnapshot[]; total: number } | undefined) => {
          if (!prev) {
            return { partners: [snapshot], total: 1 };
          }
          const idx = prev.partners.findIndex((p) => p.partnerId === snapshot.partnerId);
          if (idx === -1) {
            return {
              partners: [...prev.partners, snapshot],
              total: prev.total + 1,
            };
          }
          const next = [...prev.partners];
          next[idx] = snapshot;
          return { ...prev, partners: next };
        },
      );
    },
    [queryClient],
  );

  useEffect(() => {
    const socket = getSocket();
    setSocketDown(!socket.connected);

    const onStatus = (payload: PartnerOperationalSnapshot) => {
      upsertSnapshot(payload);
    };
    const onConnect = () => setSocketDown(false);
    const onDisconnect = () => setSocketDown(true);

    socket.on("partner:operational_status", onStatus);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    return () => {
      socket.off("partner:operational_status", onStatus);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, [upsertSnapshot]);

  return {
    ...query,
    partners: query.data?.partners ?? [],
    total: query.data?.total ?? 0,
    socketDown: socketDown || !isConnected,
  };
}
