import { useState } from 'react';
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Text as RNText,
} from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Text } from 'react-native-paper';
import { SparklesIcon } from '@hugeicons/core-free-icons';
import { colors, fonts, getSemanticTone } from '@clenzey/design-system';
import { reviewsApi } from '../lib/api';
import type { PopulatedBooking } from '../utils/booking-response';
import { AppScrollDialog } from './AppScrollDialog';
import { getDialogToneStyles } from '../utils/dialog-tone-styles';

const REVIEW_TONE = 'success' as const;

interface ReviewPromptModalProps {
  visible: boolean;
  onDismiss: () => void;
  bookingId: string;
  onSubmitted?: () => void;
}

export function ReviewPromptModal({
  visible,
  onDismiss,
  bookingId,
  onSubmitted,
}: ReviewPromptModalProps) {
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const queryClient = useQueryClient();

  const createReview = useMutation({
    mutationFn: () =>
      reviewsApi.create({
        bookingId,
        rating,
        review: reviewText.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.setQueryData(['bookings', bookingId], (current: unknown) => {
        if (!current || typeof current !== 'object') return current;
        const booking = current as PopulatedBooking;
        return {
          ...booking,
          hasReview: true,
          reviewStatus: {
            ...booking.reviewStatus,
            hasReview: true,
            canSubmitReview: false,
          },
        };
      });
      queryClient.invalidateQueries({ queryKey: ['bookings', bookingId] });
      setRating(0);
      setReviewText('');
      onSubmitted?.();
      onDismiss();
    },
  });

  const handleDismiss = () => {
    if (createReview.isPending) return;
    onDismiss();
  };

  const toneStyles = getDialogToneStyles(REVIEW_TONE);
  const ratingColor = getSemanticTone('warning').foreground;

  return (
    <AppScrollDialog
      visible={visible}
      onDismiss={handleDismiss}
      title="Rate this service"
      subtitle="How was your experience? Tap a star to rate."
      tone={REVIEW_TONE}
      headerIcon={SparklesIcon}
    >
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Pressable
            key={star}
            onPress={() => setRating(star)}
            style={styles.starButton}
            accessibilityRole="button"
            accessibilityLabel={`Rate ${star} star${star > 1 ? 's' : ''}`}
            accessibilityState={{ selected: rating >= star }}
          >
            <RNText style={[styles.starIcon, rating >= star && { color: ratingColor }]}>★</RNText>
          </Pressable>
        ))}
      </View>

      <TextInput
        style={styles.textInput}
        placeholder="Share your experience (optional)"
        placeholderTextColor="#9CA3AF"
        value={reviewText}
        onChangeText={setReviewText}
        maxLength={1000}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
        accessibilityLabel="Review text"
      />
      <Text style={styles.charCount}>{reviewText.length}/1000</Text>

      {createReview.isError ? (
        <Text style={styles.errorText}>Failed to submit review. Please try again.</Text>
      ) : null}

      <Pressable
        style={[
          styles.submitButton,
          toneStyles.submitButton,
          (rating === 0 || createReview.isPending) && toneStyles.submitButtonDisabled,
        ]}
        onPress={() => createReview.mutate()}
        disabled={rating === 0 || createReview.isPending}
        accessibilityRole="button"
        accessibilityLabel="Submit Review"
      >
        {createReview.isPending ? (
          <ActivityIndicator size="small" color={colors.white} />
        ) : (
          <RNText style={[styles.submitButtonText, toneStyles.submitButtonText]}>Submit Review</RNText>
        )}
      </Pressable>
    </AppScrollDialog>
  );
}

const styles = StyleSheet.create({
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 8,
  },
  starButton: {
    padding: 4,
  },
  starIcon: {
    fontSize: 36,
    color: '#D1D5DB',
  },
  textInput: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.black,
    minHeight: 96,
    marginBottom: 4,
  },
  charCount: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    textAlign: 'right',
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
});
