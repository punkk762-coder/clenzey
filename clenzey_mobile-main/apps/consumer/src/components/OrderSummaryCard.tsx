import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { CreditCardAcceptIcon, Invoice01Icon } from '@hugeicons/core-free-icons';
import { colors, DecoratedCard } from '@clenzey/design-system';
import type { EstimateResult } from '../hooks/useEstimate';
import { ShimmerPlaceholder } from './ShimmerPlaceholder';

interface OrderSummaryCardProps {
  estimate?: EstimateResult;
  isLoading?: boolean;
  placeholderText?: string;
}

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function OrderSummaryCard({
  estimate,
  isLoading = false,
  placeholderText = 'Select options to see pricing',
}: OrderSummaryCardProps) {
  const itemCount = estimate?.breakdown.length ?? 0;

  return (
    <DecoratedCard style={styles.card} contentStyle={styles.cardContent}>
      <View style={styles.header}>
        <View style={styles.headerIconWrap}>
          <HugeiconsIcon icon={CreditCardAcceptIcon} size={16} color={colors.white} strokeWidth={2} />
        </View>
        <View style={styles.headerTextCol}>
          <Text style={styles.headerTitle}>Price Breakdown</Text>
          {estimate ? (
            <Text style={styles.headerSubtitle}>
              {itemCount} line item{itemCount === 1 ? '' : 's'}
            </Text>
          ) : null}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingBody}>
          <ShimmerPlaceholder width="100%" height={36} borderRadius={10} />
          <ShimmerPlaceholder width="100%" height={36} borderRadius={10} />
          <ShimmerPlaceholder width="55%" height={44} borderRadius={12} style={styles.loadingTotal} />
        </View>
      ) : estimate ? (
        <>
          <View style={styles.breakdownList}>
            {estimate.breakdown.map((item, idx) => (
              <View
                key={`${item.label}-${idx}`}
                style={[styles.breakdownRow, idx % 2 === 0 && styles.breakdownRowAlt]}
              >
                <View style={styles.breakdownLeft}>
                  <View
                    style={[
                      styles.breakdownDot,
                      item.isDiscount && styles.breakdownDotDiscount,
                    ]}
                  />
                  <Text
                    style={[
                      styles.breakdownLabel,
                      item.isDiscount && styles.breakdownLabelDiscount,
                    ]}
                    numberOfLines={2}
                  >
                    {item.label}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.breakdownAmount,
                    item.isDiscount && styles.breakdownAmountDiscount,
                  ]}
                >
                  {item.isDiscount ? '-' : ''}
                  {formatCurrency(Math.abs(item.amount))}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.totalBand}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Estimated Total</Text>
              <Text style={styles.totalAmount}>{formatCurrency(estimate.total)}</Text>
            </View>
            <Text style={styles.totalNote}>Final amount confirmed at checkout</Text>
          </View>
        </>
      ) : (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <HugeiconsIcon icon={Invoice01Icon} size={22} color={colors.primary} strokeWidth={1.5} />
          </View>
          <Text style={styles.emptyTitle}>No quote yet</Text>
          <Text style={styles.emptyText}>{placeholderText}</Text>
        </View>
      )}
    </DecoratedCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 12,
  },
  cardContent: {
    padding: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2FF',
  },
  headerIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextCol: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  loadingBody: {
    padding: 12,
    gap: 8,
  },
  loadingTotal: {
    marginTop: 4,
  },
  breakdownList: {
    paddingHorizontal: 10,
    paddingTop: 8,
    gap: 4,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: 8,
  },
  breakdownRowAlt: {
    backgroundColor: '#F8FAFC',
  },
  breakdownLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  breakdownDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.secondary,
  },
  breakdownDotDiscount: {
    backgroundColor: '#16A34A',
  },
  breakdownLabel: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  breakdownLabelDiscount: {
    color: '#166534',
  },
  breakdownAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  breakdownAmountDiscount: {
    color: '#16A34A',
  },
  totalBand: {
    marginTop: 8,
    marginHorizontal: 10,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  totalAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -0.3,
  },
  totalNote: {
    marginTop: 4,
    fontSize: 10,
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  emptyIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
