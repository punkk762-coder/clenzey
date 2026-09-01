import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Pressable,
  TextInput as RNTextInput,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text, Button, TextInput } from 'react-native-paper';
import { HugeiconsIcon } from '@hugeicons/react-native';
import {
  Location01Icon,
  CreditCardAcceptIcon,
  Coupon01Icon,
  Note01Icon,
  Clock01Icon,
  CheckListIcon,
  ArrowRight01Icon,
} from '@hugeicons/core-free-icons';
import type { PaymentMode } from '@clenzey/types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createAddressesEndpoints } from '@clenzey/api-client';
import type { Address } from '@clenzey/types';
import { apiClient, bookingsApi, paymentsApi } from '../../src/lib/api';
import { useServiceById } from '../../src/hooks/useServiceById';
import { useEstimate } from '../../src/hooks/useEstimate';
import { useCouponValidation } from '../../src/hooks/useCouponValidation';
import { useAuthStore } from '../../src/store/auth';
import { useAddressStore } from '../../src/store/address';
import { AppDialog } from '../../src/components/AppDialog';
import { PaymentMethodSection } from '../../src/components/PaymentMethodSection';
import { FloatingBackButton } from '../../src/components/FloatingBackButton';
import { colors, materialStyle, controlSizes } from '@clenzey/design-system';
import { sharedPaperStyles } from '../../src/styles/paperControls';
import { normalizeAddressList } from '../../src/utils/address-response';
import { normalizeBooking, normalizePaymentOrder } from '../../src/utils/booking-response';
import { syncBookingsAfterCreate } from '../../src/utils/bookings-cache';
import { parseRouteStringParam } from '../../src/utils/route-params';
import {
  resolveBookingVariantIds,
  variantRequiresSubVariant,
} from '../../src/utils/service-booking';
import { resolveServiceEstimate } from '../../src/utils/corporate-estimate';
import { useBookingDraftStore } from '../../src/store/booking-draft';
import { getErrorMessage } from '../../src/utils/error-message';
import RazorpayCheckout from '../../src/lib/razorpay-checkout';

const addressesApi = createAddressesEndpoints(apiClient);

function formatAddressLine(address: Address): string {
  const parts = [
    address.line1,
    address.line2,
    [address.city, address.state, address.pincode].filter(Boolean).join(', '),
  ].filter(Boolean);

  return parts.join(', ');
}

export default function CheckoutScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    serviceId: string;
    variantId: string;
    subVariantId?: string;
    addonIds?: string;
    bookingType?: string;
    scheduledAt?: string;
    couponCode?: string;
  }>();
  const bookingDraft = useBookingDraftStore((state) => state.draft);
  const clearBookingDraft = useBookingDraftStore((state) => state.clearDraft);

  const serviceId = params.serviceId ?? bookingDraft?.serviceId ?? '';
  const variantId = params.variantId ?? bookingDraft?.variantId ?? '';
  const subVariantId =
    parseRouteStringParam(params.subVariantId) ?? bookingDraft?.subVariantId ?? undefined;
  const addonIds = params.addonIds
    ? params.addonIds.split(',').filter(Boolean)
    : bookingDraft?.addonIds ?? [];
  const bookingType =
    (params.bookingType ?? bookingDraft?.bookingType) === 'SCHEDULED' ? 'SCHEDULED' : 'INSTANT';
  const scheduledAt = params.scheduledAt ?? bookingDraft?.scheduledAt ?? undefined;

  const bookingVariantIds = useMemo(
    () => resolveBookingVariantIds(variantId, subVariantId),
    [variantId, subVariantId],
  );

  const { data: service } = useServiceById(serviceId);
  const { data: apiEstimate, isLoading: isEstimateLoading } = useEstimate({
    serviceId,
    variantId: bookingVariantIds.variantId,
    subVariantId: bookingVariantIds.subVariantId,
    addonIds: addonIds.length > 0 ? addonIds : undefined,
  });

  const storeSelectedAddressId = useAddressStore((state) => state.selectedAddressId);

  const { data: addresses, isLoading: isAddressesLoading } = useQuery<Address[]>({
    queryKey: ['addresses'],
    queryFn: async () => {
      const result = await addressesApi.list();
      return normalizeAddressList(result);
    },
  });

  const [paymentMode, setPaymentMode] = useState<PaymentMode>('RAZORPAY');
  const [couponCode, setCouponCode] = useState(params.couponCode ?? '');
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const hasAutoAppliedCoupon = useRef(false);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorDialog, setErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const {
    validate: validateCoupon,
    isValidating: isCouponValidating,
    discount: couponDiscount,
    error: couponError,
    reset: resetCoupon,
  } = useCouponValidation();

  const user = useAuthStore((state) => state.user);

  const activeAddressId = useMemo(() => {
    if (storeSelectedAddressId) return storeSelectedAddressId;
    if (addresses?.length) {
      const defaultAddr = addresses.find((a) => a.isDefault);
      return defaultAddr?.id ?? addresses[0].id;
    }
    return null;
  }, [storeSelectedAddressId, addresses]);

  const selectedAddress = useMemo(
    () => addresses?.find((address) => address.id === activeAddressId) ?? null,
    [addresses, activeAddressId],
  );

  const selectedVariant = useMemo(() => {
    if (!service) return null;
    return service.variants.find((v) => v.id === variantId) ?? null;
  }, [service, variantId]);

  const selectedSubVariant = useMemo(() => {
    if (!selectedVariant?.subVariants?.length || !subVariantId) return null;
    return selectedVariant.subVariants.find((subVariant) => subVariant.id === subVariantId) ?? null;
  }, [selectedVariant, subVariantId]);

  const estimate = useMemo(
    () =>
      resolveServiceEstimate({
        service,
        variant: selectedVariant,
        subVariant: selectedSubVariant,
        apiEstimate,
      }),
    [service, selectedVariant, selectedSubVariant, apiEstimate],
  );

  const selectedAddons = useMemo(() => {
    if (!service || !addonIds.length) return [];
    return service.addons.filter((a: any) => addonIds.includes(a.id));
  }, [service, addonIds]);

  const handleApplyCoupon = useCallback(() => {
    const code = couponCode.trim();
    if (!code || !estimate) return;

    validateCoupon({
      code,
      amount: estimate.total,
      serviceId,
      serviceCategory: service?.category,
    });
  }, [couponCode, estimate, serviceId, service?.category, validateCoupon]);

  useEffect(() => {
    if (couponDiscount !== null && couponCode.trim()) {
      setAppliedCoupon(couponCode.trim());
    }
  }, [couponDiscount, couponCode]);

  useEffect(() => {
    const code = params.couponCode?.trim();
    if (!code || !estimate || hasAutoAppliedCoupon.current) return;

    hasAutoAppliedCoupon.current = true;
    validateCoupon({
      code,
      amount: estimate.total,
      serviceId,
      serviceCategory: service?.category,
    });
  }, [params.couponCode, estimate, serviceId, service?.category, validateCoupon]);

  const goToBookings = useCallback(
    async (booking?: unknown) => {
      if (booking) {
        await syncBookingsAfterCreate(queryClient, booking);
      } else {
        await queryClient.invalidateQueries({ queryKey: ['bookings'] });
      }
      router.replace('/(tabs)/bookings?tab=all');
    },
    [queryClient, router],
  );

  const handlePay = useCallback(async () => {
    if (!activeAddressId) {
      setErrorMessage('Please select a delivery address');
      setErrorDialog(true);
      return;
    }
    if (variantRequiresSubVariant(service, selectedVariant) && !subVariantId) {
      setErrorMessage('Please select a capacity option for this corporate service.');
      setErrorDialog(true);
      return;
    }
    if (bookingType === 'SCHEDULED' && !scheduledAt) {
      setErrorMessage('Please select a date and time for your scheduled booking.');
      setErrorDialog(true);
      return;
    }
    setLoading(true);
    try {
      const bookingIds = bookingVariantIds;
      const bookingResponse = await bookingsApi.create({
        serviceId,
        variantId: bookingIds.variantId!,
        ...(bookingIds.subVariantId ? { subVariantId: bookingIds.subVariantId } : {}),
        addressId: activeAddressId,
        bookingType,
        scheduledAt: bookingType === 'SCHEDULED' ? scheduledAt : undefined,
        paymentMode,
        addonIds: addonIds.length > 0 ? addonIds : undefined,
        couponCode: appliedCoupon ?? undefined,
        consumerNotes: notes.trim() || undefined,
      });
      const booking = normalizeBooking(bookingResponse);
      clearBookingDraft();

      if (paymentMode === 'CASH') {
        await goToBookings(booking);
        return;
      }

      const orderResponse = await paymentsApi.createOrder(booking.id);
      const { razorpayOrderId, amount } = normalizePaymentOrder(orderResponse);
      const amountInPaise = Math.round(amount * 100);

      const options = {
        description: `Clenzey - ${service?.name ?? 'Service Booking'}`,
        image: 'https://clenzey.com/logo.png',
        currency: 'INR',
        key: process.env.EXPO_PUBLIC_RAZORPAY_KEY!,
        amount: amountInPaise,
        name: 'Clenzey',
        order_id: razorpayOrderId,
        prefill: {
          contact: user?.phone || '',
        },
        theme: { color: '#0043BA' },
      };

      const paymentData = await RazorpayCheckout.open(options);

      await paymentsApi.confirm({
        razorpayOrderId: paymentData.razorpay_order_id,
        razorpayPaymentId: paymentData.razorpay_payment_id,
        razorpaySignature: paymentData.razorpay_signature,
      });

      await goToBookings({ ...booking, status: 'CONFIRMED' });
    } catch (err: unknown) {
      setErrorMessage(getErrorMessage(err));
      setErrorDialog(true);
    } finally {
      setLoading(false);
    }
  }, [activeAddressId, serviceId, variantId, subVariantId, bookingVariantIds, selectedVariant, service, bookingType, scheduledAt, paymentMode, appliedCoupon, notes, addonIds, goToBookings, clearBookingDraft, user]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 56 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pageTitle}>
          <Text variant="headlineSmall" style={styles.heading}>Checkout</Text>
          <Text variant="bodyMedium" style={styles.pageSubtitle}>
            Review and confirm your booking
          </Text>
        </View>

        {/* Service Summary */}
        <View style={styles.serviceSummaryCard}>
          <View style={styles.serviceSummaryHeader}>
            <View style={styles.serviceSummaryIconWrap}>
              <HugeiconsIcon icon={CheckListIcon} size={16} color={colors.primary} strokeWidth={2} />
            </View>
            <View style={styles.serviceSummaryTitleCol}>
              <Text style={styles.serviceSummaryName}>{service?.name ?? 'Loading...'}</Text>
              <Text style={styles.serviceSummaryCategory}>
                {service?.category?.replace(/_/g, ' ') ?? ''}
              </Text>
            </View>
            {estimate ? (
              <Text style={styles.serviceSummaryPrice}>₹{estimate.total}</Text>
            ) : null}
          </View>

          <View style={styles.serviceSummaryBody}>
            {selectedVariant && (
              <View style={styles.serviceMetaRow}>
                <Text style={styles.serviceMetaLabel}>Variant</Text>
                <Text style={styles.serviceMetaValue} numberOfLines={1}>
                  {selectedVariant.label} — ₹{selectedVariant.basePrice}
                </Text>
              </View>
            )}

            {selectedSubVariant ? (
              <View style={styles.serviceMetaRow}>
                <Text style={styles.serviceMetaLabel}>Capacity</Text>
                <Text style={styles.serviceMetaValue} numberOfLines={1}>
                  {selectedSubVariant.label} — ₹{selectedSubVariant.basePrice}
                </Text>
              </View>
            ) : null}

            {selectedAddons.length > 0 && (
              <View style={styles.serviceMetaRow}>
                <Text style={styles.serviceMetaLabel}>
                  Add-ons ({selectedAddons.length})
                </Text>
                <Text style={styles.serviceMetaValue} numberOfLines={1}>
                  {selectedAddons.map((a: any) => a.name).join(', ')}
                </Text>
              </View>
            )}

            {estimate && (
              <View style={styles.serviceMetaRow}>
                <Text style={styles.serviceMetaLabel}>Est. Duration</Text>
                <View style={styles.serviceTimeBadge}>
                  <HugeiconsIcon icon={Clock01Icon} size={12} color={colors.primary} strokeWidth={1.5} />
                  <Text style={styles.serviceTimeText}>~45 min</Text>
                </View>
              </View>
            )}

            <View style={styles.serviceMetaRow}>
              <Text style={styles.serviceMetaLabel}>Service Timing</Text>
              <Text style={styles.serviceMetaValue} numberOfLines={2}>
                {bookingType === 'SCHEDULED' && scheduledAt
                  ? new Date(scheduledAt).toLocaleString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })
                  : 'Instant — partner in ~15–20 mins'}
              </Text>
            </View>
          </View>
        </View>

        {/* Delivery Address */}
        <TouchableOpacity
          style={styles.addressCard}
          onPress={() => router.push('/address/select')}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Change delivery address"
        >
          <View style={styles.addressCardHeader}>
            <View style={styles.addressIconWrap}>
              <HugeiconsIcon icon={Location01Icon} size={16} color={colors.primary} strokeWidth={1.5} />
            </View>
            <View style={styles.addressCardTitleCol}>
              <Text style={styles.addressCardTitle}>Delivery Address</Text>
              <Text style={styles.addressCardSub}>Where should we come?</Text>
            </View>
            <View style={styles.changeAddressBtn}>
              <Text style={styles.changeAddressText}>Change</Text>
              <HugeiconsIcon icon={ArrowRight01Icon} size={14} color={colors.primary} strokeWidth={2} />
            </View>
          </View>

          {isAddressesLoading ? (
            <ActivityIndicator size="small" color={colors.primary} style={styles.addressLoading} />
          ) : selectedAddress ? (
            <View style={styles.selectedAddressBox}>
              <View style={styles.selectedAddressLabelRow}>
                <Text style={styles.selectedAddressLabel}>
                  {selectedAddress.label || 'Address'}
                </Text>
                {selectedAddress.isDefault ? (
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultBadgeText}>Default</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.selectedAddressLine} numberOfLines={2}>
                {formatAddressLine(selectedAddress)}
              </Text>
            </View>
          ) : (
            <View style={styles.emptyAddressBox}>
              <Text style={styles.emptyAddressText}>Tap to select a delivery address</Text>
            </View>
          )}
        </TouchableOpacity>

        <PaymentMethodSection
          paymentMode={paymentMode}
          onSelectOnline={() => setPaymentMode('RAZORPAY')}
          onSelectCash={() => setPaymentMode('CASH')}
        />

        {/* Coupon Code */}
        <View style={styles.couponSection}>
          <View style={styles.couponRow}>
            <View style={styles.compactFieldWrapper}>
              <View style={styles.compactFieldIcon}>
                <HugeiconsIcon icon={Coupon01Icon} size={14} color={colors.primary} strokeWidth={1.5} />
              </View>
              <RNTextInput
                placeholder="Enter coupon code"
                value={couponCode}
                onChangeText={(text) => {
                  setCouponCode(text);
                  if (appliedCoupon || couponDiscount !== null || couponError) {
                    setAppliedCoupon(null);
                    resetCoupon();
                  }
                }}
                style={styles.compactNativeInput}
                placeholderTextColor="#9CA3AF"
                cursorColor={colors.primary}
                selectionColor={`${colors.primary}33`}
                autoCapitalize="characters"
                autoCorrect={false}
                accessibilityLabel="Enter coupon code"
              />
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.couponApplyBtn,
                pressed && styles.pressed,
                (isCouponValidating || !couponCode.trim()) && styles.couponApplyBtnDisabled,
              ]}
              onPress={handleApplyCoupon}
              disabled={isCouponValidating || !couponCode.trim()}
            >
              <Text style={styles.couponApplyText}>
                {isCouponValidating ? 'Applying...' : 'Apply'}
              </Text>
            </Pressable>
          </View>
          {appliedCoupon && couponDiscount !== null ? (
            <Text style={styles.couponSuccess}>
              Coupon {appliedCoupon} applied — you save ₹{couponDiscount}
            </Text>
          ) : null}
          {couponError ? (
            <Text style={styles.couponError}>{couponError}</Text>
          ) : null}
        </View>

        {/* Notes */}
        <View style={styles.notesSection}>
          <View style={styles.notesHeader}>
            <View style={styles.compactFieldIcon}>
              <HugeiconsIcon icon={Note01Icon} size={14} color={colors.primary} strokeWidth={1.5} />
            </View>
            <Text style={styles.notesLabel}>Special Instructions</Text>
          </View>
          <TextInput
            placeholder="Any special requests or instructions for our team..."
            value={notes}
            onChangeText={setNotes}
            mode="outlined"
            multiline
            numberOfLines={4}
            style={styles.notesInput}
            contentStyle={styles.notesInputContent}
            outlineColor="#E5E7EB"
            activeOutlineColor={colors.primary}
            placeholderTextColor="#9CA3AF"
            outlineStyle={{ borderRadius: 10 }}
            textAlignVertical="top"
          />
        </View>

        {/* Order Summary */}
        <View style={styles.orderSummaryCard}>
          <View style={styles.orderSummaryHeader}>
            <View style={styles.orderSummaryIconWrap}>
              <HugeiconsIcon icon={CreditCardAcceptIcon} size={16} color={colors.white} strokeWidth={2} />
            </View>
            <Text style={styles.orderSummaryTitle}>Order Summary</Text>
          </View>

          {isEstimateLoading ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ padding: 12 }} />
          ) : estimate ? (
            <View style={styles.orderSummaryBody}>
              {estimate.breakdown.map((item, idx) => (
                <View key={idx} style={styles.orderSummaryRow}>
                  <Text style={styles.orderSummaryLabel}>{item.label}</Text>
                  <Text style={styles.orderSummaryAmount}>₹{item.amount}</Text>
                </View>
              ))}
              <View style={styles.orderSummaryDivider} />
              <View style={styles.orderSummaryTotalRow}>
                <Text style={styles.orderSummaryTotalLabel}>Total</Text>
                <Text style={styles.orderSummaryTotalAmount}>₹{estimate.total}</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.emptyText}>Unable to calculate price</Text>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          mode="contained"
          compact
          onPress={handlePay}
          loading={loading}
          disabled={loading || !activeAddressId}
          buttonColor={colors.primary}
          textColor="#FFFFFF"
          style={styles.payBtn}
          contentStyle={styles.payBtnContent}
          labelStyle={styles.payBtnLabel}
        >
          {estimate
            ? paymentMode === 'CASH'
              ? `Confirm Booking — ₹${estimate.total}`
              : `Pay ₹${estimate.total}`
            : paymentMode === 'CASH'
              ? 'Confirm Booking'
              : 'Pay'}
        </Button>
      </View>

      <FloatingBackButton top={insets.top + 8} fallbackRoute="/(tabs)" />

      <AppDialog
        visible={errorDialog}
        onDismiss={() => {
          setErrorDialog(false);
          void goToBookings();
        }}
        title="Something went wrong"
        message={errorMessage}
        type="error"
        actionLabel="View Bookings"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 100 },
  pageTitle: { marginBottom: 16 },
  heading: { fontWeight: '700', color: colors.textPrimary },
  pageSubtitle: { color: colors.textSecondary, marginTop: 4 },

  serviceSummaryCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...materialStyle('card'),
  },
  serviceSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  serviceSummaryIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceSummaryTitleCol: { flex: 1, minWidth: 0 },
  serviceSummaryName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  serviceSummaryCategory: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  serviceSummaryPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
  },
  serviceSummaryBody: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 6,
  },
  serviceMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  serviceMetaLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    flexShrink: 0,
  },
  serviceMetaValue: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'right',
  },
  serviceTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  serviceTimeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },

  addressCard: {
    marginBottom: 16,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...materialStyle('card'),
  },
  addressCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  addressIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addressCardTitleCol: { flex: 1, minWidth: 0 },
  addressCardTitle: {
    fontWeight: '700',
    color: colors.textPrimary,
    fontSize: 14,
  },
  addressCardSub: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 1,
  },
  changeAddressBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
  },
  changeAddressText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  addressLoading: { paddingVertical: 8 },
  selectedAddressBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectedAddressLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  selectedAddressLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  defaultBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#DCFCE7',
  },
  defaultBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#166534',
  },
  selectedAddressLine: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
  emptyAddressBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  emptyAddressText: {
    color: colors.textSecondary,
    fontSize: 12,
  },

  couponSection: {
    marginBottom: 16,
  },
  couponRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  compactFieldWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 10,
    height: controlSizes.input.height,
  },
  compactFieldIcon: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: '#F0F5FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  compactNativeInput: {
    flex: 1,
    fontSize: controlSizes.input.fontSize,
    color: colors.textPrimary,
    paddingVertical: 0,
    paddingHorizontal: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  couponApplyBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    height: controlSizes.button.height,
    justifyContent: 'center',
    borderRadius: 10,
  },
  couponApplyText: {
    fontSize: controlSizes.button.fontSize,
    fontWeight: '700',
    color: colors.white,
  },
  couponApplyBtnDisabled: {
    opacity: 0.55,
  },
  couponSuccess: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
    color: colors.success,
  },
  couponError: {
    marginTop: 4,
    fontSize: 13,
    color: colors.error,
  },

  notesSection: { marginBottom: 20 },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  notesLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  notesInput: {
    backgroundColor: colors.white,
    fontSize: 13,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  notesInputContent: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
    minHeight: 108,
  },

  orderSummaryCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#EEF2FF',
    ...materialStyle('card'),
  },
  orderSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  orderSummaryIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderSummaryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  orderSummaryBody: {},
  orderSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  orderSummaryLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  orderSummaryAmount: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  orderSummaryDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
  orderSummaryTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderSummaryTotalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  orderSummaryTotalAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
  },
  emptyText: { color: colors.textSecondary, fontSize: 12 },

  footer: {
    padding: 16,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  payBtn: { borderRadius: 10 },
  pressed: { opacity: 0.92 },
  payBtnContent: sharedPaperStyles.buttonContent,
  payBtnLabel: { ...sharedPaperStyles.buttonLabel, fontWeight: '700', paddingVertical: 2 },
});
