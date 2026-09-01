import { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Booking } from '@clenzey/types';
import { BookingPreview, CreateBookingPayload } from '@clenzey/api-client';
import { Text, Button, Card, Divider, TextInput } from 'react-native-paper';
import { colors, materialStyle } from '@clenzey/design-system';
import { sharedPaperStyles } from '../../src/styles/paperControls';
import { bookingsApi } from '../../src/lib/api';
import { useCouponValidation } from '../../src/hooks/useCouponValidation';
import { normalizeBooking } from '../../src/utils/booking-response';
import { syncBookingsAfterCreate } from '../../src/utils/bookings-cache';
import { resolveBookingVariantIds } from '../../src/utils/service-booking';

/**
 * Booking Preview Screen.
 *
 * Displays the order summary with price breakdown fetched from POST /bookings/preview.
 * On "Confirm Booking", calls POST /bookings:
 * - RAZORPAY: navigates to booking/payment.tsx with bookingId and amount
 * - CASH: shows success (booking CONFIRMED immediately)
 *
 * Requirements: 7.3, 7.5, 8.6
 */
export default function BookingPreviewScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{
    serviceId: string;
    variantId: string;
    subVariantId?: string;
    addressId: string;
    bookingType: string;
    scheduledAt?: string;
    timeSlotId?: string;
    paymentMode: string;
    couponCode?: string;
    consumerNotes?: string;
    bookingName?: string;
    addonIds?: string;
    subscriptionPlan?: string;
    // Display info passed from create screen
    serviceName?: string;
    addressLine1?: string;
  }>();

  const [preview, setPreview] = useState<BookingPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Coupon state for the preview screen
  const [couponCode, setCouponCode] = useState(params.couponCode || '');
  const [appliedCoupon, setAppliedCoupon] = useState(params.couponCode || '');

  // Coupon validation hook (Requirements: 9.1, 9.2, 9.3)
  const {
    validate: validateCoupon,
    isValidating: isCouponValidating,
    discount: couponDiscount,
    error: couponError,
    reset: resetCoupon,
  } = useCouponValidation();

  /**
   * Build the CreateBookingPayload from route params.
   */
  const buildPayload = (overrideCoupon?: string): CreateBookingPayload => {
    const bookingIds = resolveBookingVariantIds(params.variantId, params.subVariantId || undefined);

    return {
      serviceId: params.serviceId!,
      variantId: bookingIds.variantId!,
      ...(bookingIds.subVariantId ? { subVariantId: bookingIds.subVariantId } : {}),
      addressId: params.addressId!,
      bookingType: params.bookingType as 'INSTANT' | 'SCHEDULED',
      scheduledAt: params.scheduledAt || undefined,
      timeSlotId: params.timeSlotId || undefined,
      paymentMode: params.paymentMode as 'RAZORPAY' | 'CASH',
      couponCode: overrideCoupon !== undefined ? overrideCoupon || undefined : appliedCoupon || undefined,
      consumerNotes: params.consumerNotes || undefined,
      bookingName: params.bookingName || undefined,
      addonIds: params.addonIds ? params.addonIds.split(',').filter(Boolean) : undefined,
      subscriptionPlan: params.subscriptionPlan
        ? (params.subscriptionPlan as 'ONE_TIME' | 'WEEKLY' | 'MONTHLY')
        : undefined,
    };
  };

  /**
   * Handle coupon apply on the preview screen.
   * Validates the coupon code via POST /coupons/validate, then re-fetches preview.
   * Requirements: 9.1, 9.2, 9.3
   */
  const handleApplyCoupon = () => {
    const code = couponCode.trim();
    if (!code) return;

    validateCoupon({
      code,
      amount: preview?.totalAmount ?? 0,
      serviceId: params.serviceId || undefined,
      serviceCategory: undefined,
    });
  };

  /**
   * When coupon is successfully validated, re-fetch the preview with the new coupon.
   */
  useEffect(() => {
    if (couponDiscount !== null && couponCode.trim()) {
      setAppliedCoupon(couponCode.trim());
      // Re-fetch preview with the new coupon applied
      const refetchPreview = async () => {
        try {
          setPreviewLoading(true);
          const payload = buildPayload(couponCode.trim());
          const response = await bookingsApi.preview(payload);
          setPreview(response as unknown as BookingPreview);
        } catch (error: unknown) {
          // Preview re-fetch failed, but coupon validation already succeeded
          // Keep the existing preview data
        } finally {
          setPreviewLoading(false);
        }
      };
      refetchPreview();
    }
  }, [couponDiscount]);

  /**
   * Fetch the booking preview on mount.
   * Calls POST /bookings/preview with the full booking payload.
   */
  useEffect(() => {
    let cancelled = false;

    const fetchPreview = async () => {
      try {
        setPreviewLoading(true);
        setPreviewError(null);
        const payload = buildPayload(appliedCoupon || undefined);
        const response = await bookingsApi.preview(payload);
        if (!cancelled) {
          setPreview(response as unknown as BookingPreview);
        }
      } catch (error: unknown) {
        if (!cancelled) {
          const msg =
            error instanceof Error ? error.message : 'Failed to load preview';
          setPreviewError(msg);
        }
      } finally {
        if (!cancelled) {
          setPreviewLoading(false);
        }
      }
    };

    fetchPreview();
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Confirm Booking mutation.
   * On success routes based on paymentMode:
   * - RAZORPAY → booking/payment.tsx
   * - CASH → success state (CONFIRMED immediately)
   */
  const confirmMutation = useMutation({
    mutationFn: async (data: CreateBookingPayload) =>
      normalizeBooking(await bookingsApi.create(data)),
    onSuccess: async (booking: Booking) => {
      if (params.paymentMode === 'RAZORPAY') {
        router.replace({
          pathname: '/booking/payment',
          params: {
            bookingId: booking.id,
            amount: String(booking.totalAmount),
          },
        });
      } else {
        await syncBookingsAfterCreate(queryClient, booking);
        Alert.alert(
          'Booking Confirmed!',
          'Your booking has been placed successfully. A professional will be assigned shortly.',
          [
            {
              text: 'View Bookings',
              onPress: () => router.replace('/(tabs)/bookings?tab=all'),
            },
          ]
        );
      }
    },
    onError: (error: { message?: string }) => {
      Alert.alert(
        'Booking Failed',
        error.message || 'Something went wrong. Please try again.',
        [{ text: 'OK' }]
      );
    },
  });

  const handleConfirm = () => {
    const payload = buildPayload(appliedCoupon || undefined);
    confirmMutation.mutate(payload);
  };

  // Loading state
  if (previewLoading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text variant="bodyMedium" style={styles.loadingText}>Loading preview...</Text>
      </SafeAreaView>
    );
  }

  if (previewError) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text variant="bodyMedium" style={styles.errorText}>{previewError}</Text>
        <Button
          mode="contained" compact
          onPress={() => {
            setPreviewError(null);
            setPreviewLoading(true);
            const payload = buildPayload(appliedCoupon || undefined);
            bookingsApi
              .preview(payload)
              .then((response) => setPreview(response as unknown as BookingPreview))
              .catch((err: unknown) => {
                const msg = err instanceof Error ? err.message : 'Failed to load preview';
                setPreviewError(msg);
              })
              .finally(() => setPreviewLoading(false));
          }}
          buttonColor={colors.primary}
          style={styles.confirmButton}
          contentStyle={styles.confirmButtonContent}
        >
          Retry
        </Button>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        <Text variant="headlineSmall" style={styles.heading}>Order Summary</Text>

        {/* Price Breakdown Card */}
        <Card style={styles.card} mode="outlined">
          <Card.Content>
          <Text variant="titleMedium" style={styles.cardTitle}>Price Breakdown</Text>

          {preview?.breakdown &&
            Object.entries(preview.breakdown).map(([item, price]) => (
              <View key={item} style={styles.breakdownRow}>
                <Text variant="bodyMedium" style={styles.breakdownLabel}>{item}</Text>
                <Text variant="bodyMedium" style={styles.breakdownValue}>₹{price}</Text>
              </View>
            ))}

          {preview?.discount !== undefined && preview.discount > 0 && (
            <View style={styles.breakdownRow}>
              <Text variant="bodyMedium" style={styles.discountLabel}>
                Discount{preview.couponCode ? ` (${preview.couponCode})` : ''}
              </Text>
              <Text variant="bodyMedium" style={styles.discountValue}>-₹{preview.discount}</Text>
            </View>
          )}

          <Divider style={styles.divider} />

          <View style={styles.totalRow}>
            <Text variant="titleMedium" style={styles.totalLabel}>Total</Text>
            <Text variant="titleMedium" style={styles.totalValue}>₹{preview?.totalAmount ?? 0}</Text>
          </View>
          </Card.Content>
        </Card>

        {/* Coupon Input Section (Requirements: 9.1, 9.2, 9.3) */}
        <Card style={styles.card} mode="outlined">
          <Card.Content>
          <Text variant="titleMedium" style={styles.cardTitle}>Coupon Code</Text>
          <View style={styles.couponRow}>
            <View style={styles.couponInputWrapper}>
              <TextInput
                placeholder="Enter coupon code"
                value={couponCode}
                onChangeText={(text) => {
                  setCouponCode(text);
                  if (couponDiscount !== null || couponError !== null) {
                    resetCoupon();
                  }
                }}
                maxLength={40}
                mode="outlined"
                dense
                outlineColor={colors.tertiary}
                activeOutlineColor={colors.primary}
                style={styles.couponInput}
                contentStyle={styles.couponInputContent}
              />
            </View>
            <Button
              mode="outlined"
              compact
              loading={isCouponValidating}
              disabled={isCouponValidating}
              onPress={handleApplyCoupon}
              textColor={colors.primary}
              style={styles.applyCouponBtn}
              contentStyle={styles.applyCouponBtnContent}
            >
              Apply
            </Button>
          </View>
          {couponDiscount !== null && (
            <Text variant="bodyMedium" style={styles.couponSuccess}>
              Discount applied: -₹{couponDiscount}
            </Text>
          )}
          {couponError !== null && (
            <Text variant="bodySmall" style={styles.couponError}>
              {couponError}
            </Text>
          )}
          </Card.Content>
        </Card>

        {/* Booking Details Card */}
        <Card style={styles.card} mode="outlined">
          <Card.Content>
          <Text variant="titleMedium" style={styles.cardTitle}>Booking Details</Text>

          {params.serviceName && (
            <View style={styles.detailRow}>
              <Text variant="bodyMedium" style={styles.detailLabel}>Service</Text>
              <Text variant="bodyMedium" style={styles.detailValue}>{params.serviceName}</Text>
            </View>
          )}

          {params.addressLine1 && (
            <View style={styles.detailRow}>
              <Text variant="bodyMedium" style={styles.detailLabel}>Address</Text>
              <Text variant="bodyMedium" style={styles.detailValue}>{params.addressLine1}</Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <Text variant="bodyMedium" style={styles.detailLabel}>Booking Type</Text>
            <Text variant="bodyMedium" style={styles.detailValue}>
              {params.bookingType === 'SCHEDULED' ? 'Scheduled' : 'Instant'}
            </Text>
          </View>

          {params.scheduledAt && (
            <View style={styles.detailRow}>
              <Text variant="bodyMedium" style={styles.detailLabel}>Scheduled Date</Text>
              <Text variant="bodyMedium" style={styles.detailValue}>
                {new Date(params.scheduledAt).toLocaleString()}
              </Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <Text variant="bodyMedium" style={styles.detailLabel}>Payment Mode</Text>
            <Text variant="bodyMedium" style={styles.detailValue}>
              {params.paymentMode === 'RAZORPAY' ? 'Online (Razorpay)' : 'Cash'}
            </Text>
          </View>

          {params.couponCode && (
            <View style={styles.detailRow}>
              <Text variant="bodyMedium" style={styles.detailLabel}>Coupon</Text>
              <Text variant="bodyMedium" style={styles.detailValue}>{params.couponCode}</Text>
            </View>
          )}
          </Card.Content>
        </Card>
      </ScrollView>

      {/* Confirm Button */}
      <View style={styles.footer}>
        <Button
          mode="contained" compact
          loading={confirmMutation.isPending}
          disabled={confirmMutation.isPending}
          onPress={handleConfirm}
          buttonColor={colors.primary}
          style={styles.confirmButton}
          contentStyle={styles.confirmButtonContent}
        >
          Confirm Booking
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    gap: 16,
  },
  heading: {
    color: colors.textPrimary,
    marginBottom: 8,
    fontWeight: '700',
  },
  card: {
    marginBottom: 4,
    backgroundColor: colors.white,
    ...materialStyle('card'),
  },
  divider: {
    marginVertical: 8,
  },
  cardTitle: {
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  couponRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  couponInputWrapper: {
    flex: 1,
  },
  breakdownLabel: {
    color: colors.textSecondary,
  },
  breakdownValue: {
    fontWeight: '500',
    color: colors.textPrimary,
  },
  discountLabel: {
    color: colors.success,
  },
  discountValue: {
    fontWeight: '500',
    color: colors.success,
  },
  totalLabel: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  totalValue: {
    fontWeight: '700',
    color: colors.primary,
  },
  detailLabel: {
    color: colors.textSecondary,
  },
  detailValue: {
    fontWeight: '500',
    color: colors.textPrimary,
    maxWidth: '60%',
    textAlign: 'right',
  },
  loadingText: {
    color: colors.textSecondary,
    marginTop: 8,
  },
  errorText: {
    color: colors.error,
    textAlign: 'center',
  },
  couponInput: {
    backgroundColor: '#FFFFFF',
    ...sharedPaperStyles.input,
  },
  couponInputContent: sharedPaperStyles.inputContent,
  applyCouponBtn: {
    borderRadius: 10,
  },
  applyCouponBtnContent: sharedPaperStyles.buttonContent,
  couponSuccess: {
    fontWeight: '600',
    color: colors.success,
    marginTop: 8,
  },
  couponError: {
    color: colors.error,
    marginTop: 8,
  },
  confirmButton: {
    borderRadius: 10,
  },
  confirmButtonContent: sharedPaperStyles.buttonContent,
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
});
