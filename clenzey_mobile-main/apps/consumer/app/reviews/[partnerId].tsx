import { View, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import type { Review } from '@clenzey/types';
import { Text, Card } from 'react-native-paper';
import { colors } from '@clenzey/design-system';
import { reviewsApi } from '../../src/lib/api';

const PAGE_SIZE = 20;

export default function PartnerReviewsScreen() {
  const { partnerId } = useLocalSearchParams<{ partnerId: string }>();

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['reviews', 'partner', partnerId],
    queryFn: async ({ pageParam = 0 }) => {
      const response = await reviewsApi.listByPartner(partnerId!, {
        limit: PAGE_SIZE,
        offset: pageParam,
      });
      return response.data;
    },
    getNextPageParam: (lastPage, allPages) => {
      const currentOffset = allPages.length * PAGE_SIZE;
      return currentOffset < lastPage.total ? currentOffset : undefined;
    },
    initialPageParam: 0,
    enabled: !!partnerId,
  });

  const reviews = data?.pages.flatMap((page) => page.reviews) ?? [];
  const totalCount = data?.pages[0]?.total ?? 0;
  const averageRating = data?.pages[0]?.averageRating ?? 0;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text variant="bodyMedium" style={styles.errorText}>
          {error.message || 'Failed to load reviews'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.summaryCard}>
        <Text variant="displaySmall" style={styles.averageRating}>{averageRating.toFixed(1)}</Text>
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Text
              key={star}
              variant="headlineSmall"
              style={[
                styles.starIcon,
                averageRating >= star && styles.starFilled,
                averageRating >= star - 0.5 && averageRating < star && styles.starHalf,
              ]}
            >
              ★
            </Text>
          ))}
        </View>
        <Text variant="bodyMedium" style={styles.totalCount}>
          {totalCount} {totalCount === 1 ? 'review' : 'reviews'}
        </Text>
      </View>

      <FlatList
        data={reviews}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ReviewItem review={item} />}
        contentContainerStyle={styles.listContent}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isFetchingNextPage ? (
            <ActivityIndicator style={styles.footerLoader} color={colors.primary} />
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text variant="bodyMedium" style={styles.emptyText}>No reviews yet</Text>
          </View>
        }
      />
    </View>
  );
}

function ReviewItem({ review }: { review: Review }) {
  return (
    <Card style={styles.reviewCard} mode="outlined">
      <Card.Content>
        <View style={styles.reviewHeader}>
          <View style={styles.reviewStars}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Text key={star} variant="bodyMedium" style={[styles.reviewStarIcon, review.rating >= star && styles.starFilled]}>
                ★
              </Text>
            ))}
          </View>
          <Text variant="bodySmall" style={styles.reviewDate}>
            {new Date(review.createdAt).toLocaleDateString()}
          </Text>
        </View>
        {review.review && (
          <Text variant="bodyMedium" style={styles.reviewText}>{review.review}</Text>
        )}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 24 },
  errorText: { color: colors.error, textAlign: 'center' },
  summaryCard: { alignItems: 'center', padding: 24, backgroundColor: '#F0EDFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  averageRating: { fontWeight: '700', color: colors.textPrimary },
  starsRow: { flexDirection: 'row', marginTop: 4, gap: 2 },
  starIcon: { color: '#D1D5DB' },
  starFilled: { color: '#F59E0B' },
  starHalf: { color: '#FCD34D' },
  totalCount: { color: colors.textSecondary, marginTop: 8 },
  listContent: { padding: 16 },
  reviewCard: { marginBottom: 12 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  reviewStars: { flexDirection: 'row', gap: 2 },
  reviewStarIcon: { color: '#D1D5DB' },
  reviewDate: { color: colors.textSecondary },
  reviewText: { color: colors.textPrimary, lineHeight: 20 },
  emptyContainer: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { color: colors.textSecondary },
  footerLoader: { paddingVertical: 16 },
});
