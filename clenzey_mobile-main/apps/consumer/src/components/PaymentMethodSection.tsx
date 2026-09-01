import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { HugeiconsIcon } from '@hugeicons/react-native';
import {
  Cash01Icon,
  CheckmarkCircle01Icon,
  CreditCardAcceptIcon,
} from '@hugeicons/core-free-icons';
import type { PaymentMode } from '@clenzey/types';
import { colors, fonts, materialStyle } from '@clenzey/design-system';

interface PaymentMethodSectionProps {
  paymentMode: PaymentMode;
  onSelectOnline: () => void;
  onSelectCash: () => void;
}

const PAYMENT_OPTIONS: Array<{
  value: PaymentMode;
  title: string;
  description: string;
  icon: typeof CreditCardAcceptIcon;
}> = [
  {
    value: 'RAZORPAY',
    title: 'Pay Online',
    description: 'UPI, cards & net banking via Razorpay',
    icon: CreditCardAcceptIcon,
  },
  {
    value: 'CASH',
    title: 'Pay in Cash',
    description: 'Pay your partner directly after service',
    icon: Cash01Icon,
  },
];

export function PaymentMethodSection({
  paymentMode,
  onSelectOnline,
  onSelectCash,
}: PaymentMethodSectionProps) {
  const handlers: Record<PaymentMode, () => void> = {
    RAZORPAY: onSelectOnline,
    CASH: onSelectCash,
  };

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIconWrap}>
          <HugeiconsIcon icon={CreditCardAcceptIcon} size={20} color={colors.primary} strokeWidth={1.5} />
        </View>
        <Text variant="titleSmall" style={styles.sectionTitle}>Payment Method</Text>
      </View>

      <View style={styles.paymentRow}>
        {PAYMENT_OPTIONS.map((option) => {
          const isActive = paymentMode === option.value;
          return (
            <Pressable
              key={option.value}
              style={({ pressed }) => [
                styles.paymentCard,
                isActive && styles.paymentCardActive,
                pressed && styles.pressed,
              ]}
              onPress={handlers[option.value]}
              accessibilityRole="radio"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`${option.title}. ${option.description}`}
            >
              {isActive ? (
                <View style={styles.paymentCheckmark}>
                  <HugeiconsIcon icon={CheckmarkCircle01Icon} size={16} color={colors.primary} strokeWidth={2} />
                </View>
              ) : null}
              <View
                style={[
                  styles.paymentIconWrap,
                  isActive && styles.paymentIconWrapActive,
                ]}
              >
                <HugeiconsIcon
                  icon={option.icon}
                  size={22}
                  color={isActive ? colors.white : colors.primary}
                  strokeWidth={1.5}
                />
              </View>
              <Text style={[styles.paymentTitle, isActive && styles.paymentTitleActive]}>
                {option.title}
              </Text>
              <Text style={[styles.paymentDesc, isActive && styles.paymentDescActive]}>
                {option.description}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontWeight: '600',
    color: colors.textPrimary,
  },
  paymentRow: {
    flexDirection: 'row',
    gap: 12,
  },
  paymentCard: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: colors.white,
    minHeight: 148,
    position: 'relative',
    ...materialStyle('card'),
  },
  paymentCardActive: {
    borderColor: colors.primary,
    backgroundColor: '#F8FAFF',
  },
  pressed: {
    opacity: 0.92,
  },
  paymentCheckmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 1,
  },
  paymentIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  paymentIconWrapActive: {
    backgroundColor: colors.primary,
  },
  paymentTitle: {
    fontSize: 14,
    fontFamily: fonts.bold,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  paymentTitleActive: {
    color: colors.primary,
  },
  paymentDesc: {
    fontSize: 11,
    lineHeight: 16,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
  paymentDescActive: {
    color: '#4B5563',
  },
});
