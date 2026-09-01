import { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Constants from 'expo-constants';
import { Text, Button, TextInput, Divider } from 'react-native-paper';
import { HugeiconsIcon } from '@hugeicons/react-native';
import {
  UserCircleIcon,
  Location01Icon,
  Notification03Icon,
  Logout01Icon,
  Coupon01Icon,
  Edit02Icon,
  CustomerSupportIcon,
  File01Icon,
  SecurityLockIcon,
  Shield01Icon,
} from '@hugeicons/core-free-icons';
import {
  TabScreenHeader,
  MenuRow,
  DecoratedCard,
  colors,
  IconCircle,
  fonts,
  BottomSheet,
} from '@clenzey/design-system';
import { sharedPaperStyles } from '../../../src/styles/paperControls';
import { useAuthStore } from '../../../src/store/auth';
import { useLocationHeader } from '../../../src/hooks/useSelectedAddress';
import { consumersApi, notificationsApi } from '../../../src/lib/api';
import { normalizeNotificationsListResponse } from '../../../src/utils/notification-response';
import { normalizeConsumer } from '../../../src/utils/consumer-response';
import { formatPhone, formatMemberSince, getInitials } from '../../../src/utils/format';
import { ShimmerPlaceholder } from '../../../src/components/ShimmerPlaceholder';
import { AppConfirmDialog } from '../../../src/components/AppConfirmDialog';
import { AppDialog } from '../../../src/components/AppDialog';
import { openWhatsAppSupport } from '../../../src/utils/support';

const profileSchema = z.object({
  fullName: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
});

type ProfileFormData = z.infer<typeof profileSchema>;

function ProfileAvatar({ name, size = 72 }: { name?: string; size?: number }) {
  const hasName = Boolean(name?.trim()) && name !== 'Not set';

  if (!hasName) {
    return (
      <IconCircle
        icon={UserCircleIcon}
        size={size}
        iconSize={40}
        backgroundColor={colors.chipInactive}
        color={colors.primary}
      />
    );
  }

  return (
    <View
      style={[
        styles.avatarCircle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      <Text style={[styles.avatarInitials, { fontSize: size * 0.34 }]}>
        {getInitials(name)}
      </Text>
    </View>
  );
}

function ProfileShimmer() {
  return (
    <>
      <DecoratedCard>
        <View style={styles.shimmerRow}>
          <ShimmerPlaceholder width={72} height={72} borderRadius={36} />
          <View style={styles.shimmerInfo}>
            <ShimmerPlaceholder width={140} height={16} borderRadius={4} />
            <ShimmerPlaceholder width={120} height={12} borderRadius={4} style={{ marginTop: 8 }} />
            <ShimmerPlaceholder width={90} height={11} borderRadius={4} style={{ marginTop: 6 }} />
          </View>
        </View>
        <ShimmerPlaceholder
          width={'100%' as unknown as number}
          height={36}
          borderRadius={10}
          style={{ marginTop: 16 }}
        />
      </DecoratedCard>

      <DecoratedCard contentStyle={styles.menuContent}>
        <ShimmerPlaceholder width={70} height={13} borderRadius={4} style={{ marginLeft: 8, marginBottom: 8 }} />
        {[0, 1, 2].map((index) => (
          <View key={index} style={styles.shimmerMenuRow}>
            <ShimmerPlaceholder width={36} height={36} borderRadius={18} />
            <ShimmerPlaceholder width={120} height={14} borderRadius={4} />
          </View>
        ))}
      </DecoratedCard>
    </>
  );
}

export default function ProfileScreen() {
  const { user, setUser, logout } = useAuthStore();
  const { location, locationSubtitle, onLocationPress } = useLocationHeader();
  const [editSheetVisible, setEditSheetVisible] = useState(false);
  const [logoutDialogVisible, setLogoutDialogVisible] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [errorVisible, setErrorVisible] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data: profile, isLoading: isFetching, isRefetching, refetch } = useQuery({
    queryKey: ['consumer', 'profile'],
    queryFn: async () => {
      const response = await consumersApi.getProfile();
      const consumer = normalizeConsumer(response);
      setUser(consumer);
      return consumer;
    },
  });

  const { data: unreadNotifications } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsApi.list({ isRead: false, limit: 50, offset: 0 }),
    select: normalizeNotificationsListResponse,
  });

  const unreadCount =
    unreadNotifications?.unreadCount ?? unreadNotifications?.notifications.length ?? 0;
  const displayUser = profile ?? user;
  const memberSince = displayUser?.createdAt ? formatMemberSince(displayUser.createdAt) : '';
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  const { control, handleSubmit, reset, formState: { errors } } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: displayUser?.fullName ?? '' },
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: ProfileFormData) => consumersApi.updateProfile(data),
    onSuccess: (response) => {
      setUser(normalizeConsumer(response));
      queryClient.invalidateQueries({ queryKey: ['consumer', 'profile'] });
      setEditSheetVisible(false);
      setSuccessVisible(true);
    },
    onError: () => setErrorVisible(true),
  });

  const onSubmit = (data: ProfileFormData) => updateProfileMutation.mutate(data);

  const handleEdit = useCallback(() => {
    reset({ fullName: displayUser?.fullName ?? '' });
    setEditSheetVisible(true);
  }, [displayUser?.fullName, reset]);

  const handleCancelEdit = useCallback(() => {
    reset({ fullName: displayUser?.fullName ?? '' });
    setEditSheetVisible(false);
  }, [displayUser?.fullName, reset]);

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      refetch(),
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] }),
    ]);
  }, [queryClient, refetch]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <TabScreenHeader location={location} locationSubtitle={locationSubtitle} onLocationPress={onLocationPress} />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {isFetching && !displayUser ? (
          <ProfileShimmer />
        ) : (
          <>
            <DecoratedCard style={styles.profileCard}>
              <View style={styles.avatarRow}>
                <ProfileAvatar name={displayUser?.fullName} />
                <View style={styles.avatarInfo}>
                  <Text style={styles.userName}>
                    {displayUser?.fullName || 'Not set'}
                  </Text>
                  <Text style={styles.userPhone}>
                    {displayUser?.phone ? formatPhone(displayUser.phone) : '—'}
                  </Text>
                  {memberSince ? (
                    <Text style={styles.memberSince}>Member since {memberSince}</Text>
                  ) : null}
                </View>
              </View>

              <Button
                mode="contained"
                compact
                onPress={handleEdit}
                style={styles.editButton}
                contentStyle={styles.editButtonContent}
                labelStyle={styles.btnLabel}
                icon={() => (
                  <HugeiconsIcon icon={Edit02Icon} size={16} color={colors.white} strokeWidth={1.5} />
                )}
              >
                Edit Profile
              </Button>
            </DecoratedCard>

            <DecoratedCard style={styles.menuCard} contentStyle={styles.menuContent}>
              <Text style={styles.sectionLabel}>Account</Text>
              <MenuRow
                compact
                title="My Addresses"
                icon={Location01Icon}
                onPress={() => router.push('/(tabs)/profile/addresses')}
              />
              <Divider style={styles.menuDivider} />
              <MenuRow
                compact
                title="Notifications"
                icon={Notification03Icon}
                badge={unreadCount}
                onPress={() => router.push('/(tabs)/profile/notifications')}
              />
              <Divider style={styles.menuDivider} />
              <MenuRow
                compact
                title="Refer & Earn"
                icon={Coupon01Icon}
                onPress={() => router.push('/referral')}
              />
            </DecoratedCard>

            <DecoratedCard style={styles.menuCard} contentStyle={styles.menuContent}>
              <Text style={styles.sectionLabel}>Support</Text>
              <MenuRow
                compact
                title="Terms & Condition"
                icon={File01Icon}
                onPress={() => router.push('/legal/terms')}
              />
              <Divider style={styles.menuDivider} />
              <MenuRow
                compact
                title="Privacy Policy"
                icon={SecurityLockIcon}
                onPress={() => router.push('/legal/privacy')}
              />
              <Divider style={styles.menuDivider} />
              <MenuRow
                compact
                title="Safety Guarantee"
                icon={Shield01Icon}
                onPress={() => router.push('/legal/safety-guarantee')}
              />
              <Divider style={styles.menuDivider} />
              <MenuRow
                compact
                title="Help & Support"
                icon={CustomerSupportIcon}
                onPress={openWhatsAppSupport}
              />
            </DecoratedCard>

            <Button
              mode="outlined"
              compact
              onPress={() => setLogoutDialogVisible(true)}
              textColor={colors.error}
              style={styles.logoutBtn}
              contentStyle={styles.btnContent}
              labelStyle={styles.logoutLabel}
              icon={() => (
                <HugeiconsIcon icon={Logout01Icon} size={16} color={colors.error} strokeWidth={1.5} />
              )}
            >
              Logout
            </Button>

            <Text style={styles.versionText}>Clenzey v{appVersion}</Text>
          </>
        )}
      </ScrollView>

      <BottomSheet visible={editSheetVisible} onClose={handleCancelEdit}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Text style={styles.sheetTitle}>Edit Profile</Text>
          <Text style={styles.sheetSubtitle}>Update your display name</Text>

          <Controller
            control={control}
            name="fullName"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Full Name"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={!!errors.fullName}
                mode="outlined"
                outlineStyle={styles.inputOutline}
                dense
                autoCapitalize="words"
                autoFocus
                style={styles.input}
                contentStyle={styles.inputContent}
              />
            )}
          />
          {errors.fullName ? (
            <Text style={styles.errorText}>{errors.fullName.message}</Text>
          ) : null}

          <View style={styles.sheetActions}>
            <Button
              mode="outlined"
              compact
              onPress={handleCancelEdit}
              style={styles.sheetActionBtn}
              contentStyle={styles.btnContent}
              labelStyle={styles.btnLabel}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              compact
              onPress={handleSubmit(onSubmit)}
              loading={updateProfileMutation.isPending}
              style={styles.sheetActionBtn}
              contentStyle={styles.btnContent}
              labelStyle={styles.btnLabel}
            >
              Save
            </Button>
          </View>
        </KeyboardAvoidingView>
      </BottomSheet>

      <AppConfirmDialog
        visible={logoutDialogVisible}
        onDismiss={() => setLogoutDialogVisible(false)}
        onConfirm={() => {
          setLogoutDialogVisible(false);
          logout();
        }}
        title="Logout"
        message="Are you sure you want to logout?"
        confirmLabel="Logout"
        cancelLabel="Cancel"
        confirmVariant="destructive"
        iconType="logout"
      />

      <AppDialog
        visible={successVisible}
        onDismiss={() => setSuccessVisible(false)}
        title="Profile Updated"
        message="Your profile has been updated successfully."
        type="success"
      />

      <AppDialog
        visible={errorVisible}
        onDismiss={() => setErrorVisible(false)}
        title="Update Failed"
        message="Failed to update profile. Please try again."
        type="error"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface },
  container: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 16, paddingBottom: 100, gap: 16 },
  profileCard: { marginBottom: 0 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatarCircle: {
    backgroundColor: colors.chipInactive,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.primary + '22',
  },
  avatarInitials: {
    color: colors.primary,
    fontFamily: fonts.bold,
    fontWeight: '700',
  },
  avatarInfo: { marginLeft: 16, flex: 1 },
  userName: {
    color: colors.textPrimary,
    fontFamily: fonts.bold,
    fontWeight: '700',
    fontSize: 20,
    marginBottom: 4,
  },
  userPhone: {
    color: colors.textSecondary,
    fontSize: 14,
    fontFamily: fonts.regular,
  },
  memberSince: {
    color: colors.textSecondary,
    fontSize: 12,
    fontFamily: fonts.regular,
    marginTop: 4,
  },
  input: { backgroundColor: colors.chipInactive, marginBottom: 4, ...sharedPaperStyles.input },
  inputContent: sharedPaperStyles.inputContent,
  inputOutline: { borderRadius: 10 },
  errorText: { color: colors.error, marginBottom: 8, fontSize: 11 },
  btnContent: sharedPaperStyles.buttonContent,
  btnLabel: sharedPaperStyles.buttonLabel,
  editButton: { marginTop: 4, borderRadius: 10 },
  editButtonContent: sharedPaperStyles.buttonContent,
  menuCard: { marginBottom: 0 },
  menuContent: { paddingVertical: 10, paddingHorizontal: 8 },
  sectionLabel: {
    color: colors.textPrimary,
    fontFamily: fonts.bold,
    fontWeight: '700',
    fontSize: 13,
    marginBottom: 4,
    marginLeft: 8,
  },
  menuDivider: { marginVertical: 0, backgroundColor: '#F1F5F9' },
  logoutBtn: {
    borderColor: colors.error + '55',
    backgroundColor: colors.white,
    borderRadius: 10,
    marginTop: 4,
  },
  logoutLabel: { fontSize: 14, fontWeight: '600' },
  versionText: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 12,
    fontFamily: fonts.regular,
    marginTop: -4,
  },
  sheetTitle: {
    color: colors.textPrimary,
    fontFamily: fonts.bold,
    fontWeight: '700',
    fontSize: 18,
    marginBottom: 4,
  },
  sheetSubtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    fontFamily: fonts.regular,
    marginBottom: 16,
  },
  sheetActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  sheetActionBtn: {
    flex: 1,
    borderRadius: 10,
  },
  shimmerRow: { flexDirection: 'row', alignItems: 'center' },
  shimmerInfo: { marginLeft: 16, flex: 1 },
  shimmerMenuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
});
