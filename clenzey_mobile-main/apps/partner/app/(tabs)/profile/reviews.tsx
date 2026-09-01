import { View, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Text, Card } from 'react-native-paper';
import { colors, materialStyle, fonts } from '@clenzey/design-system';
import { Review } from '@clenzey/types';
import { useAuthStore } from '../../../src/store/auth';
import { reviewsApi } from '../../../src/lib/api';

export default function ReviewsScreen() {
  const { user } = useAuthStore();
  const partnerId = user?.id;

  const reviewsQuery = useQuery({
    queryKey: ['partner-reviews', partnerId],
    queryFn: async () => {
      const response = await reviewsApi.listByPartner(partnerId!, { limit: 50, offset: 0 });
      return (response as any)?.data ?? response;
    },
    enabled: !!partnerId,
  });

  const data = reviewsQuery.data as { reviews: Review[]; total: number; averageRating: number } | undefined;
  const reviews = data?.reviews ?? [];
  const total = data?.total ?? 0;
  const averageRating = data?.averageRating ?? 0;

  const renderStars = (rating: number) => '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating));

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const renderReview = ({ item }: { item: Review }) => (
    <Card style={[styles.reviewCard, materialStyle('card')]} mode="elevated">
      <Card.Content>
        <View style={styles.reviewHeader}>
          <Text variant="bodyMedium" style={styles.reviewStars}>{renderStars(item.rating)}</Text>
          <Text variant="bodySmall" style={styles.reviewDate}>{formatDate(item.createdAt)}</Text>
        </View>
        {item.review ? (
          <Text variant="bodyMedium" style={styles.reviewText}>{item.review}</Text>
        ) : (
          <Text variant="bodyMedium" style={styles.reviewNoText}>No written review</Text>
        )}
      </Card.Content>
    </Card>
  );

  if (reviewsQuery.isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text variant="bodyMedium" style={styles.loadingText}>Loading reviews...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Card style={[styles.summaryCard, materialStyle('card')]} mode="elevated">
        <Card.Content style={styles.summaryContent}>
          <Text variant="displaySmall" style={styles.averageRating}>{averageRating.toFixed(1)}</Text>
          <Text variant="headlineSmall" style={styles.averageStars}>{renderStars(averageRating)}</Text>
          <Text variant="bodyMedium" style={styles.totalReviews}>
            {total} {total === 1 ? 'review' : 'reviews'}
          </Text>
        </Card.Content>
      </Card>

      {reviews.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text variant="bodyLarge" style={styles.emptyText}>No reviews yet</Text>
        </View>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item) => item.id}
          renderItem={renderReview}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface, paddingTop: 8 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: colors.textSecondary },
  summaryCard: { marginHorizontal: 16, marginBottom: 16, backgroundColor: colors.white, borderRadius: 16 },
  summaryContent: { alignItems: 'center', paddingVertical: 8 },
  averageRating: { fontWeight: '700', fontFamily: fonts.bold, color: colors.primary },
  averageStars: { color: colors.secondary, marginTop: 4 },
  totalReviews: { color: colors.textSecondary, marginTop: 4 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 32 },
  emptyText: { color: colors.textSecondary },
  listContent: { paddingHorizontal: 16, paddingBottom: 32 },
  reviewCard: { marginBottom: 8, backgroundColor: colors.white, borderRadius: 14 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  reviewStars: { color: colors.secondary },
  reviewDate: { color: colors.textSecondary },
  reviewText: { color: colors.textPrimary, lineHeight: 20 },
  reviewNoText: { color: colors.textSecondary, fontStyle: 'italic' },
});
