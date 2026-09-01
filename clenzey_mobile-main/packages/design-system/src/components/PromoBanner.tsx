import React from 'react';
import {
  View,
  Image,
  StyleSheet,
  ImageSourcePropType,
  ViewStyle,
  Text as RNText,
  TouchableOpacity,
} from 'react-native';
import { Text } from 'react-native-paper';
import { colors } from '../theme';
import { fonts } from '../theme/fonts';

export interface PromoBannerProps {
  chipLabel: string;
  title: string;
  subtitle?: string;
  buttonLabel: string;
  imageSource: ImageSourcePropType;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  onPressIn?: () => void;
  onPressOut?: () => void;
  /** Semi-transparent color overlay on top of the banner image. */
  overlayColor?: string;
  /** Fallback background behind the image (visible while loading). */
  cardBackgroundColor?: string;
  /** Shadow tint for the banner card. */
  shadowColor?: string;
}

const DEFAULT_OVERLAY = 'rgba(0, 67, 186, 0.45)';
const DEFAULT_CARD_BACKGROUND = '#E8EEF8';
const DEFAULT_SHADOW = colors.primary;

export function PromoBanner({
  chipLabel,
  title,
  subtitle,
  buttonLabel,
  imageSource,
  onPress,
  disabled = false,
  style,
  onPressIn,
  onPressOut,
  overlayColor = DEFAULT_OVERLAY,
  cardBackgroundColor = DEFAULT_CARD_BACKGROUND,
  shadowColor = DEFAULT_SHADOW,
}: PromoBannerProps) {
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: cardBackgroundColor,
          shadowColor,
        },
        style,
      ]}
    >
      <View style={[styles.banner, { backgroundColor: cardBackgroundColor }]}>
        <Image
          source={imageSource}
          style={styles.backgroundImage}
          resizeMode="cover"
        />
        <View style={[styles.overlay, { backgroundColor: overlayColor }]} />
        <View style={styles.contentWrap} pointerEvents="box-none">
          <View style={styles.bannerContent} pointerEvents="box-none">
            <View style={styles.bannerChip}>
              <Text style={styles.bannerChipText}>{chipLabel}</Text>
            </View>
            <Text style={styles.bannerTitle}>{title}</Text>
            {subtitle ? (
              <Text
                style={styles.bannerSubtext}
                numberOfLines={subtitle.includes(' ') ? 1 : undefined}
              >
                {subtitle.includes(' ') ? subtitle.replace(/ /g, '\u00A0') : subtitle}
              </Text>
            ) : null}
            <TouchableOpacity
              onPress={onPress}
              onPressIn={onPressIn}
              onPressOut={onPressOut}
              disabled={disabled}
              activeOpacity={0.88}
              delayPressIn={80}
              style={[styles.bannerBtn, disabled && styles.bannerBtnDisabled]}
              accessibilityRole="button"
              accessibilityState={{ disabled }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <RNText style={[styles.bannerBtnLabel, disabled && styles.bannerBtnLabelDisabled]}>
                {buttonLabel}
              </RNText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  banner: {
    height: 176,
    position: 'relative',
    overflow: 'hidden',
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  contentWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    zIndex: 2,
  },
  bannerContent: {
    maxWidth: '52%',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bannerChip: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
  },
  bannerChipText: {
    color: colors.white,
    fontSize: 9,
    fontFamily: fonts.bold,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  bannerTitle: {
    color: colors.white,
    fontFamily: fonts.bold,
    fontWeight: '700',
    fontSize: 18,
    lineHeight: 22,
    marginBottom: 4,
  },
  bannerSubtext: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 11,
    lineHeight: 15,
    marginBottom: 12,
  },
  bannerBtn: {
    borderRadius: 10,
    alignSelf: 'flex-start',
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 32,
    justifyContent: 'center',
  },
  bannerBtnPressed: {
    opacity: 0.88,
  },
  bannerBtnDisabled: {
    opacity: 0.55,
  },
  bannerBtnLabel: {
    fontWeight: '700',
    fontSize: 12,
    color: colors.primary,
    fontFamily: fonts.bold,
  },
  bannerBtnLabelDisabled: {
    color: colors.textSecondary,
  },
});
