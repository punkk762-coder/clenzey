import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { notificationsApi } from '../lib/api';

const DEVICE_TOKEN_KEY = 'clenzey_partner_device_push_token';

/**
 * Notification data structure received from the server.
 */
interface NotificationData {
  assignmentId?: string;
  bookingId?: string;
  type?: string;
  [key: string]: unknown;
}

/** Callback for showing in-app toast when a foreground notification is received. */
export type OnForegroundNotification = (title: string, body: string) => void;

/** Subscription reference for cleanup. */
let foregroundSubscription: Notifications.Subscription | null = null;
let responseSubscription: Notifications.Subscription | null = null;

/**
 * Configure expo-notifications for Android.
 * Sets up default notification behavior and creates a notification channel.
 */
export function configureNotifications(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0043BA',
    });
  }
}

/**
 * Set up foreground notification listener that triggers an in-app toast.
 * Call this once in the root layout when the app mounts.
 *
 * @param onNotification - Callback to display an in-app toast with title and body
 * @returns Cleanup function to remove the listener
 *
 * @validates Requirements 24.2
 */
export function setupForegroundNotificationHandler(
  onNotification: OnForegroundNotification,
): () => void {
  foregroundSubscription = Notifications.addNotificationReceivedListener(
    (notification) => {
      const { title, body } = notification.request.content;
      if (title || body) {
        onNotification(title ?? '', body ?? '');
      }
    },
  );

  return () => {
    if (foregroundSubscription) {
      foregroundSubscription.remove();
      foregroundSubscription = null;
    }
  };
}

/**
 * Navigate to the relevant screen based on notification type.
 * Used by both notification press handler and notification inbox item press.
 *
 * For partners:
 * - Assignment notifications → /assignments/{assignmentId}
 * - Booking updates → /(tabs)/bookings/{bookingId}
 *
 * @validates Requirements 24.4
 */
export function navigateFromNotification(data: NotificationData): void {
  const { assignmentId, bookingId, type } = data;

  // Assignment-related notifications navigate to assignment detail
  if (assignmentId) {
    router.push(`/assignments/${assignmentId}` as any);
    return;
  }

  // Booking-related notifications navigate to booking detail
  if (bookingId) {
    switch (type) {
      case 'booking_assigned':
      case 'booking_cancelled':
      case 'booking_update':
        router.push(`/(tabs)/bookings/${bookingId}` as any);
        break;
      default:
        router.push(`/(tabs)/bookings/${bookingId}` as any);
        break;
    }
    return;
  }
}

/**
 * Set up notification response (press) handler for deep linking.
 * When the user taps a notification, navigate to the relevant screen.
 *
 * @returns Cleanup function to remove the listener
 *
 * @validates Requirements 24.4
 */
export function setupNotificationPressHandler(): () => void {
  responseSubscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const data = response.notification.request.content.data as NotificationData;
      if (data) {
        navigateFromNotification(data);
      }
    },
  );

  return () => {
    if (responseSubscription) {
      responseSubscription.remove();
      responseSubscription = null;
    }
  };
}

/**
 * Request notification permissions and retrieve the device FCM push token.
 * Returns the token string on success, or null if permission was denied.
 */
export async function requestNotificationPermission(): Promise<string | null> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  const tokenData = await Notifications.getDevicePushTokenAsync();
  return tokenData.data as string;
}

/**
 * Get the locally stored device token (if any).
 */
export async function getStoredDeviceToken(): Promise<string | null> {
  return SecureStore.getItemAsync(DEVICE_TOKEN_KEY);
}

/**
 * Store the device token locally for later removal on logout.
 */
export async function storeDeviceToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(DEVICE_TOKEN_KEY, token);
}

/**
 * Register the device push token with the backend.
 * Stores the token locally in SecureStore for later removal on logout.
 *
 * @validates Requirements 24.1
 */
export async function registerDeviceToken(token: string): Promise<void> {
  await notificationsApi.registerToken('partners', {
    token,
    platform: 'ANDROID',
  });
  // Store locally so we can unregister on logout
  await SecureStore.setItemAsync(DEVICE_TOKEN_KEY, token);
}

/**
 * Remove the device push token from the backend.
 * Clears the locally stored token. Called on logout.
 *
 * @validates Requirements 24.3
 */
export async function removeDeviceToken(): Promise<void> {
  const token = await SecureStore.getItemAsync(DEVICE_TOKEN_KEY);
  if (token) {
    try {
      await notificationsApi.removeToken('partners', { token });
    } catch {
      // Best-effort removal — don't block logout if this fails
    }
    await SecureStore.deleteItemAsync(DEVICE_TOKEN_KEY);
  }
}

/**
 * Clear the locally stored device token.
 */
export async function clearStoredDeviceToken(): Promise<void> {
  await SecureStore.deleteItemAsync(DEVICE_TOKEN_KEY);
}
