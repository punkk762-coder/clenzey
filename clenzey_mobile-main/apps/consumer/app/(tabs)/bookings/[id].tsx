import { useEffect, useLayoutEffect, useState, useCallback, type ReactNode } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBookingStatus } from '@clenzey/socket-client';
import type { BookingStatus } from '@clenzey/types';
import { Text, Button, Divider } from 'react-native-paper';
import { HugeiconsIcon } from '@hugeicons/react-native';
import {
  Calendar01Icon,
  Location01Icon,
  CreditCardAcceptIcon,
  UserIcon,
  Clock01Icon,
  CheckmarkCircle01Icon,
  Alert02Icon,
  SparklesIcon,
} from '@hugeicons/core-free-icons';
import { colors, DecoratedCard, fonts, TextInput } from '@clenzey/design-system';
import { sharedPaperStyles } from '../../../src/styles/paperControls';
import { StackBackButton } from '../../../src/components/StackBackButton';
import { bookingsApi } from '../../../src/lib/api';
import {
  formatCurrency,
  getAddressText,
  getBookingReference,
  getPaymentSummaryItems,
  getPaymentSummaryTotal,
  getServiceName,
  normalizePopulatedBooking,
  type PopulatedBooking,
} from '../../../src/utils/booking-response';
import { useSocketManager } from '../../../src/hooks/useSocketManager';
import { TrackingSection } from '../../../src/components/TrackingSection';
import { BookingEtaBanner } from '../../../src/components/BookingEtaBanner';
import { BookingFeedbackSection } from '../../../src/components/BookingFeedbackSection';
import { CallPartnerButton } from '../../../src/components/CallPartnerButton';
import { AppConfirmDialog } from '../../../src/components/AppConfirmDialog';
import { AppDialog } from '../../../src/components/AppDialog';
import { getBookingStatusLabel } from '../../../src/utils/booking-status';
import { openWhatsAppSupport } from '../../../src/utils/support';
import DateTimePicker from '../../../src/components/DateTimePicker';

function BookingDetailsHelpHeaderButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Get help on WhatsApp"
      style={({ pressed }) => [
        styles.headerHelpButton,
        pressed && styles.headerHelpButtonPressed,
      ]}
    >
      <Text style={styles.headerHelpLabel}>Help</Text>
    </Pressable>
  );
}

function BookingDetailsCancelHeaderButton({
  loading,
  onPress,
}: {
  loading: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Cancel booking"
      style={({ pressed }) => [
        styles.headerCancelButton,
        pressed && !loading && styles.headerCancelButtonPressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.error} />
      ) : (
        <Text style={styles.headerCancelLabel}>Cancel</Text>
      )}
    </Pressable>
  );
}

/**
 * Statuses at which we subscribe to the booking socket room.
 * Requirement 11.1: Subscribe when PROFESSIONAL_ASSIGNED or later.
 */
const SUBSCRIBABLE_STATUSES: BookingStatus[] = [
  'PROFESSIONAL_ASSIGNED',
  'PROFESSIONAL_EN_ROUTE',
  'CHECKED_IN',
  'IN_PROGRESS',
];

/**
 * Statuses that allow cancel action.
 * Only bookings that haven't started service can be cancelled.
 */
const CANCELLABLE_STATUSES: BookingStatus[] = [
  'PENDING',
  'PAYMENT_PENDING',
];

const HELP_STATUSES: BookingStatus[] = [
  'CHECKED_IN',
  'IN_PROGRESS',
  'COMPLETED',
];

/**
 * Statuses that allow reschedule action.
 * Only confirmed/assigned scheduled bookings can be rescheduled.
 */
const RESCHEDULABLE_STATUSES: BookingStatus[] = [
  'CONFIRMED',
  'PROFESSIONAL_ASSIGNED',
];

/**
 * Timeline status sequence for display.
 */
const STATUS_SEQUENCE: BookingStatus[] = [
  'PENDING',
  'PAYMENT_PENDING',
  'CONFIRMED',
  'PROFESSIONAL_ASSIGNED',
  'PROFESSIONAL_EN_ROUTE',
  'CHECKED_IN',
  'IN_PROGRESS',
  'COMPLETED',
];

/**
 * Extended booking with populated relations from the API.
 */

function formatPaymentMode(mode?: string): string {
  if (mode === 'RAZORPAY') return 'Online (Razorpay)';
  if (mode === 'CASH') return 'Cash';
  return mode || '—';
}

function getPaymentStatusIcon(status: string) {
  const normalized = status.trim().toUpperCase();
  if (['PAID', 'COMPLETED', 'SUCCESS', 'CAPTURED', 'CONFIRMED'].includes(normalized)) {
    return CheckmarkCircle01Icon;
  }
  if (['FAILED', 'CANCELLED', 'REFUNDED', 'DECLINED'].includes(normalized)) {
    return Alert02Icon;
  }
  return Clock01Icon;
}

function getPaymentStatusColor(status: string): string {
  const normalized = status.trim().toUpperCase();
  if (['PAID', 'COMPLETED', 'SUCCESS', 'CAPTURED', 'CONFIRMED'].includes(normalized)) {
    return colors.success;
  }
  if (['FAILED', 'CANCELLED', 'REFUNDED', 'DECLINED'].includes(normalized)) {
    return colors.error;
  }
  return '#F59E0B';
}

function formatPaymentStatus(status: string): string {
  return status
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Returns a color for a given booking status for badge display.
 */
function getStatusColor(status: BookingStatus): string {
  switch (status) {
    case 'PENDING':
    case 'PAYMENT_PENDING':
      return '#F59E0B';
    case 'CONFIRMED':
    case 'PROFESSIONAL_ASSIGNED':
      return colors.primary;
    case 'PROFESSIONAL_EN_ROUTE':
    case 'CHECKED_IN':
    case 'IN_PROGRESS':
      return colors.secondary;
    case 'COMPLETED':
      return colors.success;
    case 'CANCELLED':
    case 'REFUNDED':
    case 'NO_SHOW':
      return colors.error;
    default:
      return colors.textSecondary;
  }
}

function getStatusBgColor(status: BookingStatus): string {
  return `${getStatusColor(status)}18`;
}

/**
 * Format ISO date string to a readable format.
 */
function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <DecoratedCard style={styles.sectionCard} contentStyle={styles.sectionCardContent}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </DecoratedCard>
  );
}

function DetailRow({
  label,
  value,
  emphasize,
}: {
  label: string;
  value?: string | null;
  emphasize?: boolean;
}) {
  if (!value) return null;

  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, emphasize && styles.detailValueEmphasis]} numberOfLines={4}>
        {value}
      </Text>
    </View>
  );
}

function PriceRow({
  label,
  amount,
  isDiscount,
}: {
  label: string;
  amount: number;
  isDiscount?: boolean;
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, isDiscount && styles.discountValue]}>
        {isDiscount ? `-${formatCurrency(amount)}` : formatCurrency(amount)}
      </Text>
    </View>
  );
}

/**
 * Booking detail screen with full booking information, cancel flow, and reschedule flow.
 *
 * Displays:
 * - Status badge with color coding
 * - Service information (name, variant, addons)
 * - Partner information (name, phone)
 * - Address details (label, line1, city, pincode)
 * - Timeline of status transitions
 * - Action buttons: Cancel (with reason input) and Reschedule (with date-time picker)
 * - Real-time tracking when partner is assigned
 *
 * @validates Requirements 10.2, 10.3, 10.4, 11.1, 11.2, 11.6
 */
export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const socketManager = useSocketManager();

  // Cancel flow state
  const [showCancelSheet, setShowCancelSheet] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // Reschedule flow state
  const [showReschedulePicker, setShowReschedulePicker] = useState(false);

  const [feedbackDialog, setFeedbackDialog] = useState<{
    title: string;
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  // Fetch booking details (Requirement 10.2)
  const {
    data: booking,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['bookings', id],
    queryFn: async () => normalizePopulatedBooking(await bookingsApi.getById(id!)),
    enabled: !!id,
  });

  // Real-time booking status updates via socket
  const shouldSubscribe = booking?.status
    ? SUBSCRIBABLE_STATUSES.includes(booking.status)
    : false;

  const bookingStatusUpdate = useBookingStatus(
    socketManager,
    shouldSubscribe ? (id ?? null) : null,
  );

  // Effective status: real-time socket update takes priority over fetched data
  const effectiveStatus: BookingStatus =
    (bookingStatusUpdate?.status as BookingStatus) ?? booking?.status ?? 'PENDING';

  // Socket subscription lifecycle (Requirement 11.1, 11.6)
  useEffect(() => {
    if (!socketManager || !id || !shouldSubscribe) {
      return;
    }
    socketManager.subscribeToBooking(id);
    return () => {
      socketManager.unsubscribeFromBooking(id);
    };
  }, [socketManager, id, shouldSubscribe]);

  // Cancel mutation (Requirement 10.3)
  const cancelMutation = useMutation({
    mutationFn: (reason?: string) => bookingsApi.cancel(id!, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings', id] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      setShowCancelSheet(false);
      setCancelReason('');
      setFeedbackDialog({
        title: 'Booking Cancelled',
        message: 'Your booking has been cancelled successfully.',
        type: 'success',
      });
    },
    onError: (err: any) => {
      setFeedbackDialog({
        title: 'Cancel Failed',
        message: err?.response?.data?.message || 'Failed to cancel booking. Please try again.',
        type: 'error',
      });
    },
  });

  // Reschedule mutation (Requirement 10.4)
  const rescheduleMutation = useMutation({
    mutationFn: (newScheduledAt: string) =>
      bookingsApi.reschedule(id!, { newScheduledAt }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings', id] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      setShowReschedulePicker(false);
      setFeedbackDialog({
        title: 'Booking Rescheduled',
        message: 'Your booking has been rescheduled successfully.',
        type: 'success',
      });
    },
    onError: (err: any) => {
      setFeedbackDialog({
        title: 'Reschedule Failed',
        message: err?.response?.data?.message || 'Failed to reschedule booking. Please try again.',
        type: 'error',
      });
    },
  });

  const handleCancelConfirm = useCallback(() => {
    cancelMutation.mutate(cancelReason.trim() || undefined);
  }, [cancelReason, cancelMutation]);

  const handleRescheduleConfirm = useCallback(
    (date: Date) => {
      rescheduleMutation.mutate(date.toISOString());
    },
    [rescheduleMutation],
  );

  const canCancel = !!booking?.id && CANCELLABLE_STATUSES.includes(effectiveStatus);
  const showHelp = !!booking?.id && HELP_STATUSES.includes(effectiveStatus);
  const canReschedule =
    RESCHEDULABLE_STATUSES.includes(effectiveStatus) &&
    booking?.bookingType === 'SCHEDULED';

  const openCancelSheet = useCallback(() => {
    setShowCancelSheet(true);
  }, []);

  const openHelp = useCallback(() => {
    void openWhatsAppSupport();
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => <StackBackButton fallbackRoute="/(tabs)/bookings" />,
      headerBackVisible: false,
      headerRight: canCancel
        ? () => (
            <BookingDetailsCancelHeaderButton
              loading={cancelMutation.isPending}
              onPress={openCancelSheet}
            />
          )
        : showHelp
          ? () => <BookingDetailsHelpHeaderButton onPress={openHelp} />
          : undefined,
    });
  }, [navigation, canCancel, showHelp, cancelMutation.isPending, openCancelSheet, openHelp]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text variant="bodyMedium" style={styles.loadingText}>Loading booking details...</Text>
      </View>
    );
  }

  if (error || !booking?.id) {
    return (
      <View style={styles.errorContainer}>
        <Text variant="bodyMedium" style={styles.errorText}>
          {(error as any)?.message || 'Failed to load booking details'}
        </Text>
      </View>
    );
  }

  const addressText = getAddressText(booking);
  const serviceName = getServiceName(booking);
  const paymentSummaryItems = getPaymentSummaryItems(booking);
  const paymentTotal = getPaymentSummaryTotal(booking);
  const serviceMeta = [
    booking.variant?.name,
    booking.variant?.duration ? `${booking.variant.duration} min` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <DecoratedCard
        style={[styles.summaryCard, { borderLeftColor: getStatusColor(effectiveStatus), borderLeftWidth: 4 }]}
        contentStyle={styles.summaryCardContent}
      >
        <View style={styles.summaryTop}>
          <View style={styles.summaryMeta}>
            <Text style={styles.bookingNumber}>
              {getBookingReference(booking)}
            </Text>
            <Text style={styles.bookingType}>
              {booking.bookingType === 'SCHEDULED' ? 'Scheduled booking' : 'Instant booking'}
            </Text>
          </View>
          <View
            style={[styles.statusBadge, { backgroundColor: getStatusBgColor(effectiveStatus), borderColor: `${getStatusColor(effectiveStatus)}30` }]}
            accessibilityRole="text"
            accessibilityLabel={`Booking status: ${getBookingStatusLabel(effectiveStatus)}`}
          >
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(effectiveStatus) }]} />
            <Text style={[styles.statusLabel, { color: getStatusColor(effectiveStatus) }]}>
              {getBookingStatusLabel(effectiveStatus)}
            </Text>
          </View>
        </View>

        {effectiveStatus === 'PROFESSIONAL_EN_ROUTE' ? (
          <BookingEtaBanner
            bookingId={id!}
            bookingStatus={effectiveStatus}
            socketManager={socketManager}
            destinationLatitude={booking.address?.latitude}
            destinationLongitude={booking.address?.longitude}
          />
        ) : null}

        <Divider style={styles.summaryDivider} />

        <View style={styles.summaryService}>
          <View style={styles.summaryInfoItem}>
            <View style={styles.summaryIconWrap}>
              <HugeiconsIcon icon={SparklesIcon} size={16} color={colors.primary} strokeWidth={1.5} />
            </View>
            <View style={styles.summaryInfoText}>
              <Text style={styles.summaryInfoLabel}>Service</Text>
              <Text style={styles.summaryServiceName}>{serviceName}</Text>
              {serviceMeta ? (
                <Text style={styles.summaryServiceMeta}>{serviceMeta}</Text>
              ) : null}
            </View>
          </View>
          {booking.addons && booking.addons.length > 0 ? (
            <>
              <Divider style={styles.divider} />
              <Text style={styles.subSectionLabel}>Add-ons</Text>
              {booking.addons.map((addon) => (
                <DetailRow
                  key={addon.id}
                  label={addon.name}
                  value={addon.price != null ? formatCurrency(Number(addon.price)) : undefined}
                />
              ))}
            </>
          ) : null}
        </View>

        <View style={styles.summaryInfo}>
          <View style={styles.summaryInfoItem}>
            <View style={styles.summaryIconWrap}>
              <HugeiconsIcon icon={Calendar01Icon} size={16} color={colors.primary} strokeWidth={1.5} />
            </View>
            <View style={styles.summaryInfoText}>
              <Text style={styles.summaryInfoLabel}>Booked on</Text>
              <Text style={styles.summaryInfoValue}>{formatDateTime(booking.createdAt)}</Text>
            </View>
          </View>
          {booking.scheduledAt ? (
            <View style={styles.summaryInfoItem}>
              <View style={styles.summaryIconWrap}>
                <HugeiconsIcon icon={Calendar01Icon} size={16} color={colors.primary} strokeWidth={1.5} />
              </View>
              <View style={styles.summaryInfoText}>
                <Text style={styles.summaryInfoLabel}>Scheduled for</Text>
                <Text style={styles.summaryInfoValue}>{formatDateTime(booking.scheduledAt)}</Text>
              </View>
            </View>
          ) : null}
          {addressText ? (
            <View style={styles.summaryInfoItem}>
              <View style={styles.summaryIconWrap}>
                <HugeiconsIcon icon={Location01Icon} size={16} color={colors.primary} strokeWidth={1.5} />
              </View>
              <View style={styles.summaryInfoText}>
                <Text style={styles.summaryInfoLabel}>Address</Text>
                <Text style={styles.summaryInfoValue}>{addressText}</Text>
              </View>
            </View>
          ) : null}
        </View>
      </DecoratedCard>

      <TrackingSection
        bookingId={id!}
        bookingStatus={effectiveStatus}
        socketManager={socketManager}
        addressLatitude={booking.address?.latitude}
        addressLongitude={booking.address?.longitude}
      />

      <SectionCard title="Payment Summary">
        {paymentSummaryItems.length > 0 ? (
          paymentSummaryItems.map((item) => (
            <PriceRow
              key={item.label}
              label={item.label}
              amount={item.amount}
              isDiscount={item.isDiscount}
            />
          ))
        ) : (
          <PriceRow label="Total amount" amount={paymentTotal} />
        )}
        <Divider style={styles.divider} />
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{formatCurrency(paymentTotal)}</Text>
        </View>
        <Divider style={styles.divider} />
        <View style={styles.paymentMetaRow}>
          <View style={styles.paymentMetaItem}>
            <View style={styles.summaryIconWrap}>
              <HugeiconsIcon icon={CreditCardAcceptIcon} size={16} color={colors.primary} strokeWidth={1.5} />
            </View>
            <View style={styles.summaryInfoText}>
              <Text style={styles.summaryInfoLabel}>Payment mode</Text>
              <Text style={styles.summaryInfoValue}>{formatPaymentMode(booking.paymentMode)}</Text>
            </View>
          </View>
          {booking.paymentStatus ? (
            <View style={styles.paymentMetaItem}>
              <View style={[styles.summaryIconWrap, { backgroundColor: `${getPaymentStatusColor(booking.paymentStatus)}18` }]}>
                <HugeiconsIcon
                  icon={getPaymentStatusIcon(booking.paymentStatus)}
                  size={16}
                  color={getPaymentStatusColor(booking.paymentStatus)}
                  strokeWidth={1.5}
                />
              </View>
              <View style={styles.summaryInfoText}>
                <Text style={styles.summaryInfoLabel}>Payment status</Text>
                <Text style={[styles.summaryInfoValue, { color: getPaymentStatusColor(booking.paymentStatus) }]}>
                  {formatPaymentStatus(booking.paymentStatus)}
                </Text>
              </View>
            </View>
          ) : null}
        </View>
        {booking.couponCode && !paymentSummaryItems.some((item) => item.label.includes(booking.couponCode!)) ? (
          <DetailRow label="Coupon applied" value={booking.couponCode} />
        ) : null}
      </SectionCard>

      {booking.partner ? (
        <SectionCard title="Partner">
          <View style={styles.partnerRow}>
            <View style={styles.summaryIconWrap}>
              <HugeiconsIcon icon={UserIcon} size={16} color={colors.primary} strokeWidth={1.5} />
            </View>
            <View style={styles.partnerInfo}>
              <Text style={styles.partnerName}>{booking.partner.fullName}</Text>
              {booking.partner.phone ? (
                <Text style={styles.partnerPhone}>{booking.partner.phone}</Text>
              ) : null}
            </View>
          </View>
          <View style={styles.callButtonContainer}>
            <CallPartnerButton bookingId={id!} status={effectiveStatus} />
          </View>
        </SectionCard>
      ) : null}

      <BookingFeedbackSection
        bookingId={id!}
        bookingStatus={effectiveStatus}
        hasReview={booking.hasReview}
        canSubmitReview={booking.reviewStatus?.canSubmitReview}
        disputeStatus={booking.disputeStatus}
      />

      <SectionCard title="Timeline">
        {renderTimeline(effectiveStatus, booking.statusHistory, booking.createdAt)}
      </SectionCard>

      {booking.consumerNotes ? (
        <SectionCard title="Notes">
          <Text style={styles.notesText}>{booking.consumerNotes}</Text>
        </SectionCard>
      ) : null}

      {canReschedule && (
        <View style={styles.actionSection}>
          <Button
            mode="outlined"
            compact
            onPress={() => setShowReschedulePicker(true)}
            loading={rescheduleMutation.isPending}
            textColor={colors.primary}
            style={styles.actionButton}
            contentStyle={styles.btnContent}
          >
            Reschedule
          </Button>
        </View>
      )}

      <AppConfirmDialog
        visible={showCancelSheet}
        onDismiss={() => {
          setShowCancelSheet(false);
          setCancelReason('');
        }}
        onConfirm={handleCancelConfirm}
        title="Cancel Booking"
        message="Are you sure you want to cancel this booking? This action cannot be undone."
        confirmLabel="Confirm Cancel"
        cancelLabel="Keep Booking"
        confirmVariant="destructive"
        confirmLoading={cancelMutation.isPending}
      >
        <TextInput
          label="Reason (optional)"
          placeholder="Tell us why you're cancelling..."
          value={cancelReason}
          onChangeText={setCancelReason}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </AppConfirmDialog>

      <AppDialog
        visible={feedbackDialog !== null}
        onDismiss={() => setFeedbackDialog(null)}
        title={feedbackDialog?.title ?? ''}
        message={feedbackDialog?.message ?? ''}
        type={feedbackDialog?.type ?? 'error'}
      />

      {showReschedulePicker && (
        <DateTimePicker
          value={booking.scheduledAt ? new Date(booking.scheduledAt) : new Date()}
          minimumDate={new Date()}
          onChange={handleRescheduleConfirm}
          onDismiss={() => setShowReschedulePicker(false)}
        />
      )}
    </ScrollView>
  );
}

/**
 * Renders a vertical timeline showing booking status progression.
 */
function renderTimeline(
  currentStatus: BookingStatus,
  statusHistory?: Array<{ status: BookingStatus; timestamp: string; reason?: string }>,
  createdAt?: string,
) {
  // If we have status history from the API, use it
  if (statusHistory && statusHistory.length > 0) {
    return (
      <View style={styles.timeline}>
        {statusHistory.map((entry, index) => {
          const isLast = index === statusHistory.length - 1;
          return (
            <View key={`${entry.status}-${index}`} style={styles.timelineItem}>
              <View style={styles.timelineIndicator}>
                <View
                  style={[
                    styles.timelineDot,
                    {
                      backgroundColor: isLast
                        ? getStatusColor(entry.status)
                        : '#28A745',
                    },
                  ]}
                />
                {!isLast && <View style={styles.timelineLine} />}
              </View>
              <View style={styles.timelineContent}>
                <Text style={styles.timelineStatus}>
                  {getBookingStatusLabel(entry.status)}
                </Text>
                <Text variant="bodySmall" style={styles.timelineTime}>
                  {formatDateTime(entry.timestamp)}
                </Text>
                {entry.reason && (
                  <Text variant="bodySmall" style={styles.timelineReason}>{entry.reason}</Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
    );
  }

  // Fallback: show progression based on current status
  const currentIndex = STATUS_SEQUENCE.indexOf(currentStatus);
  const isCancelledOrTerminal = ['CANCELLED', 'REFUNDED', 'NO_SHOW'].includes(
    currentStatus,
  );

  const displayStatuses = isCancelledOrTerminal
    ? [...STATUS_SEQUENCE.slice(0, Math.max(currentIndex, 2)), currentStatus]
    : STATUS_SEQUENCE;

  return (
    <View style={styles.timeline}>
      {displayStatuses.map((status, index) => {
        const statusIndex = STATUS_SEQUENCE.indexOf(status);
        const isReached = isCancelledOrTerminal
          ? index < displayStatuses.length - 1 || status === currentStatus
          : statusIndex <= currentIndex;
        const isCurrent = status === currentStatus;
        const isLast = index === displayStatuses.length - 1;

        return (
          <View key={status} style={styles.timelineItem}>
            <View style={styles.timelineIndicator}>
              <View
                style={[
                  styles.timelineDot,
                  {
                    backgroundColor: isCurrent
                      ? getStatusColor(status)
                      : isReached
                        ? '#28A745'
                        : '#E5E7EB',
                  },
                ]}
              />
              {!isLast && (
                <View
                  style={[
                    styles.timelineLine,
                    { backgroundColor: isReached ? '#28A745' : '#E5E7EB' },
                  ]}
                />
              )}
            </View>
            <View style={styles.timelineContent}>
              <Text
                style={[
                  styles.timelineStatus,
                  {
                    color: isReached ? colors.textPrimary : colors.textSecondary,
                    fontWeight: isCurrent ? '600' : '400',
                  },
                ]}
              >
                {getBookingStatusLabel(status)}
              </Text>
              {isCurrent && createdAt ? (
                <Text style={styles.timelineTime}>{formatDateTime(createdAt)}</Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
    gap: 12,
  },
  loadingText: {
    color: colors.textSecondary,
    fontFamily: fonts.regular,
  },
  errorText: {
    color: colors.error,
    textAlign: 'center',
    fontFamily: fonts.regular,
  },
  summaryCard: {
    marginBottom: 0,
  },
  summaryCardContent: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 10,
  },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  summaryMeta: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  bookingNumber: {
    fontFamily: fonts.bold,
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 20,
  },
  bookingType: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 14,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
    flexShrink: 0,
    maxWidth: '46%',
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    flexShrink: 0,
  },
  statusLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 9,
    fontWeight: '600',
    lineHeight: 12,
    flexShrink: 1,
    textAlign: 'right',
  },
  summaryInfo: {
    gap: 8,
  },
  summaryDivider: {
    marginVertical: 0,
    backgroundColor: colors.surfaceVariant,
  },
  summaryService: {
    gap: 6,
  },
  summaryServiceName: {
    fontFamily: fonts.bold,
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 18,
  },
  summaryServiceMeta: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 14,
  },
  summaryInfoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  summaryIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  summaryInfoText: {
    flex: 1,
    gap: 2,
  },
  summaryInfoLabel: {
    fontFamily: fonts.medium,
    fontSize: 10,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    lineHeight: 13,
  },
  summaryInfoValue: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: colors.textPrimary,
    lineHeight: 16,
  },
  sectionCard: {
    marginBottom: 0,
  },
  sectionCardContent: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 8,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 0,
    lineHeight: 18,
  },
  subSectionLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 0,
    lineHeight: 14,
  },
  divider: {
    marginVertical: 3,
    backgroundColor: colors.surfaceVariant,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 2,
  },
  detailLabel: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 16,
  },
  detailValue: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'right',
    flex: 1,
    lineHeight: 16,
  },
  detailValueEmphasis: {
    fontFamily: fonts.bold,
    fontWeight: '700',
  },
  discountValue: {
    color: colors.success,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 2,
  },
  totalLabel: {
    fontFamily: fonts.bold,
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 18,
  },
  totalValue: {
    fontFamily: fonts.bold,
    fontSize: 17,
    fontWeight: '700',
    color: colors.primary,
    lineHeight: 21,
  },
  paymentMetaRow: {
    gap: 8,
  },
  paymentMetaItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  partnerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  partnerInfo: {
    flex: 1,
    gap: 1,
  },
  partnerName: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 18,
  },
  partnerPhone: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  callButtonContainer: {
    marginTop: 6,
  },
  notesText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 18,
  },
  timeline: {
    paddingLeft: 4,
  },
  timelineItem: {
    flexDirection: 'row',
    minHeight: 32,
  },
  timelineIndicator: {
    alignItems: 'center',
    width: 20,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.surfaceVariant,
    marginVertical: 2,
  },
  timelineContent: {
    flex: 1,
    marginLeft: 8,
    paddingBottom: 8,
  },
  timelineStatus: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 17,
  },
  timelineTime: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
    lineHeight: 14,
  },
  timelineReason: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 1,
    lineHeight: 14,
  },
  actionSection: {
    marginTop: 4,
    gap: 10,
  },
  actionButton: {
    borderRadius: 10,
  },
  btnContent: sharedPaperStyles.buttonContent,
  headerCancelButton: {
    marginRight: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.error,
    backgroundColor: `${colors.error}0D`,
    minHeight: 40,
    minWidth: 72,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCancelButtonPressed: {
    opacity: 0.85,
  },
  headerCancelLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    fontWeight: '600',
    color: colors.error,
  },
  headerHelpButton: {
    marginRight: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}0D`,
    minHeight: 40,
    minWidth: 72,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerHelpButtonPressed: {
    opacity: 0.85,
  },
  headerHelpLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
});
