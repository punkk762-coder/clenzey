import { useState } from 'react';
import { Alert, Linking, StyleSheet } from 'react-native';
import { Button, theme } from '@clenzey/design-system';
import { BookingStatus } from '@clenzey/types';
import { contactApi } from '../lib/api';

/**
 * Statuses during which the partner can call the consumer.
 * Requirement 25.1: EN_ROUTE, CHECKED_IN, IN_PROGRESS
 */
const CALLABLE_STATUSES: BookingStatus[] = [
  'PROFESSIONAL_EN_ROUTE',
  'CHECKED_IN',
  'IN_PROGRESS',
];

interface CallConsumerButtonProps {
  bookingId: string;
  bookingStatus: BookingStatus;
}

/**
 * CallConsumerButton
 *
 * Displayed during PROFESSIONAL_EN_ROUTE, CHECKED_IN, or IN_PROGRESS statuses.
 * On press: fetches consumer's phone number via GET /bookings/:id/contact/consumer,
 * then launches the device phone dialer.
 *
 * Requirements: 25.1, 25.2
 */
export function CallConsumerButton({ bookingId, bookingStatus }: CallConsumerButtonProps) {
  const [loading, setLoading] = useState(false);

  // Only visible for callable statuses
  if (!CALLABLE_STATUSES.includes(bookingStatus)) {
    return null;
  }

  const handleCallConsumer = async () => {
    setLoading(true);
    try {
      const response = await contactApi.getConsumerContact(bookingId);
      const phone = (response as any)?.data?.phone ?? (response as any)?.phone;

      if (!phone) {
        Alert.alert('Error', 'Unable to retrieve consumer phone number.');
        return;
      }

      const url = `tel:${phone}`;
      const canOpen = await Linking.canOpenURL(url);

      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Unable to open phone dialer.');
      }
    } catch (error: any) {
      Alert.alert(
        'Error',
        error?.message || 'Failed to get consumer contact. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="secondary"
      title="📞 Call Consumer"
      onPress={handleCallConsumer}
      loading={loading}
      disabled={loading}
      style={styles.button}
      accessibilityLabel="Call consumer"
      accessibilityHint="Fetches consumer phone number and opens phone dialer"
    />
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    marginTop: theme.spacing.sm,
  },
});
