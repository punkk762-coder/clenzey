import { useCallback, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Text, Button, Card, TextInput } from 'react-native-paper';
import { colors, materialStyle, fonts } from '@clenzey/design-system';
import { createBookingsEndpoints, TransitionPayload } from '@clenzey/api-client';
import { Booking, BookingStatus } from '@clenzey/types';
import { apiClient } from '../../../src/lib/api';
import { CallConsumerButton } from '../../../src/components/CallConsumerButton';
import { sharedPaperStyles } from '../../../src/styles/paperControls';
import { AppConfirmDialog } from '../../../src/components/AppConfirmDialog';

const bookingsApi = createBookingsEndpoints(apiClient);

export const NEXT_STATUS_MAP: Partial<Record<BookingStatus, BookingStatus>> = {
  PROFESSIONAL_ASSIGNED: 'PROFESSIONAL_EN_ROUTE',
  PROFESSIONAL_EN_ROUTE: 'CHECKED_IN',
  CHECKED_IN: 'IN_PROGRESS',
  IN_PROGRESS: 'COMPLETED',
};

const TRANSITION_LABELS: Partial<Record<BookingStatus, string>> = {
  PROFESSIONAL_ASSIGNED: 'Start En Route',
  PROFESSIONAL_EN_ROUTE: 'Check In',
  CHECKED_IN: 'Start Service',
  IN_PROGRESS: 'Complete',
};

export function validateTransition(
  currentStatus: BookingStatus,
  toStatus: string
): string | null {
  const validNext = NEXT_STATUS_MAP[currentStatus];
  if (!validNext) {
    return `No further transitions are allowed from status "${currentStatus}".`;
  }
  if (validNext !== toStatus) {
    return `Cannot transition from "${currentStatus}" to "${toStatus}". The only valid next status is "${validNext}".`;
  }
  return null;
}

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cancelDialogVisible, setCancelDialogVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [transitionError, setTransitionError] = useState<string | null>(null);

  const bookingQuery = useQuery({
    queryKey: ['partner-booking', id],
    queryFn: async () => {
      const response = await bookingsApi.getById(id!);
      return response as unknown as Booking;
    },
    enabled: !!id,
  });

  const booking = bookingQuery.data;

  const transitionMutation = useMutation({
    mutationFn: (payload: TransitionPayload) => {
      if (!booking) throw new Error('Booking data not available');
      const validationError = validateTransition(booking.status as BookingStatus, payload.toStatus);
      if (validationError) throw new Error(validationError);
      return bookingsApi.transition(id!, payload);
    },
    onSuccess: () => {
      setTransitionError(null);
      queryClient.invalidateQueries({ queryKey: ['partner-booking', id] });
      queryClient.invalidateQueries({ queryKey: ['partner-bookings'] });
    },
    onError: (error: Error) => {
      const message = error.message || 'Failed to update booking status. Please try again.';
      setTransitionError(message);
      Alert.alert('Transition Error', message);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (reason?: string) => bookingsApi.cancel(id!, reason || undefined),
    onSuccess: () => {
      setTransitionError(null);
      queryClient.invalidateQueries({ queryKey: ['partner-booking', id] });
      queryClient.invalidateQueries({ queryKey: ['partner-bookings'] });
      setCancelDialogVisible(false);
      setCancelReason('');
      router.back();
    },
    onError: (error: Error) => {
      Alert.alert('Cancel Error', error.message || 'Failed to cancel booking. Please try again.');
    },
  });

  const handleTransition = useCallback(() => {
    if (!booking) return;
    const currentStatus = booking.status as BookingStatus;
    const nextStatus = NEXT_STATUS_MAP[currentStatus];
    if (!nextStatus) {
      setTransitionError(`No further transitions are allowed from status "${currentStatus}".`);
      return;
    }
    setTransitionError(null);
    const label = TRANSITION_LABELS[currentStatus];
    Alert.alert(
      'Confirm Transition',
      `Are you sure you want to "${label}"?\n\nThis will change the booking status from "${currentStatus}" to "${nextStatus}".`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => transitionMutation.mutate({ toStatus: nextStatus }) },
      ]
    );
  }, [booking, transitionMutation]);

  const handleCancelSubmit = useCallback(() => {
    cancelMutation.mutate(cancelReason.trim() || undefined);
  }, [cancelMutation, cancelReason]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['partner-booking', id] });
    setIsRefreshing(false);
  }, [queryClient, id]);

  if (bookingQuery.isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text variant="bodyMedium" style={styles.loadingText}>Loading booking...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!booking) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text variant="bodyLarge" style={styles.loadingText}>Booking not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentStatus = booking.status as BookingStatus;
  const nextStatus = NEXT_STATUS_MAP[currentStatus];
  const transitionLabel = TRANSITION_LABELS[currentStatus];
  const canTransition = !!nextStatus;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
      >
        <View style={styles.statusHeader}>
          <View style={[styles.statusBadgeLarge, { backgroundColor: getStatusColor(booking.status) }]}>
            <Text variant="labelLarge" style={styles.statusBadgeLargeText}>
              {getStatusLabel(booking.status)}
            </Text>
          </View>
        </View>

        <Card style={[styles.card, materialStyle('card')]} mode="elevated">
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle}>Booking Details</Text>

            <View style={styles.infoRow}>
              <Text variant="bodyMedium" style={styles.infoLabel}>Booking Name</Text>
              <Text variant="bodyMedium" style={styles.infoValue}>{booking.bookingName ?? 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text variant="bodyMedium" style={styles.infoLabel}>Service ID</Text>
              <Text variant="bodyMedium" style={styles.infoValue} numberOfLines={1}>{booking.serviceId}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text variant="bodyMedium" style={styles.infoLabel}>Address ID</Text>
              <Text variant="bodyMedium" style={styles.infoValue} numberOfLines={1}>{booking.addressId}</Text>
            </View>
            {booking.consumerNotes ? (
              <View style={styles.infoRow}>
                <Text variant="bodyMedium" style={styles.infoLabel}>Consumer Notes</Text>
                <Text variant="bodyMedium" style={styles.infoValue}>{booking.consumerNotes}</Text>
              </View>
            ) : null}
            <View style={styles.infoRow}>
              <Text variant="bodyMedium" style={styles.infoLabel}>Amount</Text>
              <Text variant="titleSmall" style={styles.infoValueBold}>₹{booking.totalAmount?.toFixed(2) ?? '0.00'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text variant="bodyMedium" style={styles.infoLabel}>Payment Mode</Text>
              <Text variant="bodyMedium" style={styles.infoValue}>{booking.paymentMode}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text variant="bodyMedium" style={styles.infoLabel}>Booking Type</Text>
              <Text variant="bodyMedium" style={styles.infoValue}>{booking.bookingType}</Text>
            </View>
            {booking.scheduledAt ? (
              <View style={styles.infoRow}>
                <Text variant="bodyMedium" style={styles.infoLabel}>Scheduled At</Text>
                <Text variant="bodyMedium" style={styles.infoValue}>{formatDate(booking.scheduledAt)}</Text>
              </View>
            ) : null}
          </Card.Content>
        </Card>

        {transitionError && (
          <View style={styles.errorContainer}>
            <Text variant="bodyMedium" style={styles.errorText}>{transitionError}</Text>
          </View>
        )}

        {canTransition && (
          <View style={styles.transitionSection}>
            <Button
              mode="contained"
              compact
              onPress={handleTransition}
              loading={transitionMutation.isPending}
              disabled={transitionMutation.isPending}
              buttonColor={colors.primary}
              style={styles.fullButton}
              contentStyle={sharedPaperStyles.buttonContent}
            >
              {transitionLabel!}
            </Button>
          </View>
        )}

        <CallConsumerButton bookingId={id!} bookingStatus={currentStatus} />

        {canTransition && (
          <View style={styles.cancelSection}>
            <Button
              mode="outlined"
              compact
              onPress={() => { setCancelReason(''); setCancelDialogVisible(true); }}
              loading={cancelMutation.isPending}
              disabled={cancelMutation.isPending || transitionMutation.isPending}
              textColor={colors.error}
              style={styles.cancelButton}
              contentStyle={sharedPaperStyles.buttonContent}
            >
              Cancel Booking
            </Button>
          </View>
        )}
      </ScrollView>

      <AppConfirmDialog
        visible={cancelDialogVisible}
        onDismiss={() => setCancelDialogVisible(false)}
        onConfirm={handleCancelSubmit}
        title="Cancel Booking"
        message="Please provide a reason for cancellation:"
        confirmLabel="Cancel Booking"
        confirmVariant="destructive"
        confirmLoading={cancelMutation.isPending}
        iconType="error"
      >
        <TextInput
          label="Reason"
          placeholder="Enter cancellation reason..."
          value={cancelReason}
          onChangeText={setCancelReason}
          multiline
          mode="outlined"
          dense
          outlineStyle={styles.inputOutline}
          style={styles.cancelReasonInput}
          contentStyle={sharedPaperStyles.inputContent}
        />
      </AppConfirmDialog>
    </SafeAreaView>
  );
}

function getStatusLabel(status: BookingStatus): string {
  switch (status) {
    case 'PROFESSIONAL_ASSIGNED': return 'Assigned';
    case 'PROFESSIONAL_EN_ROUTE': return 'En Route';
    case 'CHECKED_IN': return 'Checked In';
    case 'IN_PROGRESS': return 'In Progress';
    case 'COMPLETED': return 'Completed';
    default: return status;
  }
}

function getStatusColor(status: BookingStatus): string {
  switch (status) {
    case 'PROFESSIONAL_ASSIGNED':
    case 'CONFIRMED':
      return colors.primary;
    case 'PROFESSIONAL_EN_ROUTE':
    case 'CHECKED_IN':
    case 'IN_PROGRESS':
      return colors.secondary;
    case 'COMPLETED':
      return colors.success;
    default:
      return colors.textSecondary;
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  scrollContent: { padding: 16, paddingBottom: 48 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: colors.textSecondary },
  statusHeader: { alignItems: 'center', marginBottom: 24 },
  statusBadgeLarge: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16 },
  statusBadgeLargeText: { fontWeight: '700', fontFamily: fonts.bold, color: colors.white },
  card: { marginBottom: 16, backgroundColor: colors.white, borderRadius: 16 },
  cardTitle: { fontWeight: '700', fontFamily: fonts.bold, color: colors.textPrimary, marginBottom: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.surfaceVariant },
  infoLabel: { color: colors.textSecondary, flex: 1 },
  infoValue: { color: colors.textPrimary, flex: 1.5, textAlign: 'right' },
  infoValueBold: { fontWeight: '700', fontFamily: fonts.bold, color: colors.primary, flex: 1.5, textAlign: 'right' },
  transitionSection: { marginTop: 16 },
  fullButton: { borderRadius: 10 },
  errorContainer: { backgroundColor: `${colors.error}10`, borderWidth: 1, borderColor: `${colors.error}30`, borderRadius: 12, padding: 16, marginTop: 16 },
  errorText: { color: colors.error, textAlign: 'center' },
  cancelSection: { marginTop: 8 },
  cancelButton: { borderColor: colors.error, borderRadius: 10 },
  cancelReasonInput: { backgroundColor: colors.white },
  inputOutline: { borderRadius: 10 },
});
