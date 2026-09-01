import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Text, Button, List, Divider } from 'react-native-paper';
import { HugeiconsIcon } from '@hugeicons/react-native';
import {
  UserCircleIcon,
  Calendar01Icon,
  Notification03Icon,
  SparklesIcon,
  Logout01Icon,
} from '@hugeicons/core-free-icons';
import { ScreenTitle, MenuRow, colors, IconCircle, materialStyle, fonts } from '@clenzey/design-system';
import { Notification } from '@clenzey/types';
import { useAuthStore } from '../../../src/store/auth';
import { notificationsApi } from '../../../src/lib/api';
import { useState } from 'react';
import { AppConfirmDialog } from '../../../src/components/AppConfirmDialog';
import { sharedPaperStyles } from '../../../src/styles/paperControls';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const [logoutVisible, setLogoutVisible] = useState(false);

  const { data: notifications } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsApi.list({ isRead: false, limit: 50, offset: 0 }),
    select: (response: { data?: Notification[] } | Notification[]) => {
      const data = Array.isArray(response) ? response : response?.data;
      return (data ?? []) as Notification[];
    },
  });

  const unreadCount = notifications?.length ?? 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenTitle title="Profile" subtitle="Manage your account" />

      <View style={styles.content}>
        <View style={[styles.profileCard, materialStyle('card')]}>
          <IconCircle icon={UserCircleIcon} size={64} iconSize={36} />
          <View style={styles.profileInfo}>
            <Text variant="titleMedium" style={styles.name}>
              {user?.fullName ?? 'Partner'}
            </Text>
            <Text variant="bodySmall" style={styles.phone}>
              {user?.phone ?? ''}
            </Text>
          </View>
        </View>

        <View style={[styles.menuCard, materialStyle('card')]}>
          <List.Section>
            <List.Subheader style={styles.menuHeader}>Settings</List.Subheader>
            <MenuRow
              title="Availability"
              icon={Calendar01Icon}
              onPress={() => router.push('/(tabs)/profile/availability')}
            />
            <Divider />
            <MenuRow
              title="Notifications"
              icon={Notification03Icon}
              badge={unreadCount}
              onPress={() => router.push('/(tabs)/profile/notifications')}
            />
            <Divider />
            <MenuRow
              title="Reviews"
              icon={SparklesIcon}
              onPress={() => router.push('/(tabs)/profile/reviews')}
            />
          </List.Section>
        </View>

        <Button
          mode="outlined"
          compact
          onPress={() => setLogoutVisible(true)}
          textColor={colors.error}
          style={styles.logoutBtn}
          contentStyle={sharedPaperStyles.buttonContent}
          icon={() => (
            <HugeiconsIcon icon={Logout01Icon} size={18} color={colors.error} strokeWidth={1.5} />
          )}
        >
          Logout
        </Button>
      </View>

      <AppConfirmDialog
        visible={logoutVisible}
        onDismiss={() => setLogoutVisible(false)}
        onConfirm={() => {
          setLogoutVisible(false);
          logout();
        }}
        title="Logout"
        message="Are you sure you want to logout?"
        confirmLabel="Logout"
        confirmVariant="destructive"
        iconType="logout"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 16, paddingBottom: 88, flex: 1 },
  profileCard: {
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
  },
  profileInfo: { flex: 1 },
  name: { color: colors.textPrimary, fontWeight: '700', fontFamily: fonts.bold },
  phone: { color: colors.textSecondary, marginTop: 2 },
  menuCard: { marginBottom: 16, borderRadius: 16, backgroundColor: colors.white, overflow: 'hidden' },
  menuHeader: { color: colors.textPrimary, fontWeight: '700', fontFamily: fonts.bold },
  logoutBtn: { borderColor: colors.error, borderRadius: 10 },
});
