import React, { useContext } from 'react';
import { View, StyleSheet, ViewStyle, Platform } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { colors, controlSizes } from '../theme';
import { fonts } from '../theme/fonts';

export interface StickyFooterProps {
  priceLabel: string;
  priceSubLabel?: string;
  buttonLabel: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  bottomInset?: number;
}

export function StickyFooter({
  priceLabel,
  priceSubLabel,
  buttonLabel,
  onPress,
  disabled = false,
  loading = false,
  style,
  bottomInset,
}: StickyFooterProps) {
  const insets = useContext(SafeAreaInsetsContext);
  const resolvedBottomInset = bottomInset ?? insets?.bottom ?? 0;

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: Math.max(resolvedBottomInset, Platform.OS === 'web' ? 12 : 8) },
        style,
      ]}
    >
      <View style={styles.priceCol}>
        <Text style={styles.priceLabel}>{priceLabel}</Text>
        {priceSubLabel ? (
          <Text style={styles.priceSubLabel}>{priceSubLabel}</Text>
        ) : null}
      </View>
      <Button
        mode="contained"
        compact
        onPress={onPress}
        disabled={disabled || loading}
        loading={loading}
        style={styles.button}
        contentStyle={styles.buttonContent}
        labelStyle={styles.buttonLabel}
      >
        {buttonLabel}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    shadowColor: '#03045E',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  priceCol: {
    flex: 1,
    marginRight: 12,
  },
  priceLabel: {
    fontFamily: fonts.bold,
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  priceSubLabel: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  button: {
    borderRadius: 10,
    minWidth: 120,
  },
  buttonContent: {
    paddingVertical: 2,
    paddingHorizontal: 14,
    height: controlSizes.button.height,
  },
  buttonLabel: {
    fontFamily: fonts.semiBold,
    fontSize: controlSizes.button.fontSize,
    fontWeight: '600',
  },
});
