import { useCallback, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Text, Switch, Button } from 'react-native-paper';
import { HugeiconsIcon } from '@hugeicons/react-native';
import {
  AnalyticsUpIcon,
  Calendar01Icon,
  CheckListIcon,
  ArrowRight01Icon,
} from '@hugeicons/core-free-icons';
import { ScreenTitle, colors, IconCircle, materialStyle, fonts } from '@clenzey/design-system';
import { sharedPaperStyles } from '../../src/styles/paperControls';
import { createPartnersEndpoints, createBookingsEndpoints } from '@clenzey/api-client';
import { useAuthStore } from '../../src/store/auth';
import { apiClient } from '../../src/lib/api';
import { useLocationTracking } from '../../src/hooks/useLocationTracking';

const partnersApi = createPartnersEndpoints(apiClient);
const bookingsApi = createBookingsEndpoints(apiClient);

export default function DashboardScreen() {
  const { user, setUser } = useAuthStore();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [optimisticOnline, setOptimisticOnline] = useState<boolean | null>(null);

  const isOnline = optimisticOnline ?? user?.isOnline ?? false;
  useLocationTracking(isOnline);

  const onlineStatusMutation = useMutation({
    mutationFn: (newStatus: boolean) => partnersApi.setOnlineStatus(newStatus),
    onMutate: (newStatus) => setOptimisticOnline(newStatus),
    onSuccess: (_data, newStatus) => {
      if (user) setUser({ ...user, isOnline: newStatus });
      setOptimisticOnline(null);
    },
    onError: () => {
      setOptimisticOnline(null);
      Alert.alert('Error', 'Failed to update online status. Please try again.');
    },
  });

  const assignmentsQuery = useQuery({
    queryKey: ['assignments', 'active'],
    queryFn: async () => {
      const response = await partnersApi.getAssignments();
      const assignments = (Array.isArray(response) ? response : []) as Array<{ status: string }>;
      return assignments.filter((a) => a.status === 'PROPOSED');
    },
  });

  const todayBookingsQuery = useQuery({
    queryKey: ['bookings', 'today'],
    queryFn: async () => {
      const response = await bookingsApi.list({ limit: 100, offset: 0 });
      const result = response as unknown as { bookings: Array<{ status: string; createdAt: string }> };
      const bookings = result?.bookings ?? [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return bookings.filter((b) => {
        const bookingDate = new Date(b.createdAt);
        return bookingDate >= today && bookingDate < tomorrow;
      });
    },
  });

  const activeAssignmentCount = assignmentsQuery.data?.length ?? 0;
  const todayBookings = todayBookingsQuery.data ?? [];
  const completedToday = todayBookings.filter((b) => b.status === 'COMPLETED').length;
  const activeToday = todayBookings.filter(
    (b) => b.status !== 'COMPLETED' && b.status !== 'CANCELLED',
  ).length;

  const handleToggle = useCallback(
    (value: boolean) => onlineStatusMutation.mutate(value),
    [onlineStatusMutation],
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['assignments', 'active'] }),
      queryClient.invalidateQueries({ queryKey: ['bookings', 'today'] }),
    ]);
    setIsRefreshing(false);
  }, [queryClient]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenTitle
        title={`Hello, ${user?.fullName?.split(' ')[0] ?? 'Partner'}`}
        subtitle="Manage your workday from here"
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Online Toggle */}
        <Card style={[styles.toggleCard, materialStyle('card')]} mode="elevated">
          <Card.Content style={styles.toggleContent}>
            <View style={styles.toggleLeft}>
              <View style={styles.toggleLabelRow}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: isOnline ? colors.success : '#9CA3AF' },
                  ]}
                />
                <Text variant="titleMedium" style={styles.toggleLabel}>
                  {isOnline ? 'You are Online' : 'You are Offline'}
                </Text>
              </View>
              <Text variant="bodySmall" style={styles.toggleDescription}>
                {isOnline
                  ? 'Receiving new assignments'
                  : 'Go online to receive assignments'}
              </Text>
            </View>
            <Switch
              value={isOnline}
              onValueChange={handleToggle}
              disabled={onlineStatusMutation.isPending}
              color={colors.success}
            />
          </Card.Content>
        </Card>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <Card
            style={[styles.statCard, materialStyle('card')]}
            mode="elevated"
            onPress={() => router.push('/assignments')}
          >
            <Card.Content style={styles.statContent}>
              <IconCircle icon={CheckListIcon} size={40} iconSize={20} backgroundColor={colors.tertiary + '60'} />
              <Text variant="headlineMedium" style={styles.statCount}>
                {activeAssignmentCount}
              </Text>
              <Text variant="labelMedium" style={styles.statLabel}>
                Pending
              </Text>
            </Card.Content>
          </Card>

          <Card style={[styles.statCard, materialStyle('card')]} mode="elevated">
            <Card.Content style={styles.statContent}>
              <IconCircle icon={Calendar01Icon} size={40} iconSize={20} backgroundColor={colors.tertiary + '60'} />
              <Text variant="headlineMedium" style={styles.statCount}>
                {todayBookings.length}
              </Text>
              <Text variant="labelMedium" style={styles.statLabel}>
                Today
              </Text>
            </Card.Content>
          </Card>

          <Card style={[styles.statCard, materialStyle('card')]} mode="elevated">
            <Card.Content style={styles.statContent}>
              <IconCircle icon={AnalyticsUpIcon} size={40} iconSize={20} backgroundColor={colors.tertiary + '60'} />
              <Text variant="headlineMedium" style={styles.statCount}>
                {completedToday}
              </Text>
              <Text variant="labelMedium" style={styles.statLabel}>
                Done
              </Text>
            </Card.Content>
          </Card>
        </View>

        {/* Today's Summary */}
        <Card style={[styles.summaryCard, materialStyle('card')]} mode="elevated">
          <Card.Content>
            <Text variant="titleSmall" style={styles.summaryTitle}>
              Today's Overview
            </Text>
            <View style={styles.summaryRow}>
              <View style={styles.summaryStat}>
                <Text variant="headlineSmall" style={styles.summaryCount}>{activeToday}</Text>
                <Text variant="bodySmall" style={styles.summaryLabel}>Active</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryStat}>
                <Text variant="headlineSmall" style={styles.summaryCount}>{completedToday}</Text>
                <Text variant="bodySmall" style={styles.summaryLabel}>Completed</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryStat}>
                <Text variant="headlineSmall" style={styles.summaryCount}>{todayBookings.length}</Text>
                <Text variant="bodySmall" style={styles.summaryLabel}>Total</Text>
              </View>
            </View>
            <Button
              mode="text"
              onPress={() => router.push('/assignments')}
              icon={() => (
                <HugeiconsIcon icon={ArrowRight01Icon} size={16} color={colors.primary} strokeWidth={1.5} />
              )}
              contentStyle={[styles.viewAllContent, sharedPaperStyles.buttonContent]}
            >
              View Assignments
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  scrollContent: { padding: 16, paddingBottom: 88 },
  toggleCard: { marginBottom: 16, borderRadius: 16, backgroundColor: colors.white },
  toggleContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleLeft: { flex: 1, marginRight: 12 },
  toggleLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  toggleLabel: { color: colors.textPrimary, fontWeight: '700', fontFamily: fonts.bold },
  toggleDescription: { color: colors.textSecondary, marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, borderRadius: 14, backgroundColor: colors.white },
  statContent: { alignItems: 'center', paddingVertical: 8, gap: 4 },
  statCount: { color: colors.primary, fontWeight: '700', fontFamily: fonts.bold },
  statLabel: { color: colors.textSecondary, fontFamily: fonts.medium },
  summaryCard: { borderRadius: 16, backgroundColor: colors.white },
  summaryTitle: { color: colors.textPrimary, fontWeight: '700', fontFamily: fonts.bold, marginBottom: 12 },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryStat: { flex: 1, alignItems: 'center' },
  summaryCount: { color: colors.primary, fontWeight: '700', fontFamily: fonts.bold },
  summaryLabel: { color: colors.textSecondary, marginTop: 2 },
  summaryDivider: { width: 1, height: 36, backgroundColor: colors.surfaceVariant },
  viewAllContent: { flexDirection: 'row-reverse', justifyContent: 'center' },
});
