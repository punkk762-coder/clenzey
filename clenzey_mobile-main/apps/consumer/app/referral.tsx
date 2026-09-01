import { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Share,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { Text, TextInput, Button } from 'react-native-paper';
import { HugeiconsIcon } from '@hugeicons/react-native';
import {
  Copy01Icon,
  Share01Icon,
  Coupon01Icon,
  CheckmarkCircle01Icon,
  UserCircleIcon,
} from '@hugeicons/core-free-icons';
import type { ReferralReward } from '@clenzey/types';
import { colors, IconCircle, DecoratedCard, Toast, fonts } from '@clenzey/design-system';
import { sharedPaperStyles } from '../src/styles/paperControls';
import { useMyReferral } from '../src/hooks/useMyReferral';
import { useApplyReferral, normalizeReferralCode } from '../src/hooks/useApplyReferral';
import { formatCurrency } from '../src/utils/booking-response';

function formatRewardDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getRewardTitle(role: ReferralReward['role']): string {
  return role === 'REFEREE' ? 'Welcome bonus' : 'Friend referral reward';
}

function getRewardSubtitle(role: ReferralReward['role']): string {
  return role === 'REFEREE'
    ? 'You applied a friend\'s code'
    : 'A friend used your code';
}

function RewardCard({ reward }: { reward: ReferralReward }) {
  const isExpired = new Date(reward.validUntil).getTime() < Date.now();
  const isUsed = reward.redeemed;

  return (
    <View style={styles.rewardCard}>
      <View style={styles.rewardHeader}>
        <View style={styles.rewardHeaderText}>
          <Text style={styles.rewardTitle}>{getRewardTitle(reward.role)}</Text>
          <Text style={styles.rewardSubtitle}>{getRewardSubtitle(reward.role)}</Text>
        </View>
        <Text style={styles.rewardAmount}>
          {formatCurrency(reward.discountValue)} off
        </Text>
      </View>

      <View style={styles.rewardMeta}>
        <Text style={styles.rewardCode}>{reward.couponCode}</Text>
        <Text style={styles.rewardMetaText}>
          Min order {formatCurrency(reward.minOrderAmount)} · Valid till {formatRewardDate(reward.validUntil)}
        </Text>
      </View>

      {isUsed ? (
        <Text style={styles.rewardStatusUsed}>Redeemed</Text>
      ) : isExpired ? (
        <Text style={styles.rewardStatusExpired}>Expired</Text>
      ) : (
        <Text style={styles.rewardStatusActive}>Use at checkout</Text>
      )}
    </View>
  );
}

export default function ReferralScreen() {
  const { data, isLoading, isRefetching, refetch, error: loadError } = useMyReferral();
  const {
    apply,
    isApplying,
    error: applyError,
    alreadyApplied,
    lastReward,
    reset: resetApply,
  } = useApplyReferral();

  const [friendCode, setFriendCode] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const referralCode = data?.referralCode ?? '';
  const hasAppliedReferral = data?.hasAppliedReferral ?? false;
  const applyDisabled = hasAppliedReferral || alreadyApplied;

  useEffect(() => {
    if (lastReward) setFriendCode('');
  }, [lastReward]);

  const handleCopyCode = async () => {
    if (!referralCode) return;
    await Clipboard.setStringAsync(referralCode);
    setToastMessage('Referral code copied to clipboard');
    setToastVisible(true);
  };

  const handleShare = async () => {
    if (!data?.shareMessage) return;
    try {
      await Share.share({ message: data.shareMessage });
    } catch {}
  };

  const handleApplyCode = () => {
    apply(friendCode);
  };

  const handleFriendCodeChange = (text: string) => {
    setFriendCode(normalizeReferralCode(text));
    if (applyError) resetApply();
  };

  if (isLoading && !data) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        >
          {loadError ? (
            <DecoratedCard style={styles.errorCard} contentStyle={styles.errorCardContent}>
              <Text style={styles.errorText}>Failed to load referral details. Pull down to retry.</Text>
              <Button mode="outlined" compact onPress={() => refetch()} style={styles.retryButton}>
                Retry
              </Button>
            </DecoratedCard>
          ) : null}

          <View style={styles.headerCopy}>
            <Text style={styles.headerTitle}>Your referral code</Text>
            <Text style={styles.headerSubtitle}>
              Share your code with friends and earn ₹200 when they join Clenzey
            </Text>
          </View>

          <DecoratedCard style={styles.codeCard} contentStyle={styles.codeCardContent}>
            <View style={styles.codeHero}>
              <IconCircle
                icon={Coupon01Icon}
                size={48}
                iconSize={24}
                backgroundColor={colors.tertiary + '50'}
              />
              <View style={styles.codeHeroText}>
                <Text style={styles.codeLabel}>YOUR CODE</Text>
                <Text style={styles.codeText}>{referralCode || '—'}</Text>
              </View>
            </View>

            <View style={styles.codeActions}>
              <Button
                mode="outlined"
                compact
                onPress={handleCopyCode}
                disabled={!referralCode}
                style={styles.actionBtn}
                contentStyle={styles.btnContent}
                labelStyle={styles.btnLabel}
                icon={() => (
                  <HugeiconsIcon icon={Copy01Icon} size={16} color={colors.primary} strokeWidth={1.5} />
                )}
              >
                Copy
              </Button>
              <Button
                mode="contained"
                compact
                onPress={handleShare}
                disabled={!data?.shareMessage}
                style={styles.actionBtn}
                contentStyle={styles.btnContent}
                labelStyle={styles.btnLabel}
                icon={() => (
                  <HugeiconsIcon icon={Share01Icon} size={16} color={colors.white} strokeWidth={1.5} />
                )}
              >
                Share
              </Button>
            </View>
          </DecoratedCard>

          {data?.rewards.referralsMade.length ? (
            <DecoratedCard style={styles.statsCard} contentStyle={styles.statsCardContent}>
              <View style={styles.statsRow}>
                <IconCircle
                  icon={UserCircleIcon}
                  size={36}
                  iconSize={18}
                  backgroundColor={colors.tertiary + '40'}
                />
                <View style={styles.statsText}>
                  <Text style={styles.statsValue}>{data.rewards.referralsMade.length}</Text>
                  <Text style={styles.statsLabel}>
                    {data.rewards.referralsMade.length === 1 ? 'friend joined' : 'friends joined'}
                  </Text>
                </View>
              </View>
            </DecoratedCard>
          ) : null}

          {hasAppliedReferral && data?.appliedReferral ? (
            <DecoratedCard style={styles.appliedCard} contentStyle={styles.appliedCardContent}>
              <View style={styles.appliedRow}>
                <HugeiconsIcon icon={CheckmarkCircle01Icon} size={20} color={colors.success} strokeWidth={1.5} />
                <View style={styles.appliedText}>
                  <Text style={styles.appliedTitle}>Referral code applied</Text>
                  <Text style={styles.appliedSubtitle}>
                    {data.appliedReferral.referralCode} · {formatRewardDate(data.appliedReferral.appliedAt)}
                  </Text>
                </View>
              </View>
            </DecoratedCard>
          ) : (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Have a referral code?</Text>
                <Text style={styles.sectionSubtitle}>
                  Enter a friend's code to get ₹200 off your first booking (min ₹799)
                </Text>
              </View>

              <DecoratedCard style={styles.applyCard} contentStyle={styles.applyCardContent}>
                <TextInput
                  label="Referral Code"
                  value={friendCode}
                  onChangeText={handleFriendCodeChange}
                  mode="outlined"
                  dense
                  autoCapitalize="characters"
                  maxLength={32}
                  disabled={applyDisabled}
                  error={!!applyError}
                  style={styles.input}
                  contentStyle={styles.inputContent}
                  outlineStyle={styles.inputOutline}
                  outlineColor={colors.tertiary}
                  activeOutlineColor={colors.primary}
                />
                {applyError ? <Text style={styles.inlineError}>{applyError}</Text> : null}
                {lastReward ? (
                  <Text style={styles.applySuccess}>
                    Reward unlocked: {lastReward.couponCode} — {formatCurrency(lastReward.discountValue)} off
                  </Text>
                ) : null}

                <Button
                  mode="contained"
                  compact
                  onPress={handleApplyCode}
                  loading={isApplying}
                  disabled={applyDisabled || !friendCode.trim()}
                  style={styles.applyButton}
                  contentStyle={styles.btnContent}
                  labelStyle={styles.btnLabel}
                >
                  Apply Code
                </Button>
              </DecoratedCard>
            </>
          )}

          {data?.rewards.received.length ? (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Your rewards</Text>
                <Text style={styles.sectionSubtitle}>
                  Personal coupons earned from referrals — use them at checkout
                </Text>
              </View>

              <View style={styles.rewardsList}>
                {data.rewards.received.map((reward) => (
                  <RewardCard key={reward.couponCode} reward={reward} />
                ))}
              </View>
            </>
          ) : null}

          <DecoratedCard style={styles.rulesCard} contentStyle={styles.rulesCardContent}>
            <Text style={styles.rulesTitle}>How rewards work</Text>
            <Text style={styles.rulesItem}>
              • Apply a friend's code: ₹200 off your first booking (min ₹799, valid 90 days)
            </Text>
            <Text style={styles.rulesItem}>
              • When a friend uses your code: you get ₹200 off any booking (min ₹799, valid 90 days)
            </Text>
            <Text style={styles.rulesItem}>
              • Each reward is a one-time personal coupon — not the shared REFER200 promo code
            </Text>
          </DecoratedCard>
        </ScrollView>
      </KeyboardAvoidingView>

      <Toast
        visible={toastVisible}
        message={toastMessage}
        variant="success"
        onDismiss={() => setToastVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  flex: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32, gap: 16 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { paddingTop: 4, paddingBottom: 4 },
  headerTitle: {
    color: colors.textPrimary,
    fontFamily: fonts.bold,
    fontWeight: '700',
    fontSize: 13,
  },
  headerSubtitle: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
    lineHeight: 16,
    fontFamily: fonts.regular,
  },
  codeCard: { marginBottom: 0 },
  codeCardContent: { gap: 16 },
  codeHero: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  codeHeroText: { flex: 1 },
  codeLabel: {
    color: colors.textSecondary,
    fontSize: 9,
    fontFamily: fonts.semiBold,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  codeText: {
    color: colors.primary,
    fontFamily: fonts.bold,
    fontWeight: '700',
    fontSize: 22,
    letterSpacing: 1.5,
    marginTop: 4,
  },
  codeActions: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, borderRadius: 10 },
  statsCard: { marginBottom: 0 },
  statsCardContent: { paddingVertical: 4 },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statsText: { flex: 1 },
  statsValue: {
    color: colors.textPrimary,
    fontFamily: fonts.bold,
    fontWeight: '700',
    fontSize: 18,
  },
  statsLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontFamily: fonts.regular,
  },
  appliedCard: { marginBottom: 0 },
  appliedCardContent: { gap: 0 },
  appliedRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  appliedText: { flex: 1 },
  appliedTitle: {
    color: colors.textPrimary,
    fontFamily: fonts.semiBold,
    fontWeight: '600',
    fontSize: 12,
  },
  appliedSubtitle: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
    fontFamily: fonts.regular,
  },
  sectionHeader: { gap: 2, paddingTop: 4 },
  sectionTitle: {
    color: colors.textPrimary,
    fontFamily: fonts.bold,
    fontWeight: '700',
    fontSize: 13,
  },
  sectionSubtitle: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 16,
    fontFamily: fonts.regular,
  },
  applyCard: { marginBottom: 0 },
  applyCardContent: { gap: 8 },
  input: { backgroundColor: colors.chipInactive, ...sharedPaperStyles.input },
  inputContent: sharedPaperStyles.inputContent,
  inputOutline: { borderRadius: 10 },
  inlineError: {
    color: colors.error,
    fontSize: 11,
    fontFamily: fonts.regular,
    marginLeft: 4,
  },
  applySuccess: {
    color: colors.success,
    fontSize: 11,
    fontFamily: fonts.regular,
    marginLeft: 4,
  },
  applyButton: { borderRadius: 10, marginTop: 4 },
  rewardsList: { gap: 10 },
  rewardCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.tertiary + '60',
    gap: 8,
  },
  rewardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  rewardHeaderText: { flex: 1 },
  rewardTitle: {
    color: colors.textPrimary,
    fontFamily: fonts.semiBold,
    fontWeight: '600',
    fontSize: 12,
  },
  rewardSubtitle: {
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 2,
    fontFamily: fonts.regular,
  },
  rewardAmount: {
    color: colors.primary,
    fontFamily: fonts.bold,
    fontWeight: '700',
    fontSize: 12,
  },
  rewardMeta: { gap: 2 },
  rewardCode: {
    color: colors.textPrimary,
    fontFamily: fonts.semiBold,
    fontWeight: '600',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  rewardMetaText: {
    color: colors.textSecondary,
    fontSize: 10,
    fontFamily: fonts.regular,
  },
  rewardStatusActive: {
    color: colors.success,
    fontSize: 10,
    fontFamily: fonts.semiBold,
    fontWeight: '600',
  },
  rewardStatusUsed: {
    color: colors.textSecondary,
    fontSize: 10,
    fontFamily: fonts.semiBold,
    fontWeight: '600',
  },
  rewardStatusExpired: {
    color: colors.error,
    fontSize: 10,
    fontFamily: fonts.semiBold,
    fontWeight: '600',
  },
  rulesCard: { marginBottom: 0 },
  rulesCardContent: { gap: 6 },
  rulesTitle: {
    color: colors.textPrimary,
    fontFamily: fonts.semiBold,
    fontWeight: '600',
    fontSize: 12,
  },
  rulesItem: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 16,
    fontFamily: fonts.regular,
  },
  errorCard: { marginBottom: 0 },
  errorCardContent: { gap: 10, alignItems: 'flex-start' },
  errorText: {
    color: colors.error,
    fontSize: 12,
    fontFamily: fonts.regular,
  },
  retryButton: { borderRadius: 10 },
  btnContent: sharedPaperStyles.buttonContent,
  btnLabel: sharedPaperStyles.buttonLabel,
});
