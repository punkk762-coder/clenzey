import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { useAuthStore } from '../store/auth';
import {
  configureNotifications,
  requestNotificationPermission,
  registerDeviceToken,
} from '../services/notifications';

/**
 * Hook that manages push notification registration for the Consumer app.
 *
 * - Configures expo-notifications on mount (Android channel, handler)
 * - After auth hydration completes and user is authenticated, requests
 *   notification permission and registers the FCM device token
 * - Token removal on logout is handled by the auth store's logout action
 *
 * @validates Requirements 12.1, 12.3
 */
const pushNotificationsEnabled =
  Constants.expoConfig?.extra?.pushNotificationsEnabled !== false;

export function useNotifications(): void {
  const { isAuthenticated, isLoading } = useAuthStore();
  const hasRegistered = useRef(false);

  // Configure notifications on mount (set handler + Android channel)
  useEffect(() => {
    if (Platform.OS === 'web' || !pushNotificationsEnabled) {
      return;
    }
    configureNotifications();
  }, []);

  // Register device token when authenticated (after hydration)
  useEffect(() => {
    if (Platform.OS === 'web' || !pushNotificationsEnabled) {
      return;
    }

    if (isLoading || !isAuthenticated) {
      hasRegistered.current = false;
      return;
    }

    // Avoid duplicate registrations within same session
    if (hasRegistered.current) return;

    const register = async () => {
      try {
        const token = await requestNotificationPermission();
        if (token) {
          await registerDeviceToken(token);
          hasRegistered.current = true;
        }
      } catch {
        // Non-critical — don't crash the app if registration fails
      }
    };

    register();
  }, [isAuthenticated, isLoading]);
}
