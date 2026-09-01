import { useState } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Text } from 'react-native-paper';
import type { BookingDisputeStatus, BookingStatus, Dispute, DisputeCategory, DisputeSummary } from '@clenzey/types';
import { Alert02Icon, CheckmarkCircle01Icon } from '@hugeicons/core-free-icons';
import { colors, fonts, TextInput, getSemanticTone } from '@clenzey/design-system';
import { isApiError } from '@clenzey/api-client';
import { disputesApi } from '../lib/api';
import type { PopulatedBooking } from '../utils/booking-response';
import {
  DISPUTE_CATEGORIES,
  getDisputeCategoryLabel,
  getDisputeStatusColor,
  getDisputeStatusLabel,
  isResolvedDisputeStatus,
} from '../utils/dispute-status';
import { AppScrollDialog } from './AppScrollDialog';
import { getDialogToneStyles } from '../utils/dialog-tone-styles';

const DISPUTE_CREATE_TONE = 'warning' as const;
const DISPUTE_DETAIL_TONE = 'info' as const;

const MIN_DESCRIPTION_LENGTH = 10;
const MAX_DESCRIPTION_LENGTH = 2000;

const DISPUTE_RELEVANT_STATUSES: BookingStatus[] = ['COMPLETED', 'CANCELLED'];

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

function updateBookingDisputeStatus(
  queryClient: ReturnType<typeof useQueryClient>,
  bookingId: string,
  disputeStatus: BookingDisputeStatus,
) {
  queryClient.setQueryData(['bookings', bookingId], (current: unknown) => {
    if (!current || typeof current !== 'object') return current;
    return {
      ...(current as PopulatedBooking),
      disputeStatus,
    };
  });
}

export function useBookingDisputeStatus(
  bookingId: string,
  bookingStatus: BookingStatus,
  bookingDisputeStatus?: BookingDisputeStatus,
) {
  const isRelevant = DISPUTE_RELEVANT_STATUSES.includes(bookingStatus);

  return useQuery({
    queryKey: ['disputes', 'booking', bookingId],
    queryFn: async () => {
      const result = (await disputesApi.getByBooking(bookingId)) as unknown as {
        disputeStatus: BookingDisputeStatus;
      };
      return result.disputeStatus;
    },
    enabled: isRelevant,
    initialData: bookingDisputeStatus,
  });
}

interface DisputeCreateModalProps {
  visible: boolean;
  onDismiss: () => void;
  bookingId: string;
  onSubmitted?: () => void;
}

export function DisputeCreateModal({
  visible,
  onDismiss,
  bookingId,
  onSubmitted,
}: DisputeCreateModalProps) {
  const [category, setCategory] = useState<DisputeCategory | null>(null);
  const [description, setDescription] = useState('');
  const queryClient = useQueryClient();

  const createDispute = useMutation({
    mutationFn: () =>
      disputesApi.create({
        bookingId,
        category: category!,
        description: description.trim(),
      }) as unknown as Promise<{ dispute: Dispute }>,
    onSuccess: (response) => {
      const dispute = response.dispute;
      const nextDisputeStatus: BookingDisputeStatus = {
        canRaiseDispute: false,
        hasActiveDispute: true,
        dispute: {
          id: dispute.id,
          category: dispute.category,
          status: dispute.status,
          description: dispute.description,
          resolutionNotes: dispute.resolutionNotes,
          createdAt: dispute.createdAt,
          resolvedAt: dispute.resolvedAt,
        },
      };

      queryClient.setQueryData(['disputes', 'booking', bookingId], nextDisputeStatus);
      updateBookingDisputeStatus(queryClient, bookingId, nextDisputeStatus);
      queryClient.invalidateQueries({ queryKey: ['bookings', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['disputes', 'booking', bookingId] });
      setCategory(null);
      setDescription('');
      onSubmitted?.();
      onDismiss();
    },
    onError: (error: unknown) => {
      if (isApiError(error) && (error.statusCode === 409 || error.statusCode === 400)) {
        queryClient.invalidateQueries({ queryKey: ['bookings', bookingId] });
        queryClient.invalidateQueries({ queryKey: ['disputes', 'booking', bookingId] });
      }
    },
  });

  const trimmedDescription = description.trim();
  const canSubmit =
    category != null &&
    trimmedDescription.length >= MIN_DESCRIPTION_LENGTH &&
    trimmedDescription.length <= MAX_DESCRIPTION_LENGTH &&
    !createDispute.isPending;

  const handleDismiss = () => {
    if (createDispute.isPending) return;
    onDismiss();
  };

  const toneStyles = getDialogToneStyles(DISPUTE_CREATE_TONE);
  const semantic = getSemanticTone(DISPUTE_CREATE_TONE);

  return (
    <AppScrollDialog
      visible={visible}
      onDismiss={handleDismiss}
      title="Report an issue"
      subtitle="Tell us what went wrong. Our team will review your dispute within 7 days of completion."
      tone={DISPUTE_CREATE_TONE}
      headerIcon={Alert02Icon}
    >
      <Text style={styles.fieldLabel}>Category</Text>
      <View style={styles.categoryRow}>
        {DISPUTE_CATEGORIES.map((option) => {
          const selected = category === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => setCategory(option.value)}
              style={[
                styles.categoryChip,
                { borderColor: semantic.border, backgroundColor: colors.white },
                selected && toneStyles.selectedChip,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={option.label}
            >
              <Text style={[styles.categoryChipText, selected && toneStyles.selectedChipText]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <TextInput
        label="Description"
        placeholder="Describe the issue in detail (minimum 10 characters)..."
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
        maxLength={MAX_DESCRIPTION_LENGTH}
      />
      <Text style={styles.charCount}>
        {trimmedDescription.length}/{MAX_DESCRIPTION_LENGTH}
        {trimmedDescription.length > 0 && trimmedDescription.length < MIN_DESCRIPTION_LENGTH
          ? ` · at least ${MIN_DESCRIPTION_LENGTH} characters required`
          : ''}
      </Text>

      {createDispute.isError ? (
        <Text style={styles.errorText}>
          {isApiError(createDispute.error)
            ? createDispute.error.message
            : 'Failed to submit dispute. Please try again.'}
        </Text>
      ) : null}

      <Pressable
        style={[styles.submitButton, toneStyles.submitButton, !canSubmit && toneStyles.submitButtonDisabled]}
        onPress={() => createDispute.mutate()}
        disabled={!canSubmit}
        accessibilityRole="button"
        accessibilityLabel="Submit dispute"
      >
        {createDispute.isPending ? (
          <ActivityIndicator size="small" color={colors.white} />
        ) : (
          <Text style={[styles.submitButtonText, toneStyles.submitButtonText]}>Submit Dispute</Text>
        )}
      </Pressable>
    </AppScrollDialog>
  );
}

interface DisputeDetailModalProps {
  visible: boolean;
  onDismiss: () => void;
  dispute: DisputeSummary;
  hasActiveDispute?: boolean;
}

export function DisputeDetailModal({
  visible,
  onDismiss,
  dispute,
  hasActiveDispute = false,
}: DisputeDetailModalProps) {
  const statusColor = getDisputeStatusColor(dispute.status);
  const isResolved = isResolvedDisputeStatus(dispute.status);

  return (
    <AppScrollDialog
      visible={visible}
      onDismiss={onDismiss}
      title={hasActiveDispute ? 'Dispute under review' : 'Dispute details'}
      subtitle={getDisputeStatusLabel(dispute.status)}
      tone={DISPUTE_DETAIL_TONE}
      headerIcon={CheckmarkCircle01Icon}
    >
      <View style={[styles.statusBadge, { backgroundColor: `${statusColor}18`, borderColor: `${statusColor}30` }]}>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        <Text style={[styles.statusBadgeText, { color: statusColor }]}>
          {getDisputeStatusLabel(dispute.status)}
        </Text>
      </View>

      <View style={styles.detailBlock}>
        <Text style={styles.detailLabel}>Category</Text>
        <Text style={styles.detailValue}>{getDisputeCategoryLabel(dispute.category)}</Text>
      </View>

      <View style={styles.detailBlock}>
        <Text style={styles.detailLabel}>Description</Text>
        <Text style={styles.detailValue}>{dispute.description}</Text>
      </View>

      <View style={styles.detailBlock}>
        <Text style={styles.detailLabel}>Submitted</Text>
        <Text style={styles.detailValue}>{formatDateTime(dispute.createdAt)}</Text>
      </View>

      {isResolved && dispute.resolutionNotes ? (
        <View style={styles.resolutionBlock}>
          <Text style={styles.resolutionTitle}>Resolution</Text>
          <Text style={styles.resolutionText}>{dispute.resolutionNotes}</Text>
          {dispute.resolvedAt ? (
            <Text style={styles.resolutionDate}>
              Resolved on {formatDateTime(dispute.resolvedAt)}
            </Text>
          ) : null}
        </View>
      ) : null}
    </AppScrollDialog>
  );
}

const styles = StyleSheet.create({
  fieldLabel: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 12,
    fontFamily: fonts.medium,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  charCount: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 16,
  },
  submitButton: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 15,
    fontFamily: fonts.semiBold,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.error,
    textAlign: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 16,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    fontWeight: '600',
  },
  detailBlock: {
    marginBottom: 14,
  },
  detailLabel: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  resolutionBlock: {
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  resolutionTitle: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    fontWeight: '600',
    color: getSemanticTone('success').foreground,
    marginBottom: 4,
  },
  resolutionText: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  resolutionDate: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginTop: 6,
  },
});
