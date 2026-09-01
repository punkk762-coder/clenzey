import { useState } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import type { BookingStatus } from '@clenzey/types';
import { fonts } from '@clenzey/design-system';
import { contactApi } from '../lib/api';

/**
 * Booking statuses during which the "Call Partner" button is visible.
 * Requirement 14.1: Display contact option during PROFESSIONAL_ASSIGNED through IN_PROGRESS.
 */
const CALLABLE_STATUSES: BookingStatus[] = [
  'PROFESSIONAL_ASSIGNED',
  'PROFESSIONAL_EN_ROUTE',
  'CHECKED_IN',
  'IN_PROGRESS',
];

interface CallPartnerButtonProps {
  bookingId: string;
  status: BookingStatus;
}

/**
 * A button that allows the consumer to call the assigned partner.
 *
 * Visible only when the booking status is between PROFESSIONAL_ASSIGNED and IN_PROGRESS.
 * On press, fetches the partner's phone number via GET /bookings/:id/contact/partner
 * and launches the phone dialer.
 *
 * @validates Requirements 14.1, 14.2
 */
export function CallPartnerButton({ bookingId, status }: CallPartnerButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  // Only render when the booking is in a callable status
  if (!CALLABLE_STATUSES.includes(status)) {
    return null;
  }

  const handlePress = async () => {
    setIsLoading(true);
    try {
      const response = await contactApi.getPartnerContact(bookingId);
      const phone = response.data?.phone ?? (response as any).phone;

      if (!phone) {
        Alert.alert(
          'Unavailable',
          'Partner phone number is not available at this time.',
        );
        return;
      }

      const url = `tel:${phone}`;
      const canOpen = await Linking.canOpenURL(url);

      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert(
          'Unable to Call',
          'Phone dialer is not available on this device.',
        );
      }
    } catch (error: any) {
      Alert.alert(
        'Error',
        error?.message || 'Failed to retrieve partner contact information.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={handlePress}
      disabled={isLoading}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel="Call partner"
    >
      {isLoading ? (
        <ActivityIndicator size="small" color="#FFFFFF" />
      ) : (
        <Text style={styles.buttonText}>📞 Call Partner</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#0043BA',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: fonts.semiBold,
    fontWeight: '600',
  },
});
