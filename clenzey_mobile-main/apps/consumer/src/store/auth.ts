import { create } from 'zustand';
import type { Consumer } from '@clenzey/types';
import { platformStorage as storage } from '../lib/platform-storage';

const TOKEN_KEY = 'clenzey_access_token';
const USER_KEY = 'clenzey_user';

/** Preserve existing profile fields when API responses are partial. */
function mergeConsumer(existing: Consumer | null, incoming: Consumer): Consumer {
  if (!existing) return incoming;

  return {
    ...existing,
    ...incoming,
    id: incoming.id || existing.id,
    phone: incoming.phone || existing.phone,
    fullName: incoming.fullName?.trim() || existing.fullName || '',
    createdAt: incoming.createdAt || existing.createdAt,
    updatedAt: incoming.updatedAt || existing.updatedAt,
  };
}

export interface AuthState {
  accessToken: string | null;
  user: Consumer | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setToken: (token: string) => void;
  setUser: (user: Consumer) => void;
  logout: () => void;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  isAuthenticated: false,
  isLoading: true,

  setToken: (token: string) => {
    storage.setItem(TOKEN_KEY, token);
    set({ accessToken: token, isAuthenticated: true });
  },

  setUser: (user: Consumer) => {
    set((state) => {
      const merged = mergeConsumer(state.user, user);
      storage.setItem(USER_KEY, JSON.stringify(merged));
      return { user: merged };
    });
  },

  logout: () => {
    void import('../services/notifications')
      .then(({ removeDeviceToken }) => removeDeviceToken())
      .catch(() => undefined);
    void storage.deleteItem(TOKEN_KEY);
    void storage.deleteItem(USER_KEY);
    set({
      accessToken: null,
      user: null,
      isAuthenticated: false,
    });
  },

  hydrate: async () => {
    try {
      const [token, userJson] = await Promise.all([
        storage.getItem(TOKEN_KEY),
        storage.getItem(USER_KEY),
      ]);

      const user = userJson ? (JSON.parse(userJson) as Consumer) : null;

      set({
        accessToken: token,
        user,
        isAuthenticated: !!token,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },
}));

/**
 * Helper to read the access token from storage.
 * Used by the API client to attach Bearer tokens without coupling to Zustand.
 */
export async function getToken(): Promise<string | null> {
  return storage.getItem(TOKEN_KEY);
}
