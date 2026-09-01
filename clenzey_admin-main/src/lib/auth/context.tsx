"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import {
  adminAuth,
  type AdminUser,
} from "@/lib/api/auth";
import {
  getStoredToken,
  setStoredToken,
} from "@/lib/api/client";
import { disconnectSocket } from "@/lib/socket/client";

type AuthState =
  | { status: "loading"; user: null }
  | { status: "authenticated"; user: AdminUser }
  | { status: "unauthenticated"; user: null };

type AuthContextValue = AuthState & {
  login: (username: string, password: string) => Promise<AdminUser>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const USER_KEY = "clenzey_admin_user";

const readStoredUser = (): null | AdminUser => {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AdminUser;
  } catch {
    return null;
  }
};

const writeStoredUser = (user: null | AdminUser) => {
  if (typeof window === "undefined") return;
  if (user === null) window.localStorage.removeItem(USER_KEY);
  else window.localStorage.setItem(USER_KEY, JSON.stringify(user));
};

/** Clears stale HttpOnly refresh cookie so /login is reachable again. */
async function clearServerSession() {
  try {
    await adminAuth.logout();
  } catch {
    /* ignore */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>({
    status: "loading",
    user: null,
  });

  useEffect(() => {
    let cancelled = false;

    const finishUnauthenticated = async () => {
      await clearServerSession();
      setStoredToken(null);
      writeStoredUser(null);
      if (!cancelled) {
        setState({ status: "unauthenticated", user: null });
      }
    };

    const bootstrap = async () => {
      const token = getStoredToken();
      const user = readStoredUser();

      if (!token || !user) {
        await finishUnauthenticated();
        return;
      }

      try {
        const refreshed = await adminAuth.refresh();
        setStoredToken(refreshed.accessToken);
        if (!cancelled) {
          setState({ status: "authenticated", user });
        }
      } catch {
        await finishUnauthenticated();
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(
    async (username: string, password: string) => {
      const result = await adminAuth.login({
        username: username.trim(),
        password: password.trim(),
      });
      setStoredToken(result.accessToken);
      writeStoredUser(result.user);
      setState({ status: "authenticated", user: result.user });
      return result.user;
    },
    [],
  );

  const logout = useCallback(async () => {
    await clearServerSession();
    disconnectSocket();
    setStoredToken(null);
    writeStoredUser(null);
    queryClient.clear();
    setState({ status: "unauthenticated", user: null });
    router.replace("/login");
  }, [router, queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      login,
      logout,
    }),
    [state, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
