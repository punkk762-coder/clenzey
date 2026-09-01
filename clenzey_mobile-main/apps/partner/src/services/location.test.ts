import * as Location from 'expo-location';

// Mock expo-location
jest.mock('expo-location', () => ({
  getCurrentPositionAsync: jest.fn(),
  getLastKnownPositionAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  requestBackgroundPermissionsAsync: jest.fn(),
  startLocationUpdatesAsync: jest.fn(),
  stopLocationUpdatesAsync: jest.fn(),
  Accuracy: {
    High: 6,
    Balanced: 3,
  },
}));

// Mock expo-task-manager
jest.mock('expo-task-manager', () => ({
  defineTask: jest.fn(),
  isTaskRegisteredAsync: jest.fn(),
}));

// Mock the API client
jest.mock('../lib/api', () => ({
  apiClient: {},
}));

jest.mock('@clenzey/api-client', () => ({
  createPartnersEndpoints: () => ({
    updateLocation: jest.fn().mockResolvedValue(undefined),
  }),
}));

// Use fake timers to control delay()
jest.useFakeTimers();

import { getLocationWithFallback } from './location';

const mockLocation = Location as jest.Mocked<typeof Location>;

describe('location service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getLocationWithFallback', () => {
    const mockLocationObject: Location.LocationObject = {
      coords: {
        latitude: 12.9716,
        longitude: 77.5946,
        altitude: 920,
        accuracy: 10,
        altitudeAccuracy: 5,
        heading: 180,
        speed: 5,
      },
      timestamp: Date.now(),
    };

    const mockLastKnownLocation: Location.LocationObject = {
      coords: {
        latitude: 12.9700,
        longitude: 77.5900,
        altitude: 920,
        accuracy: 50,
        altitudeAccuracy: 10,
        heading: 0,
        speed: 0,
      },
      timestamp: Date.now() - 60000,
    };

    it('should return current position on first attempt with High accuracy', async () => {
      mockLocation.getCurrentPositionAsync.mockResolvedValueOnce(mockLocationObject);

      const result = await getLocationWithFallback();

      expect(result).toEqual(mockLocationObject);
      expect(mockLocation.getCurrentPositionAsync).toHaveBeenCalledWith({
        accuracy: Location.Accuracy.High,
      });
      expect(mockLocation.getCurrentPositionAsync).toHaveBeenCalledTimes(1);
    });

    it('should retry with Balanced accuracy after initial High accuracy failure', async () => {
      // First attempt (High) fails
      mockLocation.getCurrentPositionAsync.mockRejectedValueOnce(new Error('GPS unavailable'));
      // First retry (Balanced) succeeds
      mockLocation.getCurrentPositionAsync.mockResolvedValueOnce(mockLocationObject);

      const promise = getLocationWithFallback();

      // Advance past the delay
      await jest.advanceTimersByTimeAsync(2000);

      const result = await promise;

      expect(result).toEqual(mockLocationObject);
      expect(mockLocation.getCurrentPositionAsync).toHaveBeenCalledTimes(2);
      expect(mockLocation.getCurrentPositionAsync).toHaveBeenLastCalledWith({
        accuracy: Location.Accuracy.Balanced,
      });
    });

    it('should retry up to 3 times before falling back to last known position', async () => {
      // First attempt (High) fails
      mockLocation.getCurrentPositionAsync.mockRejectedValueOnce(new Error('GPS unavailable'));
      // All 3 retries (Balanced) fail
      mockLocation.getCurrentPositionAsync.mockRejectedValueOnce(new Error('GPS unavailable'));
      mockLocation.getCurrentPositionAsync.mockRejectedValueOnce(new Error('GPS unavailable'));
      mockLocation.getCurrentPositionAsync.mockRejectedValueOnce(new Error('GPS unavailable'));
      // Fallback
      mockLocation.getLastKnownPositionAsync.mockResolvedValueOnce(mockLastKnownLocation);

      const promise = getLocationWithFallback();

      // Advance past all 3 retry delays (3 x 2000ms)
      await jest.advanceTimersByTimeAsync(2000);
      await jest.advanceTimersByTimeAsync(2000);
      await jest.advanceTimersByTimeAsync(2000);

      const result = await promise;

      expect(result).toEqual(mockLastKnownLocation);
      expect(mockLocation.getCurrentPositionAsync).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
      expect(mockLocation.getLastKnownPositionAsync).toHaveBeenCalledTimes(1);
    });

    it('should return null if no position is available at all', async () => {
      // All attempts fail
      mockLocation.getCurrentPositionAsync.mockRejectedValue(new Error('GPS unavailable'));
      mockLocation.getLastKnownPositionAsync.mockResolvedValueOnce(null);

      const promise = getLocationWithFallback();

      await jest.advanceTimersByTimeAsync(2000);
      await jest.advanceTimersByTimeAsync(2000);
      await jest.advanceTimersByTimeAsync(2000);

      const result = await promise;

      expect(result).toBeNull();
    });

    it('should succeed on second retry (third overall attempt)', async () => {
      // First attempt (High) fails
      mockLocation.getCurrentPositionAsync.mockRejectedValueOnce(new Error('GPS unavailable'));
      // First retry (Balanced) fails
      mockLocation.getCurrentPositionAsync.mockRejectedValueOnce(new Error('GPS unavailable'));
      // Second retry (Balanced) succeeds
      mockLocation.getCurrentPositionAsync.mockResolvedValueOnce(mockLocationObject);

      const promise = getLocationWithFallback();

      await jest.advanceTimersByTimeAsync(2000);
      await jest.advanceTimersByTimeAsync(2000);

      const result = await promise;

      expect(result).toEqual(mockLocationObject);
      expect(mockLocation.getCurrentPositionAsync).toHaveBeenCalledTimes(3);
      expect(mockLocation.getLastKnownPositionAsync).not.toHaveBeenCalled();
    });
  });

  describe('foreground service notification configuration', () => {
    it('should verify Android foreground service is enabled in app.json', () => {
      // This is a static verification — the app.json has:
      // "isAndroidForegroundServiceEnabled": true
      // in the expo-location plugin config.
      const appJson = require('../../app.json');
      const locationPlugin = appJson.expo.plugins.find(
        (p: unknown) => Array.isArray(p) && p[0] === 'expo-location'
      );
      expect(locationPlugin).toBeDefined();
      expect(locationPlugin[1].isAndroidForegroundServiceEnabled).toBe(true);
    });
  });
});
