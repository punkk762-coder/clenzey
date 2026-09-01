import { create } from 'zustand';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Partner } from '@clenzey/types';

const TOKEN_KEY = 'clenzey_partner_access_token';
const USER_KEY = 'clenzey_partner_user';

/**
 * Platform-safe storage abstraction.
 * Uses SecureStore on native (iOS/Android) and AsyncStorage on web.
 */
const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return AsyncStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },
  async deleteItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      await AsyncStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  },
};

export interface AuthState {
  accessToken: string | null;
  user: Partner | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setToken: (token: string) => void;
  setUser: (user: Partner) => void;
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

  setUser: (user: Partner) => {
    storage.setItem(USER_KEY, JSON.stringify(user));
    set({ user });
  },

  logout: () => {
    storage.deleteItem(TOKEN_KEY);
    storage.deleteItem(USER_KEY);
    import('../services/notifications').then(({ removeDeviceToken }) =>
      removeDeviceToken().catch(() => {}),
    );
    import('../services/location').then(({ stopLocationTracking }) =>
      stopLocationTracking().catch(() => {}),
    );
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

      const user = userJson ? (JSON.parse(userJson) as Partner) : null;

      set({
        accessToken: token,
        user,
        isAuthenticated: !!token,
        isLoading: false,
      });
    } catch {
      set({
        accessToken: null,
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },
}));

/**
 * Helper to retrieve the access token from storage.
 * Used by the API client configuration for attaching Bearer tokens.
 */
export async function getToken(): Promise<string | null> {
  return storage.getItem(TOKEN_KEY);
}
