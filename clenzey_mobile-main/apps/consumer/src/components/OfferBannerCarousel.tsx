import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Platform,
  useWindowDimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { PromoBanner, PageIndicator } from '@clenzey/design-system';
import type { CouponOffer } from '@clenzey/api-client';
import type { Service, ServiceCategory } from '@clenzey/types';
import { hasOfferApplicableServices } from '../utils/offer-services';

const CATEGORY_BANNER_IMAGES: Record<ServiceCategory, ReturnType<typeof require>> = {
  QUICK_SHINE: require('../../assets/quick-shine.png'),
  DEEP_CLEANING: require('../../assets/banner-sofa.png'),
  DEEP_LUXE: require('../../assets/deep-cleaning.png'),
  CORPORATE: require('../../assets/clenzey-corporate.png'),
};

const BANNER_THEMES = [
  {
    overlayColor: 'rgba(0, 67, 186, 0.48)',
    cardBackgroundColor: '#E8EEF8',
    shadowColor: '#0043BA',
  },
  {
    overlayColor: 'rgba(0, 150, 136, 0.48)',
    cardBackgroundColor: '#E0F2F1',
    shadowColor: '#00897B',
  },
  {
    overlayColor: 'rgba(126, 34, 206, 0.48)',
    cardBackgroundColor: '#F3E8FF',
    shadowColor: '#7E22CE',
  },
  {
    overlayColor: 'rgba(220, 38, 38, 0.48)',
    cardBackgroundColor: '#FEE2E2',
    shadowColor: '#DC2626',
  },
  {
    overlayColor: 'rgba(217, 119, 6, 0.48)',
    cardBackgroundColor: '#FFFBEB',
    shadowColor: '#D97706',
  },
] as const;

const BANNER_GAP = 12;

function getOfferBannerImage(offer: CouponOffer): ReturnType<typeof require> {
  const category = offer.applicableCategories?.[0];
  if (category && CATEGORY_BANNER_IMAGES[category as ServiceCategory]) {
    return CATEGORY_BANNER_IMAGES[category as ServiceCategory];
  }
  return require('../../assets/banner-sofa.png');
}

export interface OfferBannerCarouselProps {
  offers: CouponOffer[];
  services: Service[] | undefined;
  servicesLoading?: boolean;
  onOfferPress: (offer: CouponOffer) => void;
}

export function OfferBannerCarousel({
  offers,
  services,
  servicesLoading = false,
  onOfferPress,
}: OfferBannerCarouselProps) {
  const { width: screenWidth } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const slideWidth = screenWidth - 32;
  const hasMultipleOffers = offers.length > 1;
  const bannerWidth = hasMultipleOffers ? slideWidth - BANNER_GAP : slideWidth;

  const loopedOffers = useMemo(() => {
    if (!hasMultipleOffers) return offers;
    return [offers[offers.length - 1], ...offers, offers[0]];
  }, [hasMultipleOffers, offers]);

  const scrollToRealIndex = useCallback(
    (index: number, animated = false) => {
      const loopIndex = hasMultipleOffers ? index + 1 : index;
      scrollRef.current?.scrollTo({ x: loopIndex * slideWidth, animated });
    },
    [hasMultipleOffers, slideWidth],
  );

  useEffect(() => {
    if (hasMultipleOffers) {
      requestAnimationFrame(() => {
        scrollToRealIndex(0, false);
      });
    } else {
      setActiveIndex(0);
    }
  }, [hasMultipleOffers, offers.length, scrollToRealIndex]);

  const handleScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!hasMultipleOffers) {
        setActiveIndex(0);
        return;
      }

      const loopIndex = Math.round(event.nativeEvent.contentOffset.x / slideWidth);

      if (loopIndex === 0) {
        scrollToRealIndex(offers.length - 1, false);
        setActiveIndex(offers.length - 1);
        return;
      }

      if (loopIndex === loopedOffers.length - 1) {
        scrollToRealIndex(0, false);
        setActiveIndex(0);
        return;
      }

      setActiveIndex(loopIndex - 1);
    },
    [hasMultipleOffers, slideWidth, offers.length, loopedOffers.length, scrollToRealIndex],
  );

  const handleScrollEndDrag = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const velocityX = event.nativeEvent.velocity?.x ?? 0;
      if (Math.abs(velocityX) < 0.1) {
        handleScrollEnd(event);
      }
    },
    [handleScrollEnd],
  );

  const handleBannerPressIn = useCallback(() => {
    setScrollEnabled(false);
  }, []);

  const handleBannerPressOut = useCallback(() => {
    setScrollEnabled(true);
  }, []);

  const handleBannerPress = useCallback(
    (offer: CouponOffer) => {
      if (hasOfferApplicableServices(offer, services)) {
        onOfferPress(offer);
      }
    },
    [onOfferPress, services],
  );

  const pagingProps = {
    snapToInterval: slideWidth,
    snapToAlignment: 'start' as const,
    decelerationRate: 'fast' as const,
    ...(Platform.OS === 'ios' ? { disableIntervalMomentum: true } : {}),
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        scrollEnabled={scrollEnabled}
        showsHorizontalScrollIndicator={false}
        nestedScrollEnabled
        directionalLockEnabled
        onScrollEndDrag={handleScrollEndDrag}
        onMomentumScrollEnd={handleScrollEnd}
        {...pagingProps}
      >
        {loopedOffers.map((offer, loopIndex) => {
          const offerIndex = hasMultipleOffers
            ? loopIndex === 0
              ? offers.length - 1
              : loopIndex === loopedOffers.length - 1
                ? 0
                : loopIndex - 1
            : loopIndex;
          const theme = BANNER_THEMES[offerIndex % BANNER_THEMES.length];
          const slideKey = hasMultipleOffers
            ? `${offer.id}-${loopIndex === 0 ? 'loop-start' : loopIndex === loopedOffers.length - 1 ? 'loop-end' : loopIndex - 1}`
            : offer.id;
          const isBookDisabled = servicesLoading || !hasOfferApplicableServices(offer, services);

          return (
            <View key={slideKey} style={{ width: slideWidth }}>
              <PromoBanner
                chipLabel={offer.label}
                title={offer.title}
                subtitle={`Use code ${offer.code} at checkout`}
                buttonLabel={offer.ctaText || 'Book Now'}
                imageSource={getOfferBannerImage(offer)}
                overlayColor={theme.overlayColor}
                cardBackgroundColor={theme.cardBackgroundColor}
                shadowColor={theme.shadowColor}
                onPress={() => handleBannerPress(offer)}
                onPressIn={handleBannerPressIn}
                onPressOut={handleBannerPressOut}
                disabled={isBookDisabled}
                style={{
                  width: bannerWidth,
                  ...(hasMultipleOffers ? { marginRight: BANNER_GAP } : null),
                }}
              />
            </View>
          );
        })}
      </ScrollView>

      {hasMultipleOffers ? (
        <View style={styles.indicatorWrap}>
          <PageIndicator count={offers.length} activeIndex={activeIndex} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  indicatorWrap: {
    marginTop: 10,
  },
});
