import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const ONBOARDING_KEY = 'onboarding_completed';

interface OnboardingState {
  completed: boolean;
  checked: boolean;
  hydrate: () => Promise<void>;
  markCompleted: () => Promise<void>;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  completed: false,
  checked: false,
  hydrate: async () => {
    try {
      const value = await AsyncStorage.getItem(ONBOARDING_KEY);
      set({ completed: value === 'true', checked: true });
    } catch {
      set({ completed: false, checked: true });
    }
  },
  markCompleted: async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    } catch {}
    set({ completed: true, checked: true });
  },
}));
