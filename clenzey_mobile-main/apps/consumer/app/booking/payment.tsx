import { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Text, Button, Card } from 'react-native-paper';
import { colors, materialStyle } from '@clenzey/design-system';
import { sharedPaperStyles } from '../../src/styles/paperControls';
import { paymentsApi } from '../../src/lib/api';
import { useAuthStore } from '../../src/store/auth';
import { normalizePaymentOrder } from '../../src/utils/booking-response';
import { getErrorMessage } from '../../src/utils/error-message';
import RazorpayCheckout from '../../src/lib/razorpay-checkout';

/**
 * Payment Screen.
 *
 * Handles the Razorpay payment flow:
 * 1. On "Pay Now": POST /payments/orders → get razorpayOrderId & amount
 * 2. Open RazorpayCheckout with order details
 * 3. On success: POST /payments/confirm → navigate to success state
 * 4. On error: show failure message with retry
 *
 * Falls back to a placeholder when Razorpay is not available (Expo Go).
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

type ScreenState = 'idle' | 'loading' | 'success' | 'error';

export default function PaymentScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{
    bookingId: string;
    amount: string;
  }>();

  const user = useAuthStore((state) => state.user);

  const [screenState, setScreenState] = useState<ScreenState>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handlePayNow = useCallback(async () => {
    setScreenState('loading');
    setErrorMessage('');

    try {
      const orderResponse = await paymentsApi.createOrder(params.bookingId!);
      const { razorpayOrderId, amount } = normalizePaymentOrder(orderResponse);

      const options = {
        description: 'Clenzey Service Booking',
        image: 'https://clenzey.com/logo.png',
        currency: 'INR',
        key: process.env.EXPO_PUBLIC_RAZORPAY_KEY!,
        amount: amount * 100,
        name: 'Clenzey',
        order_id: razorpayOrderId,
        prefill: {
          contact: user?.phone || '',
        },
        theme: { color: colors.primary },
      };

      const paymentData = await RazorpayCheckout.open(options);

      await paymentsApi.confirm({
        razorpayOrderId: paymentData.razorpay_order_id,
        razorpayPaymentId: paymentData.razorpay_payment_id,
        razorpaySignature: paymentData.razorpay_signature,
      });

      setScreenState('success');
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, 'Payment failed. Please try again.'));
      setScreenState('error');
    }
  }, [params.bookingId, user?.phone]);

  const handleViewBooking = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['bookings'] });
    router.replace('/(tabs)/bookings?tab=all');
  }, [queryClient, router]);

  if (screenState === 'success') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.stateContainer}>
          <View style={styles.checkmarkCircle}>
            <Text variant="displaySmall" style={styles.checkmark}>✓</Text>
          </View>
          <Text variant="headlineSmall" style={styles.stateTitle}>Payment Successful!</Text>
          <Text variant="bodyMedium" style={styles.stateSubtitle}>
            Your booking has been confirmed. A professional will be assigned shortly.
          </Text>
          <Card style={styles.summaryCard} mode="outlined">
            <Card.Content>
              <View style={styles.detailRow}>
                <Text variant="bodyMedium" style={styles.detailLabel}>Amount Paid</Text>
                <Text variant="bodyMedium" style={styles.detailValue}>₹{params.amount}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text variant="bodyMedium" style={styles.detailLabel}>Booking ID</Text>
                <Text variant="bodySmall" style={styles.detailValueSmall}>
                  {params.bookingId?.slice(0, 8)}...
                </Text>
              </View>
            </Card.Content>
          </Card>
          <Button mode="contained" compact onPress={handleViewBooking} buttonColor={colors.primary} style={styles.fullButton} contentStyle={styles.fullButtonContent}>
            View Booking
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  if (screenState === 'error') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.stateContainer}>
          <View style={styles.errorCircle}>
            <Text variant="displaySmall" style={styles.errorIcon}>✕</Text>
          </View>
          <Text variant="headlineSmall" style={styles.stateTitle}>Payment Failed</Text>
          <Text variant="bodyMedium" style={styles.stateSubtitle}>{errorMessage}</Text>
          <Button mode="contained" compact onPress={handlePayNow} buttonColor={colors.primary} style={styles.fullButton} contentStyle={styles.fullButtonContent}>
            Retry Payment
          </Button>
          <Button mode="outlined" compact onPress={handleViewBooking} textColor={colors.primary} style={styles.fullButton} contentStyle={styles.fullButtonContent}>
            View Bookings
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  if (screenState === 'loading') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text variant="bodyMedium" style={styles.loadingText}>Processing payment...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.idleContainer}>
        <Text variant="headlineSmall" style={styles.heading}>Complete Payment</Text>

        <Card style={styles.summaryCard} mode="outlined">
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle}>Payment Summary</Text>
            <View style={styles.detailRow}>
              <Text variant="bodyMedium" style={styles.detailLabel}>Service Booking</Text>
              <Text variant="bodyMedium" style={styles.detailValue}>₹{params.amount}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text variant="titleMedium" style={styles.totalLabel}>Total</Text>
              <Text variant="titleMedium" style={styles.totalValue}>₹{params.amount}</Text>
            </View>
          </Card.Content>
        </Card>

        <View style={styles.paymentMethods}>
          <Text variant="labelLarge" style={styles.methodsTitle}>Payment Options</Text>
          <Text variant="bodySmall" style={styles.methodsSubtitle}>
            UPI, Credit/Debit Card, Net Banking & more
          </Text>
        </View>

        <View style={styles.footer}>
          <Button mode="contained" compact onPress={handlePayNow} buttonColor={colors.primary} style={styles.fullButton} contentStyle={styles.fullButtonContent}>
            Pay Now
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  idleContainer: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  heading: {
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  summaryCard: {
    width: '100%',
    backgroundColor: colors.white,
    ...materialStyle('card'),
  },
  cardTitle: {
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  detailLabel: {
    color: colors.textSecondary,
  },
  detailValue: {
    fontWeight: '600',
    color: colors.textPrimary,
  },
  detailValueSmall: {
    color: colors.textSecondary,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  totalLabel: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  totalValue: {
    fontWeight: '700',
    color: colors.primary,
  },
  paymentMethods: {
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    alignItems: 'center',
    gap: 4,
  },
  methodsTitle: {
    fontWeight: '600',
    color: colors.textPrimary,
  },
  methodsSubtitle: {
    color: colors.textSecondary,
  },
  footer: {
    paddingTop: 16,
  },
  fullButton: {
    borderRadius: 10,
    width: '100%',
  },
  fullButtonContent: sharedPaperStyles.buttonContent,
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: colors.textSecondary,
  },
  stateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  checkmarkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkmark: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  errorCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  errorIcon: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  stateTitle: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  stateSubtitle: {
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
