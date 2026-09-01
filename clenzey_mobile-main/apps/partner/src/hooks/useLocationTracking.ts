import { useCallback, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import {
  startLocationTracking,
  stopLocationTracking,
} from '../services/location';

/**
 * Hook for managing background location tracking in the Partner app.
 *
 * - Starts tracking when the partner goes online (isOnline = true)
 * - Stops tracking when the partner goes offline (isOnline = false)
 * - Stops tracking on unmount (logout/navigation away)
 * - Handles permission denial gracefully with an alert
 *
 * Requirements: 21.1, 21.2, 21.3
 *
 * @param isOnline - Current online status of the partner
 */
export function useLocationTracking(isOnline: boolean): void {
  const isTrackingRef = useRef(false);

  // Start location tracking
  const startTracking = useCallback(async () => {
    try {
      await startLocationTracking();
      isTrackingRef.current = true;
    } catch (error) {
      isTrackingRef.current = false;

      if (
        error instanceof Error &&
        error.message === 'Location permission denied'
      ) {
        Alert.alert(
          'Location Permission Required',
          'Clenzey needs background location access to share your position with consumers while you are on duty. Please enable location permissions in your device settings.',
          [{ text: 'OK' }]
        );
      }
    }
  }, []);

  // Stop location tracking
  const stopTracking = useCallback(async () => {
    try {
      await stopLocationTracking();
      isTrackingRef.current = false;
    } catch {
      // Silently handle — task may already be stopped
      isTrackingRef.current = false;
    }
  }, []);

  // React to online status changes
  useEffect(() => {
    if (isOnline) {
      startTracking();
    } else {
      stopTracking();
    }
  }, [isOnline, startTracking, stopTracking]);

  // Cleanup: stop tracking on unmount (logout or navigation away)
  useEffect(() => {
    return () => {
      if (isTrackingRef.current) {
        stopLocationTracking().catch(() => {
          // Best-effort cleanup
        });
      }
    };
  }, []);
}
