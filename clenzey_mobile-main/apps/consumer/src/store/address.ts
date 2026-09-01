import { create } from 'zustand';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SELECTED_ADDRESS_KEY_PREFIX = 'clenzey_selected_address_id';
const LEGACY_SELECTED_ADDRESS_KEY = 'clenzey_selected_address_id';

export function selectedAddressStorageKey(userId: string): string {
  return `${SELECTED_ADDRESS_KEY_PREFIX}_${userId}`;
}

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

export interface AddressState {
  selectedAddressId: string | null;
  isHydrated: boolean;
  setSelectedAddressId: (addressId: string | null) => void;
  getStoredSelectedAddressId: (userId?: string) => Promise<string | null>;
  persistSelectedAddressId: (userId: string, addressId: string) => Promise<void>;
  clearPersistedSelection: (userId: string) => Promise<void>;
  clearInMemorySelection: () => void;
  hydrate: () => Promise<void>;
}

export const useAddressStore = create<AddressState>((set) => ({
  selectedAddressId: null,
  isHydrated: false,

  setSelectedAddressId: (addressId: string | null) => {
    set({ selectedAddressId: addressId != null ? String(addressId) : null });
  },

  getStoredSelectedAddressId: async (userId?: string) => {
    const key = userId ? selectedAddressStorageKey(userId) : LEGACY_SELECTED_ADDRESS_KEY;
    return storage.getItem(key);
  },

  persistSelectedAddressId: async (userId: string, addressId: string) => {
    const id = String(addressId);
    await storage.setItem(selectedAddressStorageKey(userId), id);
    set({ selectedAddressId: id });
  },

  clearPersistedSelection: async (userId: string) => {
    await storage.deleteItem(selectedAddressStorageKey(userId));
    set({ selectedAddressId: null });
  },

  clearInMemorySelection: () => {
    set({ selectedAddressId: null });
  },

  hydrate: async () => {
    set({ isHydrated: true });
  },
}));
