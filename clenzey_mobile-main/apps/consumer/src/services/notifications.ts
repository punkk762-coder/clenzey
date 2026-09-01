import { Platform } from 'react-native';
import { router } from 'expo-router';
import type { PushPlatform } from '@clenzey/api-client';
import { notificationsApi } from '../lib/api';
import { platformStorage } from '../lib/platform-storage';

const DEVICE_TOKEN_KEY = 'clenzey_device_push_token';

type NotificationSubscription = { remove: () => void };

/**
 * Notification data structure received from the server.
 */
interface NotificationData {
  bookingId?: string;
  type?: string;
  [key: string]: unknown;
}

/** Callback for showing in-app toast when a foreground notification is received. */
export type OnForegroundNotification = (title: string, body: string) => void;

/** Subscription reference for cleanup. */
let foregroundSubscription: NotificationSubscription | null = null;
let responseSubscription: NotificationSubscription | null = null;

function getNotificationsModule() {
  if (Platform.OS === 'web') {
    return null;
  }

  // Lazy-load native notifications to keep web bundles working.
  return require('expo-notifications') as typeof import('expo-notifications');
}

function getDevicePlatform(): PushPlatform {
  return Platform.OS === 'ios' ? 'IOS' : 'ANDROID';
}

/**
 * Configure expo-notifications for Android.
 * Sets up default notification behavior and creates a notification channel.
 */
export function configureNotifications(): void {
  try {
    const Notifications = getNotificationsModule();
    if (!Notifications || !Notifications.setNotificationHandler) {
      return;
    }

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: false,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: false,
        shouldShowList: false,
      }),
    });

    if (Platform.OS === 'android' && Notifications.setNotificationChannelAsync) {
      Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0043BA',
      }).catch(() => {});
    }
  } catch (err) {
    console.warn('Notification config error (safe fallback):', err);
  }
}

/**
 * Set up foreground notification listener that triggers an in-app toast.
 */
export function setupForegroundNotificationHandler(
  onNotification: OnForegroundNotification,
): () => void {
  try {
    const Notifications = getNotificationsModule();
    if (!Notifications || !Notifications.addNotificationReceivedListener) {
      return () => undefined;
    }

    foregroundSubscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        const { title, body } = notification?.request?.content ?? {};
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
  } catch (err) {
    console.warn('Foreground notification listener error:', err);
    return () => undefined;
  }
}

/**
 * Navigate to the relevant screen based on notification type.
 */
export function navigateFromNotification(data: NotificationData): void {
  const { bookingId, type } = data;

  if (!bookingId) return;

  switch (type) {
    case 'booking_confirmed':
    case 'partner_assigned':
    case 'partner_en_route':
    case 'booking_completed':
    case 'payment_captured':
    case 'payment_failed':
      router.push(`/(tabs)/bookings/${bookingId}` as any);
      break;
    default:
      if (bookingId) {
        router.push(`/(tabs)/bookings/${bookingId}` as any);
      }
      break;
  }
}

function handleNotificationResponse(
  data: NotificationData | undefined | null,
): void {
  if (data) {
    navigateFromNotification(data);
  }
}

/**
 * Set up notification response (press) handler for deep linking.
 */
export function setupNotificationPressHandler(): () => void {
  try {
    const Notifications = getNotificationsModule();
    if (!Notifications || !Notifications.addNotificationResponseReceivedListener) {
      return () => undefined;
    }

    responseSubscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response?.notification?.request?.content?.data as NotificationData;
        handleNotificationResponse(data);
      },
    );

    return () => {
      if (responseSubscription) {
        responseSubscription.remove();
        responseSubscription = null;
      }
    };
  } catch (err) {
    console.warn('Notification press handler error:', err);
    return () => undefined;
  }
}

/**
 * Handle a notification tap that launched the app from a killed state.
 */
export async function handleColdStartNotification(): Promise<void> {
  try {
    const Notifications = getNotificationsModule();
    if (!Notifications || !Notifications.getLastNotificationResponseAsync) {
      return;
    }

    const response = await Notifications.getLastNotificationResponseAsync();
    if (response) {
      handleNotificationResponse(
        response.notification?.request?.content?.data as NotificationData,
      );
    }
  } catch (err) {
    console.warn('Cold start notification error:', err);
  }
}


/**
 * Request notification permissions and retrieve the device FCM push token.
 */
export async function requestNotificationPermission(): Promise<string | null> {
  const Notifications = getNotificationsModule();
  if (!Notifications) {
    return null;
  }

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
 * Register the device push token with the backend.
 */
export async function registerDeviceToken(token: string): Promise<void> {
  await notificationsApi.registerToken('consumers', {
    token,
    platform: getDevicePlatform(),
  });
  await platformStorage.setItem(DEVICE_TOKEN_KEY, token);
}

/**
 * Remove the device push token from the backend.
 */
export async function removeDeviceToken(): Promise<void> {
  const token = await platformStorage.getItem(DEVICE_TOKEN_KEY);
  if (token) {
    try {
      await notificationsApi.removeToken('consumers', { token });
    } catch {
      // Best-effort removal — don't block logout if this fails
    }
    await platformStorage.deleteItem(DEVICE_TOKEN_KEY);
  }
}

/**
 * Get the locally stored device token (if any).
 */
export async function getStoredDeviceToken(): Promise<string | null> {
  return platformStorage.getItem(DEVICE_TOKEN_KEY);
}
