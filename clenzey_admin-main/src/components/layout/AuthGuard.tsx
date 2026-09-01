"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth/context";

export function AuthGuard({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (auth.status === "unauthenticated") {
      router.replace("/login");
    }
  }, [auth.status, router]);

  if (auth.status === "loading") {
    return (
      <div className="grid min-h-screen place-items-center bg-base-100">
        <div className="flex flex-col items-center gap-3">
          <div className="signal-dot" />
          <span className="font-mono text-xs uppercase tracking-[0.2em] opacity-60">
            Establishing terminal session…
          </span>
        </div>
      </div>
    );
  }

  if (auth.status === "unauthenticated") {
    return (
      <div className="grid min-h-screen place-items-center bg-base-100">
        <span className="font-mono text-xs uppercase tracking-[0.2em] opacity-60">
          Redirecting to sign in…
        </span>
      </div>
    );
  }

  return <>{children}</>;
}
