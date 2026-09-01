import { View, Text, StyleSheet } from 'react-native';
import { fonts } from '@clenzey/design-system';

export interface ServiceabilityBadgeProps {
  isServiceable: boolean;
  message?: string;
}

/**
 * Displays serviceability status for an address.
 * Shows "✓ Serviceable" in green or "✗ Not serviceable" in red with optional message.
 *
 * Requirements: 5.5, 5.6
 */
export function ServiceabilityBadge({ isServiceable, message }: ServiceabilityBadgeProps) {
  return (
    <View style={[styles.container, isServiceable ? styles.serviceable : styles.notServiceable]}>
      <Text style={[styles.icon, isServiceable ? styles.greenText : styles.redText]}>
        {isServiceable ? '✓' : '✗'}
      </Text>
      <Text style={[styles.label, isServiceable ? styles.greenText : styles.redText]}>
        {isServiceable ? 'Serviceable' : 'Not serviceable'}
      </Text>
      {message && (
        <Text style={[styles.message, isServiceable ? styles.greenText : styles.redText]}>
          — {message}
        </Text>
      )}
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  serviceable: {
    backgroundColor: '#ECFDF5',
  },
  notServiceable: {
    backgroundColor: '#FEF2F2',
  },
  icon: {
    fontSize: 14,
    fontFamily: fonts.bold,
    fontWeight: '700',
  },
  label: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    fontWeight: '600',
  },
  message: {
    fontSize: 12,
    fontFamily: fonts.regular,
    fontWeight: '400',
  },
  greenText: {
    color: '#28A745',
  },
  redText: {
    color: '#DC3545',
  },
});
