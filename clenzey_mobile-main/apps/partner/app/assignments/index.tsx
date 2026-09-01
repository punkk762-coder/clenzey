import { useCallback, useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, ActivityIndicator, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Text } from 'react-native-paper';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { Task01Icon, Calendar01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { ScreenTitle, colors, IconCircle, DecoratedCard, fonts } from '@clenzey/design-system';
import type { Assignment } from '@clenzey/types';
import { createPartnersEndpoints } from '@clenzey/api-client';
import { apiClient } from '../../src/lib/api';

const partnersApi = createPartnersEndpoints(apiClient);

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function AssignmentListItem({ item, onPress }: { item: Assignment; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && styles.cardPressed]}>
      <DecoratedCard
        style={[styles.card, { borderLeftColor: colors.secondary, borderLeftWidth: 4 }]}
        contentStyle={styles.cardContent}
      >
        <View style={styles.cardHeader}>
          <Text variant="titleSmall" style={styles.serviceName} numberOfLines={1}>
            {item.booking?.bookingName ?? `Booking #${item.bookingId.slice(0, 8)}`}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: `${colors.secondary}18`, borderColor: `${colors.secondary}30` }]}>
            <Text style={[styles.statusLabel, { color: colors.secondary }]}>Pending</Text>
          </View>
        </View>
        {item.booking && (
          <Text variant="bodySmall" style={styles.addressText} numberOfLines={1}>
            {item.booking.consumerNotes ?? `Address: ${item.booking.addressId.slice(0, 8)}...`}
          </Text>
        )}
        <View style={styles.cardFooter}>
          <View style={styles.footerItem}>
            <HugeiconsIcon icon={Calendar01Icon} size={14} color={colors.textSecondary} strokeWidth={1.5} />
            <Text variant="bodySmall" style={styles.dateText}>{formatDate(item.createdAt)}</Text>
          </View>
          <View style={styles.viewDetails}>
            <Text style={styles.viewDetailsText}>
              {item.booking?.bookingType === 'SCHEDULED' ? 'Scheduled' : 'Instant'}
            </Text>
            <HugeiconsIcon icon={ArrowRight01Icon} size={16} color={colors.primary} strokeWidth={1.5} />
          </View>
        </View>
      </DecoratedCard>
    </Pressable>
  );
}

export default function AssignmentsScreen() {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const assignmentsQuery = useQuery({
    queryKey: ['assignments', 'pending'],
    queryFn: async () => {
      const response = await partnersApi.getAssignments();
      const assignments = (Array.isArray(response) ? response : []) as Assignment[];
      return assignments.filter((a) => a.status === 'PROPOSED');
    },
  });

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await assignmentsQuery.refetch();
    setIsRefreshing(false);
  }, [assignmentsQuery]);

  const renderItem = useCallback(
    ({ item }: { item: Assignment }) => (
      <AssignmentListItem item={item} onPress={() => router.push(`/assignments/${item.id}`)} />
    ),
    [router],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenTitle title="Pending Assignments" subtitle="Tap to view and respond" />

      {assignmentsQuery.isLoading && !assignmentsQuery.data ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={assignmentsQuery.data ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={[colors.primary]} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <IconCircle icon={Task01Icon} size={72} iconSize={36} backgroundColor={`${colors.tertiary}50`} />
              <Text variant="titleMedium" style={styles.emptyTitle}>No Pending Assignments</Text>
              <Text variant="bodySmall" style={styles.emptySubtitle}>
                New booking assignments will appear here when you are online.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16, paddingBottom: 32 },
  card: { marginBottom: 12 },
  cardPressed: { opacity: 0.92 },
  cardContent: { gap: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  serviceName: { color: colors.textPrimary, fontWeight: '600', fontFamily: fonts.semiBold, flex: 1, marginRight: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  statusLabel: { fontSize: 11, fontFamily: fonts.semiBold, fontWeight: '600' },
  addressText: { color: colors.textSecondary },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateText: { color: colors.textSecondary },
  viewDetails: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewDetailsText: { color: colors.primary, fontFamily: fonts.semiBold, fontSize: 13 },
  emptyContainer: { alignItems: 'center', paddingTop: 80, gap: 8, paddingHorizontal: 24 },
  emptyTitle: { color: colors.textPrimary, fontWeight: '700', fontFamily: fonts.bold },
  emptySubtitle: { color: colors.textSecondary, textAlign: 'center' },
});
