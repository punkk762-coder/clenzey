import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { createPartnersEndpoints } from '@clenzey/api-client';
import { apiClient } from '../lib/api';

/**
 * Background location tracking service for the Partner app.
 *
 * Uses expo-location and expo-task-manager to:
 * - Request foreground + background location permissions
 * - Define a background task that posts GPS data to POST /partners/location
 * - Start/stop location updates when the partner goes online/offline
 * - Retry GPS position on failure and fall back to last known location
 *
 * Requirements: 21.1, 21.2, 21.3, 21.4
 */

export const LOCATION_TASK_NAME = 'CLENZEY_PARTNER_BACKGROUND_LOCATION';

const partnersApi = createPartnersEndpoints(apiClient);

/** Maximum number of GPS retry attempts before falling back to last known position */
const GPS_RETRY_ATTEMPTS = 3;

/** Delay in milliseconds between GPS retry attempts */
const GPS_RETRY_DELAY_MS = 2000;

// ─── Utility ─────────────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── GPS Fallback Strategy ───────────────────────────────────────────────────

/**
 * Attempts to get the current GPS position with retry logic and last known
 * location fallback.
 *
 * Strategy:
 * 1. Try to get current position with High accuracy
 * 2. On failure: retry up to 3 times with Balanced accuracy (2s delay between)
 * 3. If all retries fail: return last known position as final fallback
 *
 * Requirement: 21.4 — IF the device GPS is unavailable, THEN THE Location_Service
 * SHALL retry obtaining the position and report the last known location.
 *
 * @returns LocationObject if available, null if no position can be determined
 */
export async function getLocationWithFallback(): Promise<Location.LocationObject | null> {
  // First attempt: High accuracy
  try {
    return await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
  } catch {
    // GPS unavailable — enter retry loop with reduced accuracy
  }

  // Retry up to GPS_RETRY_ATTEMPTS times with Balanced accuracy
  for (let i = 0; i < GPS_RETRY_ATTEMPTS; i++) {
    await delay(GPS_RETRY_DELAY_MS);
    try {
      return await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
    } catch {
      // Continue to next retry attempt
    }
  }

  // Final fallback: last known position
  return await Location.getLastKnownPositionAsync();
}

// ─── Define the Background Location Task ─────────────────────────────────────
// This must be called at module scope (top-level) for TaskManager to register it.
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    // GPS error received from TaskManager — attempt fallback strategy
    const fallbackLocation = await getLocationWithFallback();

    if (fallbackLocation) {
      const { latitude, longitude, heading, speed } = fallbackLocation.coords;
      try {
        await partnersApi.updateLocation({
          latitude,
          longitude,
          heading: heading ?? 0,
          speed: speed ?? 0,
          isOnline: true,
        });
      } catch {
        // Silently catch network errors — next interval will retry
      }
    }
    return;
  }

  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };

    if (locations && locations.length > 0) {
      const latestLocation = locations[0];
      const { latitude, longitude, heading, speed } = latestLocation.coords;

      // Fire-and-forget: POST location update to the server
      try {
        await partnersApi.updateLocation({
          latitude,
          longitude,
          heading: heading ?? 0,
          speed: speed ?? 0,
          isOnline: true,
        });
      } catch {
        // Silently catch network errors — next interval will retry
      }
    }
  }
});

// ─── Permission Request Flow ─────────────────────────────────────────────────

/**
 * Requests foreground and background location permissions sequentially.
 *
 * On Android, background permission must be requested separately after
 * foreground permission is granted.
 *
 * @returns true if both foreground and background permissions are granted
 */
export async function requestLocationPermissions(): Promise<boolean> {
  const { status: foregroundStatus } =
    await Location.requestForegroundPermissionsAsync();

  if (foregroundStatus !== 'granted') {
    return false;
  }

  const { status: backgroundStatus } =
    await Location.requestBackgroundPermissionsAsync();

  return backgroundStatus === 'granted';
}

// ─── Start Location Tracking ─────────────────────────────────────────────────

/**
 * Starts background location updates using the registered TaskManager task.
 *
 * Configuration:
 * - accuracy: High (GPS-level precision for real-time tracking)
 * - timeInterval: 7000ms (within the 5000-10000ms requirement range)
 * - distanceInterval: 10m (minimum distance between updates)
 * - foregroundService: Android notification for background execution
 * - showsBackgroundLocationIndicator: iOS background indicator
 *
 * @throws Error if location permissions are not granted
 */
export async function startLocationTracking(): Promise<void> {
  const hasPermission = await requestLocationPermissions();

  if (!hasPermission) {
    throw new Error('Location permission denied');
  }

  // Check if the task is already running to avoid duplicate registrations
  const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
  if (isRegistered) {
    // Already tracking — no-op
    return;
  }

  await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
    accuracy: Location.Accuracy.High,
    timeInterval: 7000, // 7 seconds — between 5000-10000ms per requirements
    distanceInterval: 10, // Update every 10 meters minimum
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'clenzey partner',
      notificationBody: 'Location tracking active while on duty',
      notificationColor: '#0043BA',
    },
  });
}

// ─── Stop Location Tracking ──────────────────────────────────────────────────

/**
 * Stops background location updates if the task is currently registered.
 *
 * Called when:
 * - Partner goes offline (toggles off)
 * - Partner logs out
 */
export async function stopLocationTracking(): Promise<void> {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);

  if (isRegistered) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
  }
}
