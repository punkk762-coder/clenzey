import { useRef, useState, useCallback, type ReactNode } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  Platform,
  useWindowDimensions,
  Image,
  ImageSourcePropType,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Button } from 'react-native-paper';
import { PageIndicator } from './PageIndicator';
import { colors, fonts } from '../theme';
import { paperButtonContentStyle, paperButtonLabelStyle } from '../theme/paperTheme';

const HERO_HEIGHT_RATIO = 0.46;

export type OnboardingSlideVariant = 0 | 1 | 2;

export interface OnboardingSlideTheme {
  backgroundColor: string;
  heroBackgroundColor?: string;
  variant: OnboardingSlideVariant;
}

export interface OnboardingCarouselSlide {
  id: string;
  title: string;
  description: string;
  theme: OnboardingSlideTheme;
  image?: ImageSourcePropType;
  hero?: ReactNode;
}

export interface OnboardingCarouselProps {
  slides: OnboardingCarouselSlide[];
  onComplete: () => void;
  resetOnFocus?: boolean;
  contentBackgroundColor?: string;
}

function SlideBackgroundDecorations({ variant }: { variant: OnboardingSlideVariant }) {
  if (variant === 0) {
    return (
      <>
        <View style={styles.decorCircleTopRight} />
        <View style={styles.decorCircleBottomLeft} />
      </>
    );
  }

  if (variant === 1) {
    return (
      <>
        <View style={styles.decorBlobLeft} />
        <View style={styles.decorRingRight} />
        <View style={styles.decorDotAccent} />
      </>
    );
  }

  return (
    <>
      <View style={styles.decorPillTopLeft} />
      <View style={styles.decorArcBottomRight} />
      <View style={styles.decorSoftBlock} />
    </>
  );
}

export function OnboardingCarousel({
  slides,
  onComplete,
  resetOnFocus = true,
  contentBackgroundColor = colors.white,
}: OnboardingCarouselProps) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const heroHeight = Math.round(screenHeight * HERO_HEIGHT_RATIO) + insets.top;
  const bottomBarHeight = 140 + insets.bottom;
  const slideHeight = screenHeight - bottomBarHeight;

  const resetCarousel = useCallback(() => {
    setCurrentIndex(0);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ x: 0, y: 0, animated: false });
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (resetOnFocus) {
        resetCarousel();
      }
    }, [resetCarousel, resetOnFocus]),
  );

  const handleNext = useCallback(() => {
    if (currentIndex < slides.length - 1) {
      const nextOffset = (currentIndex + 1) * screenWidth;
      scrollRef.current?.scrollTo({ x: nextOffset, y: 0, animated: true });
    } else {
      onComplete();
    }
  }, [currentIndex, onComplete, screenWidth, slides.length]);

  const handleMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
      setCurrentIndex(index);
    },
    [screenWidth],
  );

  const isLastSlide = currentIndex === slides.length - 1;
  const currentSlide = slides[currentIndex];
  const useLightSkip = Boolean(currentSlide?.image);
  const pagingProps =
    Platform.OS === 'android'
      ? {
          snapToInterval: screenWidth,
          snapToAlignment: 'start' as const,
          disableIntervalMomentum: true,
        }
      : { pagingEnabled: true as const };

  return (
    <View style={[styles.container, { backgroundColor: contentBackgroundColor }]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        {...pagingProps}
        showsHorizontalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
        decelerationRate="normal"
        directionalLockEnabled
        onMomentumScrollEnd={handleMomentumScrollEnd}
        style={styles.pager}
        contentContainerStyle={styles.pagerContent}
      >
        {slides.map((slide) => (
          <View
            key={slide.id}
            style={[styles.slidePage, { width: screenWidth, height: slideHeight }]}
          >
            <View style={[styles.heroSection, { height: heroHeight }]}>
              {slide.image ? (
                <Image source={slide.image} style={styles.heroImage} resizeMode="cover" />
              ) : (
                <View
                  style={[
                    styles.heroFallback,
                    {
                      backgroundColor:
                        slide.theme.heroBackgroundColor ?? slide.theme.backgroundColor,
                    },
                  ]}
                >
                  {slide.hero}
                </View>
              )}
              <View style={[styles.heroCurve, { backgroundColor: contentBackgroundColor }]} />
            </View>

            <View style={[styles.lowerSection, { backgroundColor: contentBackgroundColor }]}>
              <SlideBackgroundDecorations variant={slide.theme.variant} />
              <View style={styles.textContent}>
                <Text style={styles.slideTitle}>{slide.title}</Text>
                <Text style={styles.slideDescription}>{slide.description}</Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.heroOverlay} pointerEvents="box-none">
        <Button
          mode="text"
          compact
          onPress={onComplete}
          textColor={useLightSkip ? colors.white : colors.primary}
          style={[styles.skipButton, { marginTop: insets.top }]}
          labelStyle={useLightSkip ? styles.skipLabelLight : styles.skipLabelDark}
        >
          Skip
        </Button>
      </View>

      <SafeAreaView style={styles.bottomBar} edges={['bottom']} pointerEvents="box-none">
        <View style={styles.bottomContainer}>
          <PageIndicator count={slides.length} activeIndex={currentIndex} />
          <Button
            mode="contained"
            compact
            onPress={isLastSlide ? onComplete : handleNext}
            style={styles.actionButton}
            contentStyle={styles.actionButtonContent}
            labelStyle={styles.actionButtonLabel}
          >
            {isLastSlide ? 'Get Started' : 'Next'}
          </Button>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pager: {
    flex: 1,
  },
  pagerContent: {
    alignItems: 'stretch',
  },
  slidePage: {
    flexDirection: 'column',
  },
  heroSection: {
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCurve: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 24,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  lowerSection: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
  },
  skipButton: {
    alignSelf: 'flex-end',
    marginRight: 8,
    backgroundColor: 'transparent',
  },
  skipLabelLight: {
    fontSize: 13,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  skipLabelDark: {
    fontSize: 13,
    fontWeight: '600',
  },
  textContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 480,
    alignSelf: 'center',
    width: '100%',
    zIndex: 1,
  },
  slideTitle: {
    fontFamily: fonts.bold,
    color: colors.primary,
    fontWeight: '700',
    textAlign: 'center',
    fontSize: 26,
    marginBottom: 10,
  },
  slideDescription: {
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 15,
    paddingHorizontal: 8,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 3,
  },
  decorCircleTopRight: {
    position: 'absolute',
    top: 40,
    right: -36,
    width: 148,
    height: 148,
    borderRadius: 74,
    backgroundColor: 'rgba(0, 67, 186, 0.1)',
  },
  decorCircleBottomLeft: {
    position: 'absolute',
    bottom: 28,
    left: -40,
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: 'rgba(0, 180, 216, 0.12)',
  },
  decorBlobLeft: {
    position: 'absolute',
    top: '28%',
    left: -72,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(0, 180, 216, 0.14)',
  },
  decorRingRight: {
    position: 'absolute',
    bottom: 48,
    right: -24,
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 18,
    borderColor: 'rgba(0, 67, 186, 0.08)',
    backgroundColor: 'transparent',
  },
  decorDotAccent: {
    position: 'absolute',
    top: 72,
    right: 48,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(144, 224, 239, 0.85)',
  },
  decorPillTopLeft: {
    position: 'absolute',
    top: 56,
    left: -48,
    width: 160,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0, 67, 186, 0.08)',
    transform: [{ rotate: '-12deg' }],
  },
  decorArcBottomRight: {
    position: 'absolute',
    bottom: 16,
    right: -20,
    width: 136,
    height: 136,
    borderRadius: 68,
    backgroundColor: 'rgba(144, 224, 239, 0.35)',
  },
  decorSoftBlock: {
    position: 'absolute',
    bottom: 120,
    left: 24,
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 180, 216, 0.1)',
    transform: [{ rotate: '18deg' }],
  },
  bottomContainer: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingBottom: 8,
    paddingTop: 8,
    alignItems: 'center',
    gap: 20,
  },
  actionButton: {
    width: '100%',
    borderRadius: 10,
  },
  actionButtonContent: paperButtonContentStyle,
  actionButtonLabel: paperButtonLabelStyle,
});
