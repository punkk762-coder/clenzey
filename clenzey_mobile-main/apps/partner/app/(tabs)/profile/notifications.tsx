import { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, ActivityIndicator, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Text, Button } from 'react-native-paper';
import { Notification03Icon } from '@hugeicons/core-free-icons';
import { Toast, colors, IconCircle, SegmentTabs, DecoratedCard, fonts, getSemanticTone } from '@clenzey/design-system';
import { Notification } from '@clenzey/types';
import { notificationsApi } from '../../../src/lib/api';
import { navigateFromNotification } from '../../../src/services/notifications';

type FilterMode = 'all' | 'unread' | 'read';

export default function NotificationsScreen() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterMode>('all');
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const queryParams = {
    ...(filter === 'unread' ? { isRead: false } : {}),
    ...(filter === 'read' ? { isRead: true } : {}),
    limit: 50,
    offset: 0,
  };

  const { data: notifications, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['notifications', filter],
    queryFn: () => notificationsApi.list(queryParams),
    select: (response: { data?: Notification[] } | Notification[]) => {
      const data = Array.isArray(response) ? response : response?.data;
      return (data ?? []) as Notification[];
    },
  });

  const { data: unreadNotifications } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsApi.list({ isRead: false, limit: 100, offset: 0 }),
    select: (response: { data?: Notification[] } | Notification[]) => {
      const data = Array.isArray(response) ? response : response?.data;
      return (data ?? []) as Notification[];
    },
  });

  const unreadCount = unreadNotifications?.length ?? 0;
  const infoTone = getSemanticTone('info');

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setToastMessage('All notifications marked as read');
      setToastVisible(true);
    },
  });

  const handleNotificationPress = useCallback((notification: Notification) => {
    if (!notification.isRead) markReadMutation.mutate(notification.id);
    if (notification.metadata) navigateFromNotification(notification.metadata as Record<string, unknown>);
  }, [markReadMutation]);

  const formatTimestamp = (dateStr: string): string => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(dateStr).toLocaleDateString();
  };

  const renderItem = ({ item }: { item: Notification }) => (
    <Pressable onPress={() => handleNotificationPress(item)} style={({ pressed }) => [pressed && styles.cardPressed]}>
      <DecoratedCard
        style={[
          styles.notificationCard,
          !item.isRead && {
            backgroundColor: infoTone.background,
            borderColor: infoTone.border,
          },
        ]}
        contentStyle={styles.notificationContent}
      >
        <View style={styles.notificationHeader}>
          {!item.isRead && <View style={[styles.unreadDot, { backgroundColor: infoTone.foreground }]} />}
          <Text variant="titleSmall" style={[styles.notificationTitle, !item.isRead && styles.unreadText]} numberOfLines={1}>
            {item.title}
          </Text>
        </View>
        <Text variant="bodySmall" style={styles.notificationBody} numberOfLines={2}>{item.body}</Text>
        <Text variant="labelSmall" style={styles.notificationTime}>{formatTimestamp(item.createdAt)}</Text>
      </DecoratedCard>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.filterContainer}>
        <SegmentTabs
          value={filter}
          onValueChange={(v) => setFilter(v as FilterMode)}
          tabs={[
            { value: 'all', label: 'All' },
            { value: 'unread', label: unreadCount > 0 ? `Unread (${unreadCount})` : 'Unread' },
            { value: 'read', label: 'Read' },
          ]}
        />
        {unreadCount > 0 && (
          <Button mode="text" onPress={() => markAllReadMutation.mutate()} loading={markAllReadMutation.isPending} style={styles.markAllBtn}>
            Mark all as read
          </Button>
        )}
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={notifications ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <IconCircle icon={Notification03Icon} size={72} iconSize={36} backgroundColor={`${colors.tertiary}50`} />
              <Text variant="titleMedium" style={styles.emptyText}>
                {filter === 'unread' ? 'No unread notifications' : filter === 'read' ? 'No read notifications' : 'No notifications yet'}
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[colors.primary]} tintColor={colors.primary} />
          }
          contentContainerStyle={styles.listContent}
        />
      )}

      <Toast visible={toastVisible} message={toastMessage} variant="success" onDismiss={() => setToastVisible(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  filterContainer: { padding: 16, backgroundColor: colors.white, gap: 8 },
  markAllBtn: { alignSelf: 'flex-end' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16, paddingBottom: 32, flexGrow: 1, gap: 8 },
  notificationCard: { marginBottom: 8 },
  cardPressed: { opacity: 0.92 },
  notificationContent: { gap: 4 },
  notificationHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
  notificationTitle: { color: colors.textPrimary, flex: 1 },
  unreadText: { fontWeight: '700', fontFamily: fonts.bold },
  notificationBody: { color: colors.textSecondary },
  notificationTime: { color: colors.textSecondary, marginTop: 4 },
  emptyState: { alignItems: 'center', paddingTop: 64, gap: 12 },
  emptyText: { color: colors.textSecondary },
});
