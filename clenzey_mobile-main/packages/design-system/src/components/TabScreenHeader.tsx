import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { Location01Icon, ArrowDown01Icon } from '@hugeicons/core-free-icons';
import { colors } from '../theme';
import { fonts } from '../theme/fonts';

interface TabScreenHeaderProps {
  location?: string;
  locationSubtitle?: string;
  onLocationPress?: () => void;
  showLocation?: boolean;
  backgroundColor?: string;
}

export function TabScreenHeader({
  location = 'Select location',
  locationSubtitle,
  onLocationPress,
  showLocation = true,
  backgroundColor = colors.surface,
}: TabScreenHeaderProps) {
  if (!showLocation) {
    return null;
  }

  return (
    <View style={[styles.wrapper, { backgroundColor }]}>
      <TouchableOpacity
        style={styles.locationRow}
        activeOpacity={0.7}
        onPress={onLocationPress}
        disabled={!onLocationPress}
      >
        <View style={styles.locationIconWrap}>
          <HugeiconsIcon
            icon={Location01Icon}
            size={17}
            color={colors.primary}
            strokeWidth={1.5}
          />
        </View>
        <View style={styles.locationTextCol}>
          <Text style={styles.locationLabel} numberOfLines={1} ellipsizeMode="tail">
            {location}
          </Text>
          {locationSubtitle ? (
            <Text
              style={styles.locationAddress}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {locationSubtitle}
            </Text>
          ) : null}
        </View>
        {onLocationPress ? (
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            size={14}
            color={colors.textSecondary}
            strokeWidth={1.5}
            style={styles.chevron}
          />
        ) : null}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    paddingVertical: 2,
  },
  locationIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.chipInactive,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  locationTextCol: {
    flex: 1,
    minWidth: 0,
  },
  locationLabel: {
    color: colors.textPrimary,
    fontFamily: fonts.bold,
    fontWeight: '700',
    fontSize: 13,
    lineHeight: 17,
  },
  locationAddress: {
    color: colors.textSecondary,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  chevron: {
    flexShrink: 0,
    marginLeft: 2,
  },
});
