import { useState, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Text, Button } from 'react-native-paper';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { Calendar01Icon, Location01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
import {
  ScreenTitle,
  colors,
  IconCircle,
  SegmentTabs,
  DecoratedCard,
  fonts,
} from '@clenzey/design-system';
import { sharedPaperStyles } from '../../../src/styles/paperControls';
import { createBookingsEndpoints } from '@clenzey/api-client';
import { Booking, BookingStatus } from '@clenzey/types';
import { apiClient } from '../../../src/lib/api';

const bookingsApi = createBookingsEndpoints(apiClient);
type Tab = 'active' | 'completed';
const PAGE_SIZE = 10;

const ACTIVE_STATUSES: BookingStatus[] = [
  'CONFIRMED',
  'PROFESSIONAL_ASSIGNED',
  'PROFESSIONAL_EN_ROUTE',
  'CHECKED_IN',
  'IN_PROGRESS',
];

interface PopulatedBooking extends Booking {
  service?: { name: string };
  address?: { label?: string; line1?: string; city?: string };
}

function getStatusLabel(status: BookingStatus): string {
  const labels: Partial<Record<BookingStatus, string>> = {
    CONFIRMED: 'Confirmed',
    PROFESSIONAL_ASSIGNED: 'Assigned',
    PROFESSIONAL_EN_ROUTE: 'En Route',
    CHECKED_IN: 'Checked In',
    IN_PROGRESS: 'In Progress',
    COMPLETED: 'Completed',
  };
  return labels[status] ?? status;
}

function getStatusColor(status: BookingStatus): string {
  switch (status) {
    case 'CONFIRMED':
    case 'PROFESSIONAL_ASSIGNED':
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

function getStatusTheme(status: BookingStatus) {
  const color = getStatusColor(status);
  return {
    color,
    backgroundColor: `${color}18`,
    borderColor: `${color}30`,
  };
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getAddressSummary(
  address?: { label?: string; line1?: string; city?: string },
): string | null {
  if (!address) return null;
  const parts = [address.label, address.city].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : address.line1 || null;
}

function BookingListItem({ booking, onPress }: { booking: PopulatedBooking; onPress: () => void }) {
  const statusTheme = getStatusTheme(booking.status);
  const serviceName = booking.service?.name || booking.bookingName || 'Booking';
  const addressSummary = getAddressSummary(booking.address);
  const displayDate = booking.scheduledAt
    ? formatDate(booking.scheduledAt)
    : formatDate(booking.createdAt);
  const dateLabel = booking.scheduledAt ? 'Scheduled' : 'Booked on';

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && styles.bookingCardPressed]}>
      <DecoratedCard
        style={[styles.bookingCard, { borderLeftColor: statusTheme.color, borderLeftWidth: 4 }]}
        contentStyle={styles.bookingCardContent}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleCol}>
            <Text style={styles.bookingName} numberOfLines={1}>
              {serviceName}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusTheme.backgroundColor, borderColor: statusTheme.borderColor }]}>
            <View style={[styles.statusDot, { backgroundColor: statusTheme.color }]} />
            <Text style={[styles.statusLabel, { color: statusTheme.color }]}>
              {getStatusLabel(booking.status)}
            </Text>
          </View>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.cardMeta}>
          <View style={styles.metaItem}>
            <View style={styles.metaIconWrap}>
              <HugeiconsIcon icon={Calendar01Icon} size={15} color={colors.primary} strokeWidth={1.5} />
            </View>
            <View style={styles.metaTextCol}>
              <Text style={styles.metaLabel}>{dateLabel}</Text>
              <Text style={styles.metaValue}>{displayDate}</Text>
            </View>
          </View>

          {addressSummary ? (
            <View style={styles.metaItem}>
              <View style={styles.metaIconWrap}>
                <HugeiconsIcon icon={Location01Icon} size={15} color={colors.primary} strokeWidth={1.5} />
              </View>
              <View style={styles.metaTextCol}>
                <Text style={styles.metaLabel}>Location</Text>
                <Text style={styles.metaValue} numberOfLines={1}>
                  {addressSummary}
                </Text>
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.cardFooter}>
          {booking.totalAmount > 0 ? (
            <View>
              <Text style={styles.amountLabel}>Total</Text>
              <Text style={styles.amount}>₹{booking.totalAmount.toLocaleString('en-IN')}</Text>
            </View>
          ) : (
            <View />
          )}
          <View style={styles.viewDetails}>
            <Text style={styles.viewDetailsText}>View details</Text>
            <HugeiconsIcon icon={ArrowRight01Icon} size={16} color={colors.primary} strokeWidth={1.5} />
          </View>
        </View>
      </DecoratedCard>
    </Pressable>
  );
}

export default function BookingsListScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('active');

  const statusFilter = activeTab === 'active' ? ACTIVE_STATUSES.join(',') : 'COMPLETED';

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: ['partner-bookings', activeTab],
    queryFn: async ({ pageParam = 0 }) => {
      const response = await bookingsApi.list({ status: statusFilter, limit: PAGE_SIZE, offset: pageParam });
      const result = (response as { data?: { bookings: PopulatedBooking[]; total: number } })?.data ?? response;
      return {
        bookings: (result as { bookings?: PopulatedBooking[] })?.bookings ?? [],
        total: (result as { total?: number })?.total ?? 0,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const totalFetched = allPages.reduce((sum, page) => sum + page.bookings.length, 0);
      return totalFetched < lastPage.total ? totalFetched : undefined;
    },
  });

  const bookings = (data?.pages.flatMap((page) => page.bookings) as PopulatedBooking[]) ?? [];

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleBookingPress = useCallback(
    (bookingId: string) => router.push(`/(tabs)/bookings/${bookingId}`),
    [router],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenTitle title="Bookings" subtitle="Your assigned jobs" />

      <View style={styles.segmentWrap}>
        <SegmentTabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as Tab)}
          tabs={[
            { value: 'active', label: 'Active' },
            { value: 'completed', label: 'Completed' },
          ]}
        />
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : isError ? (
        <View style={styles.centered}>
          <Text variant="bodyLarge" style={styles.errorText}>Failed to load bookings</Text>
          <Button
            mode="contained"
            compact
            onPress={() => refetch()}
            contentStyle={sharedPaperStyles.buttonContent}
          >
            Retry
          </Button>
        </View>
      ) : bookings.length === 0 ? (
        <View style={styles.centered}>
          <IconCircle icon={Calendar01Icon} size={72} iconSize={36} backgroundColor={`${colors.tertiary}50`} />
          <Text variant="titleMedium" style={styles.emptyTitle}>
            {activeTab === 'active' ? 'No active bookings' : 'No completed bookings'}
          </Text>
          <Text variant="bodySmall" style={styles.emptySubtitle}>
            {activeTab === 'active'
              ? 'New bookings will appear here once assigned.'
              : 'Completed bookings will appear here.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <BookingListItem booking={item} onPress={() => handleBookingPress(item.id)} />
          )}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator size="small" color={colors.primary} style={styles.footer} />
            ) : null
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefetching && !isFetchingNextPage}
              onRefresh={refetch}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  segmentWrap: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.white },
  listContent: { padding: 16, paddingBottom: 88 },
  bookingCard: { marginBottom: 14 },
  bookingCardPressed: { opacity: 0.92 },
  bookingCardContent: { gap: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  cardTitleCol: { flex: 1 },
  bookingName: { color: colors.textPrimary, fontFamily: fonts.semiBold, fontWeight: '600', fontSize: 15 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusLabel: { fontSize: 11, fontFamily: fonts.semiBold, fontWeight: '600' },
  cardDivider: { height: 1, backgroundColor: colors.surfaceVariant },
  cardMeta: { gap: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  metaIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: `${colors.primary}10`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaTextCol: { flex: 1 },
  metaLabel: { color: colors.textSecondary, fontSize: 11, fontFamily: fonts.medium },
  metaValue: { color: colors.textPrimary, fontSize: 13, fontFamily: fonts.semiBold, marginTop: 1 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  amountLabel: { color: colors.textSecondary, fontSize: 11, fontFamily: fonts.medium },
  amount: { color: colors.primary, fontFamily: fonts.bold, fontWeight: '700', fontSize: 15 },
  viewDetails: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewDetailsText: { color: colors.primary, fontFamily: fonts.semiBold, fontSize: 13 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
  errorText: { color: colors.error, marginBottom: 8 },
  emptyTitle: { color: colors.textPrimary, fontWeight: '700', fontFamily: fonts.bold, marginTop: 8 },
  emptySubtitle: { color: colors.textSecondary, textAlign: 'center' },
  footer: { paddingVertical: 16 },
});
