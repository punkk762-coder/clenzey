import React from 'react';
import {
  View,
  Image,
  StyleSheet,
  TouchableOpacity,
  ImageSourcePropType,
  ViewStyle,
} from 'react-native';
import { Text } from 'react-native-paper';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { StarIcon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { colors } from '../theme';
import { fonts } from '../theme/fonts';

export interface ServiceListCardProps {
  name: string;
  tagline?: string;
  priceLabel: string;
  imageSource?: ImageSourcePropType;
  icon?: React.ReactNode;
  badge?: string;
  rating?: number;
  onPress: () => void;
  style?: ViewStyle;
}

export function ServiceListCard({
  name,
  tagline,
  priceLabel,
  imageSource,
  icon,
  badge,
  rating,
  onPress,
  style,
}: ServiceListCardProps) {
  return (
    <TouchableOpacity
      style={[styles.card, style]}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${priceLabel}`}
    >
      <View style={styles.imageWrap}>
        {imageSource ? (
          <Image source={imageSource} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.iconWrap}>{icon}</View>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          {badge ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          ) : null}
        </View>
        {tagline ? (
          <Text style={styles.tagline} numberOfLines={1}>
            {tagline}
          </Text>
        ) : null}
        <View style={styles.footer}>
          <Text style={styles.price}>{priceLabel}</Text>
          {rating != null ? (
            <View style={styles.rating}>
              <HugeiconsIcon icon={StarIcon} size={14} color="#F59E0B" strokeWidth={2} />
              <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <HugeiconsIcon
        icon={ArrowRight01Icon}
        size={18}
        color={colors.textSecondary}
        strokeWidth={1.5}
        style={styles.arrow}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#03045E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  imageWrap: {
    width: 92,
    height: 92,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.chipInactive,
    marginRight: 12,
    flexShrink: 0,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  iconWrap: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  name: {
    fontFamily: fonts.bold,
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    flexShrink: 1,
  },
  badge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  tagline: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  price: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textSecondary,
  },
  arrow: {
    marginLeft: 8,
  },
});
