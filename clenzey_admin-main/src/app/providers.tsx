"use client";

import { useState, type ReactNode } from "react";
import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import { SocketProvider } from "@/components/providers/SocketProvider";
import { AuthProvider } from "@/lib/auth/context";
import { ToastListener, ToastProvider } from "@/lib/toast";

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={client}>
      <AuthProvider>
        <SocketProvider>
          <ToastProvider>
            <ToastListener />
            {children}
          </ToastProvider>
        </SocketProvider>
      </AuthProvider>
      {process.env.NODE_ENV !== "production" && <ReactQueryDevtools />}
    </QueryClientProvider>
  );
}
