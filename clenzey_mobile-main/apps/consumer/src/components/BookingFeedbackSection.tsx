import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { SparklesIcon, Alert02Icon, CheckmarkCircle01Icon } from '@hugeicons/core-free-icons';
import type { BookingDisputeStatus, BookingStatus } from '@clenzey/types';
import { colors, DecoratedCard, fonts, MenuRow } from '@clenzey/design-system';
import { ReviewPromptModal } from './ReviewPrompt';
import {
  DisputeCreateModal,
  DisputeDetailModal,
  useBookingDisputeStatus,
} from './DisputeSection';

interface BookingFeedbackSectionProps {
  bookingId: string;
  bookingStatus: BookingStatus;
  hasReview?: boolean;
  canSubmitReview?: boolean;
  disputeStatus?: BookingDisputeStatus;
}

export function BookingFeedbackSection({
  bookingId,
  bookingStatus,
  hasReview = false,
  canSubmitReview,
  disputeStatus: bookingDisputeStatus,
}: BookingFeedbackSectionProps) {
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [disputeCreateOpen, setDisputeCreateOpen] = useState(false);
  const [disputeDetailOpen, setDisputeDetailOpen] = useState(false);

  const {
    data: disputeStatus,
    isLoading: isDisputeLoading,
  } = useBookingDisputeStatus(bookingId, bookingStatus, bookingDisputeStatus);

  const showReview =
    bookingStatus === 'COMPLETED' &&
    !hasReview &&
    canSubmitReview !== false;

  const canRaiseDispute = disputeStatus?.canRaiseDispute === true;
  const hasDispute = disputeStatus?.dispute != null;
  const hasActiveDispute = disputeStatus?.hasActiveDispute === true;

  const showSection = showReview || canRaiseDispute || hasDispute;

  if (!showSection) {
    if (isDisputeLoading && ['COMPLETED', 'CANCELLED'].includes(bookingStatus)) {
      return null;
    }
    return null;
  }

  return (
    <>
      <DecoratedCard style={styles.card} contentStyle={styles.cardContent}>
        <Text style={styles.title}>Support & feedback</Text>
        <View style={styles.rows}>
          {showReview ? (
            <MenuRow
              title="Rate this service"
              icon={SparklesIcon}
              tone="success"
              onPress={() => setReviewModalOpen(true)}
              compact
            />
          ) : null}

          {canRaiseDispute ? (
            <MenuRow
              title="Report an issue"
              icon={Alert02Icon}
              tone="warning"
              onPress={() => setDisputeCreateOpen(true)}
              compact
            />
          ) : null}

          {hasDispute && disputeStatus?.dispute ? (
            <MenuRow
              title={hasActiveDispute ? 'Dispute under review' : 'View dispute'}
              icon={CheckmarkCircle01Icon}
              tone="info"
              onPress={() => setDisputeDetailOpen(true)}
              compact
            />
          ) : null}
        </View>
      </DecoratedCard>

      {showReview ? (
        <ReviewPromptModal
          visible={reviewModalOpen}
          onDismiss={() => setReviewModalOpen(false)}
          bookingId={bookingId}
        />
      ) : null}

      {canRaiseDispute ? (
        <DisputeCreateModal
          visible={disputeCreateOpen}
          onDismiss={() => setDisputeCreateOpen(false)}
          bookingId={bookingId}
        />
      ) : null}

      {hasDispute && disputeStatus?.dispute ? (
        <DisputeDetailModal
          visible={disputeDetailOpen}
          onDismiss={() => setDisputeDetailOpen(false)}
          dispute={disputeStatus.dispute}
          hasActiveDispute={hasActiveDispute}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
  },
  cardContent: {
    paddingTop: 16,
    paddingBottom: 8,
    paddingHorizontal: 12,
  },
  title: {
    fontSize: 15,
    fontFamily: fonts.bold,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  rows: {
    marginTop: 4,
    gap: 0,
  },
});
