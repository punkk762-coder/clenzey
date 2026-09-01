import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { fonts, materialStyle } from '@clenzey/design-system';
import { useQueryClient } from '@tanstack/react-query';
import {
  usePartnerLocation,
  useBookingStatus,
} from '@clenzey/socket-client';
import type { SocketManager } from '@clenzey/socket-client';
import { useBookingEta } from '../hooks/useBookingEta';
import { formatEtaMinutes } from '../utils/eta-response';
import { getBookingStatusLabel } from '../utils/booking-status';

/**
 * Statuses where the tracking map should be shown.
 */
const TRACKABLE_STATUSES = [
  'PROFESSIONAL_EN_ROUTE',
  'CHECKED_IN',
  'IN_PROGRESS',
];

export interface TrackingSectionProps {
  bookingId: string;
  bookingStatus: string;
  socketManager: SocketManager | null;
  /** Address coordinates for the destination marker */
  addressLatitude?: number;
  addressLongitude?: number;
}

/**
 * TrackingSection encapsulates the real-time tracking map and all socket listeners.
 *
 * Integrates:
 * - partner:location_stream → updates partner marker on map
 * - eta:updated → updates ETA display text
 * - partner:location_stale → shows unavailability indicator
 * - booking:status_changed → updates status display in real-time
 * - GET /bookings/:id/eta as fallback for initial ETA
 *
 * Falls back to text-only tracking when react-native-maps is not available (Expo Go).
 *
 * @validates Requirements 11.2, 11.3, 11.4, 11.5, 31.1, 31.2
 */
export function TrackingSection({
  bookingId,
  bookingStatus,
  socketManager,
  addressLatitude,
  addressLongitude,
}: TrackingSectionProps) {
  const queryClient = useQueryClient();

  // Real-time partner location from socket
  const partnerLocation = usePartnerLocation(socketManager, bookingId);

  // Real-time booking status changes from socket
  const statusUpdate = useBookingStatus(socketManager, bookingId);

  // Determine the effective status (real-time socket update takes priority)
  const effectiveStatus = statusUpdate?.status ?? bookingStatus;

  // REST + socket ETA while partner is en route
  const { etaMinutes: apiEtaMinutes } = useBookingEta(bookingId, effectiveStatus, socketManager, {
    destinationLatitude: addressLatitude,
    destinationLongitude: addressLongitude,
  });

  // Invalidate booking query when status changes via socket
  React.useEffect(() => {
    if (statusUpdate) {
      queryClient.invalidateQueries({ queryKey: ['bookings', bookingId] });
    }
  }, [statusUpdate, bookingId, queryClient]);

  // Should map be visible?
  const showMap = TRACKABLE_STATUSES.includes(effectiveStatus);

  // Determine ETA to display (REST/socket ETA > partner location stream)
  const displayEtaMinutes =
    effectiveStatus === 'PROFESSIONAL_EN_ROUTE'
      ? apiEtaMinutes ?? partnerLocation?.etaMinutes ?? null
      : partnerLocation?.etaMinutes ?? null;

  // If map shouldn't be shown, render nothing
  if (!showMap) {
    return null;
  }

  // Default region centered on partner location or address
  const region = partnerLocation
    ? {
        latitude: partnerLocation.latitude,
        longitude: partnerLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }
    : addressLatitude && addressLongitude
      ? {
          latitude: addressLatitude,
          longitude: addressLongitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }
      : {
          latitude: 12.9716,
          longitude: 77.5946,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        };

  // Fallback handled by web shim — MapView renders placeholder on web

  return (
    <View style={styles.shadowWrap}>
      <View style={styles.container}>
        <View style={styles.mapWrap}>
          <MapView
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            region={region}
            showsUserLocation
          >
            {/* Partner marker */}
            {partnerLocation && (
              <Marker
                coordinate={{
                  latitude: partnerLocation.latitude,
                  longitude: partnerLocation.longitude,
                }}
                title="Partner"
                description={
                  partnerLocation.isStale
                    ? 'Location temporarily unavailable'
                    : `Heading: ${Math.round(partnerLocation.heading)}°`
                }
                opacity={partnerLocation.isStale ? 0.5 : 1.0}
                rotation={partnerLocation.heading}
              />
            )}

            {/* Destination marker */}
            {addressLatitude && addressLongitude && (
              <Marker
                coordinate={{
                  latitude: addressLatitude,
                  longitude: addressLongitude,
                }}
                title="Service Location"
                pinColor="#0043BA"
              />
            )}
          </MapView>
        </View>

        {/* Status and ETA overlay */}
      <View style={styles.infoOverlay}>
        {/* Real-time status badge */}
        <View style={styles.statusRow}>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>
              {getBookingStatusLabel(effectiveStatus)}
            </Text>
          </View>
        </View>

        {/* ETA display */}
        {displayEtaMinutes !== null && (
          <Text style={styles.etaText}>
            Arriving in {formatEtaMinutes(displayEtaMinutes)}
          </Text>
        )}

        {/* Stale location indicator */}
        {partnerLocation?.isStale && (
          <View style={styles.staleIndicator}>
            <Text style={styles.staleText}>
              Partner location temporarily unavailable
            </Text>
          </View>
        )}
      </View>
    </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shadowWrap: {
    marginBottom: 16,
    borderRadius: 16,
    ...materialStyle('card'),
  },
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  mapWrap: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  map: {
    width: '100%',
    height: 220,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  fallbackMap: {
    width: '100%',
    height: 220,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  fallbackIcon: {
    fontSize: 36,
  },
  fallbackText: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    fontWeight: '600',
    color: '#6B7280',
  },
  infoOverlay: {
    padding: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusBadge: {
    backgroundColor: '#F0EDFF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    fontWeight: '600',
    color: '#0043BA',
  },
  etaText: {
    fontSize: 16,
    fontFamily: fonts.bold,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  staleIndicator: {
    backgroundColor: '#FFF3CD',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  staleText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: '#856404',
    fontWeight: '500',
  },
});
