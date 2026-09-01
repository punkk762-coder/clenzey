import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { BookingStatus } from '@clenzey/types';
import { Text, Button as PaperButton } from 'react-native-paper';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { Calendar01Icon, Location01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { TabScreenHeader, ScreenTitle, colors, IconCircle, SegmentTabs, DecoratedCard, fonts, Button } from '@clenzey/design-system';
import { sharedPaperStyles } from '../../../src/styles/paperControls';
import { bookingsApi } from '../../../src/lib/api';
import {
  getBookingReference,
  getServiceName,
  normalizeBookingsListResponse,
  type PopulatedBooking,
} from '../../../src/utils/booking-response';
import { useLocationHeader } from '../../../src/hooks/useSelectedAddress';
import { getBookingStatusLabel } from '../../../src/utils/booking-status';
import { ShimmerPlaceholder } from '../../../src/components/ShimmerPlaceholder';

const PAGE_SIZE = 10;
type BookingTab = 'all' | 'active' | 'completed' | 'cancelled';

const ACTIVE_STATUSES: BookingStatus[] = [
  'PENDING',
  'PAYMENT_PENDING',
  'CONFIRMED',
  'PROFESSIONAL_ASSIGNED',
  'PROFESSIONAL_EN_ROUTE',
  'CHECKED_IN',
  'IN_PROGRESS',
];

const ACTIVE_STATUS_SET = new Set<BookingStatus>(ACTIVE_STATUSES);

function getStatusFilter(tab: BookingTab): string | undefined {
  switch (tab) {
    case 'completed':
      return 'COMPLETED';
    case 'cancelled':
      return 'CANCELLED';
    default:
      return undefined;
  }
}


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

function getAddressSummary(booking: PopulatedBooking): string | null {
  if (booking.addressSnapshot?.trim()) {
    return booking.addressSnapshot.trim();
  }
  return getAddressSummaryFromObject(booking.address);
}

function getAddressSummaryFromObject(address?: { label?: string; line1?: string; city?: string }): string | null {
  if (!address) return null;
  const parts = [address.label, address.city].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : address.line1 || null;
}

function BookingListItem({ booking, onPress }: { booking: PopulatedBooking; onPress: () => void }) {
  const statusTheme = getStatusTheme(booking.status);
  const serviceName = getServiceName(booking);
  const addressSummary = getAddressSummary(booking);
  const displayDate = booking.scheduledAt ? formatDate(booking.scheduledAt) : formatDate(booking.createdAt);
  const dateLabel = booking.scheduledAt ? 'Scheduled' : 'Booked on';
  const bookingReference = getBookingReference(booking);

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
            <Text style={styles.bookingId}>{bookingReference}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusTheme.backgroundColor, borderColor: statusTheme.borderColor }]}>
            <View style={[styles.statusDot, { backgroundColor: statusTheme.color }]} />
            <Text style={[styles.statusLabel, { color: statusTheme.color }]}>
              {getBookingStatusLabel(booking.status)}
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

function ShimmerBookingCards() {
  return (
    <View style={styles.shimmerContainer}>
      {[1, 2, 3].map((i) => (
        <ShimmerPlaceholder key={i} width={'100%' as unknown as number} height={168} borderRadius={14} style={{ marginBottom: 14 }} />
      ))}
    </View>
  );
}

function isBookingTab(value: string | undefined): value is BookingTab {
  return value === 'all' || value === 'active' || value === 'completed' || value === 'cancelled';
}

export default function BookingsScreen() {
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const [activeTab, setActiveTab] = useState<BookingTab>('all');
  const router = useRouter();
  const { location, locationSubtitle, onLocationPress } = useLocationHeader();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError, refetch, isRefetching, isFetched } =
    useInfiniteQuery({
      queryKey: ['bookings', activeTab],
      queryFn: async ({ pageParam = 0 }) => {
        const status = getStatusFilter(activeTab);
        const response = await bookingsApi.list({
          ...(status ? { status } : {}),
          limit: PAGE_SIZE,
          offset: pageParam,
        });
        return normalizeBookingsListResponse(response);
      },
      initialPageParam: 0,
      getNextPageParam: (lastPage, allPages) => {
        if (!lastPage?.bookings) return undefined;
        const totalFetched = allPages.reduce((sum, page) => sum + (page?.bookings?.length ?? 0), 0);
        return totalFetched < lastPage.total ? totalFetched : undefined;
      },
      staleTime: 0,
      refetchOnMount: 'always',
    });

  useEffect(() => {
    if (isBookingTab(tab)) {
      setActiveTab(tab);
    }
  }, [tab]);

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  const bookings = useMemo(() => {
    const all = (data?.pages.flatMap((page) => page?.bookings ?? []) as PopulatedBooking[]) ?? [];
    if (activeTab === 'active') {
      return all.filter((booking) => ACTIVE_STATUS_SET.has(booking.status));
    }
    return all;
  }, [data, activeTab]);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleBookingPress = useCallback(
    (bookingId: string) => router.push(`/(tabs)/bookings/${bookingId}`),
    [router],
  );

  const handleCreateBooking = useCallback(() => router.replace('/(tabs)'), [router]);

  const emptyMessage =
    activeTab === 'all'
      ? "You don't have any bookings yet."
      : activeTab === 'active'
        ? "You don't have any active bookings."
        : activeTab === 'completed'
          ? 'No completed bookings yet.'
          : 'No cancelled bookings.';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <TabScreenHeader
        location={location}
        locationSubtitle={locationSubtitle}
        onLocationPress={onLocationPress}
        backgroundColor={colors.white}
      />
      <ScreenTitle title="My Bookings" subtitle="Track and manage your services" />

      <View style={styles.segmentWrap}>
        <SegmentTabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as BookingTab)}
          tabs={[
            { value: 'all', label: 'All' },
            { value: 'active', label: 'Active' },
            { value: 'completed', label: 'Completed' },
            { value: 'cancelled', label: 'Cancelled' },
          ]}
          variant="plain"
          size="xs"
        />
      </View>

      {isLoading && !isFetched ? (
        <ShimmerBookingCards />
      ) : isError ? (
        <View style={styles.centered}>
          <Text variant="bodyLarge" style={styles.errorText}>Failed to load bookings</Text>
          <PaperButton mode="contained" compact onPress={() => refetch()} style={styles.retryBtn} contentStyle={styles.btnContent}>
            Retry
          </PaperButton>
        </View>
      ) : bookings.length === 0 ? (
        <View style={styles.centered}>
          <IconCircle icon={Calendar01Icon} size={72} iconSize={36} backgroundColor={colors.tertiary + '50'} />
          <Text variant="titleMedium" style={styles.emptyTitle}>No bookings yet</Text>
          <Text variant="bodySmall" style={styles.emptySubtitle}>{emptyMessage}</Text>
          <Button
            title="Book a Service"
            onPress={handleCreateBooking}
            style={styles.createBtn}
          />
        </View>
      ) : (
        <FlatList
          data={bookings}
          renderItem={({ item }) => (
            <BookingListItem booking={item} onPress={() => handleBookingPress(item.id)} />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
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
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.white },
  segmentWrap: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.white },
  segmented: {},
  listContent: { padding: 16, paddingBottom: 100, backgroundColor: colors.white, gap: 14 },
  bookingCard: { marginBottom: 0 },
  bookingCardPressed: { opacity: 0.92, transform: [{ scale: 0.995 }] },
  bookingCardContent: { paddingVertical: 16, paddingHorizontal: 16, gap: 14 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  cardTitleCol: { flex: 1, minWidth: 0, gap: 4 },
  bookingName: {
    color: colors.textPrimary,
    fontFamily: fonts.bold,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 21,
  },
  bookingId: {
    color: colors.textSecondary,
    fontFamily: fonts.medium,
    fontSize: 11,
    letterSpacing: 0.4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    flexShrink: 0,
    maxWidth: '46%',
  },
  statusDot: { width: 5, height: 5, borderRadius: 2.5, flexShrink: 0 },
  statusLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.1,
    lineHeight: 12,
    flexShrink: 1,
    textAlign: 'right',
  },
  cardDivider: { height: 1, backgroundColor: colors.surfaceVariant },
  cardMeta: { gap: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  metaIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  metaTextCol: { flex: 1, minWidth: 0, gap: 2 },
  metaLabel: {
    color: colors.textSecondary,
    fontFamily: fonts.medium,
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  metaValue: {
    color: colors.textPrimary,
    fontFamily: fonts.semiBold,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  amountLabel: {
    color: colors.textSecondary,
    fontFamily: fonts.medium,
    fontSize: 11,
    marginBottom: 2,
  },
  amount: {
    color: colors.primary,
    fontFamily: fonts.bold,
    fontSize: 18,
    fontWeight: '700',
  },
  viewDetails: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewDetailsText: {
    color: colors.primary,
    fontFamily: fonts.semiBold,
    fontSize: 12,
    fontWeight: '600',
  },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, backgroundColor: colors.white, gap: 8 },
  errorText: { color: colors.error, marginBottom: 8 },
  retryBtn: { borderRadius: 10 },
  emptyTitle: { color: colors.textPrimary, fontWeight: '700', marginTop: 8 },
  emptySubtitle: { color: colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 12 },
  createBtn: {
    marginTop: 20,
    minWidth: 168,
    borderRadius: 10,
  },
  btnContent: sharedPaperStyles.buttonContent,
  footer: { paddingVertical: 16 },
  shimmerContainer: { padding: 16, backgroundColor: colors.white },
});
