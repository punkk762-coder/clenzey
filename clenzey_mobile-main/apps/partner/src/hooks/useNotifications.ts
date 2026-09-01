import { useEffect, useRef } from 'react';
import { useAuthStore } from '../store/auth';
import {
  configureNotifications,
  requestNotificationPermission,
  registerDeviceToken,
} from '../services/notifications';

/**
 * Hook that manages push notification registration for the Partner app.
 *
 * - Configures expo-notifications on mount (Android channel, handler)
 * - After auth hydration completes and user is authenticated AND approved,
 *   requests notification permission and registers the FCM device token
 * - Uses hasRegistered ref to prevent duplicate registrations within session
 * - Token removal on logout is handled by the auth store's logout action
 *
 * @validates Requirements 24.1, 24.3
 */
export function useNotifications(): void {
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const hasRegistered = useRef(false);

  // Configure notifications on mount (set handler + Android channel)
  useEffect(() => {
    configureNotifications();
  }, []);

  // Register device token when authenticated and approved (after hydration)
  useEffect(() => {
    if (isLoading || !isAuthenticated || user?.approvalStatus !== 'APPROVED') {
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
  }, [isAuthenticated, isLoading, user?.approvalStatus]);
}
