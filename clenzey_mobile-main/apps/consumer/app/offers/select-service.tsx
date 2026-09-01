import { useCallback, useMemo } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Text } from 'react-native-paper';
import { HugeiconsIcon } from '@hugeicons/react-native';
import {
  SparklesIcon,
  CleaningBucketIcon,
  Diamond01Icon,
  Building01Icon,
  Coupon01Icon,
} from '@hugeicons/core-free-icons';
import {
  colors,
  fonts,
  ServiceListCard,
  DecoratedCard,
  IconCircle,
} from '@clenzey/design-system';
import type { Service, ServiceCategory } from '@clenzey/types';
import { useServices } from '../../src/hooks/useServices';
import { useCouponOffers } from '../../src/hooks/useCouponOffers';
import { ShimmerPlaceholder } from '../../src/components/ShimmerPlaceholder';
import { StackBackButton } from '../../src/components/StackBackButton';
import {
  formatOfferDiscount,
  getOfferApplicableServices,
} from '../../src/utils/offer-services';

const CATEGORY_ICONS: Record<ServiceCategory, typeof SparklesIcon> = {
  QUICK_SHINE: SparklesIcon,
  DEEP_CLEANING: CleaningBucketIcon,
  DEEP_LUXE: Diamond01Icon,
  CORPORATE: Building01Icon,
};

const CATEGORY_IMAGES: Record<ServiceCategory, ReturnType<typeof require>> = {
  QUICK_SHINE: require('../../assets/quick-shine.png'),
  DEEP_CLEANING: require('../../assets/deep-cleaning.png'),
  DEEP_LUXE: require('../../assets/deep-cleaning.png'),
  CORPORATE: require('../../assets/clenzey-corporate.png'),
};

export default function OfferSelectServiceScreen() {
  const router = useRouter();
  const { offerId } = useLocalSearchParams<{ offerId: string }>();
  const { data: services, isLoading: isServicesLoading } = useServices();
  const { data: offers, isLoading: isOffersLoading } = useCouponOffers();

  const offer = useMemo(
    () => offers?.find((item) => item.id === offerId),
    [offers, offerId],
  );

  const applicableServices = useMemo(
    () => (offer ? getOfferApplicableServices(offer, services) : []),
    [offer, services],
  );

  const isLoading = isServicesLoading || isOffersLoading;

  const handleServicePress = useCallback(
    (serviceId: string) => {
      if (!offer) return;

      router.push({
        pathname: `/services/${serviceId}`,
        params: { couponCode: offer.code },
      });
    },
    [offer, router],
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Choose Service',
          headerBackVisible: false,
          headerLeft: () => <StackBackButton fallbackRoute="/(tabs)" />,
          headerTintColor: colors.textPrimary,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.white },
          headerTitleStyle: {
            fontFamily: fonts.bold,
            fontWeight: '700',
            fontSize: 16,
          },
        }}
      />

      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.headerCopy}>
            <Text variant="titleSmall" style={styles.title}>
              Select a service for this offer
            </Text>
            <Text variant="labelSmall" style={styles.subtitle}>
              Your discount will be applied at checkout
            </Text>
          </View>

          {isLoading ? (
            <View style={styles.loadingWrap}>
              <ShimmerPlaceholder width={999} height={96} borderRadius={12} style={styles.offerShimmer} />
              <ShimmerPlaceholder width={999} height={116} borderRadius={12} style={styles.serviceShimmer} />
              <ShimmerPlaceholder width={999} height={116} borderRadius={12} style={styles.serviceShimmer} />
            </View>
          ) : !offer ? (
            <View style={styles.emptyContainer}>
              <IconCircle
                icon={Coupon01Icon}
                size={72}
                iconSize={36}
                backgroundColor={colors.tertiary + '50'}
              />
              <Text variant="titleMedium" style={styles.emptyTitle}>
                Offer unavailable
              </Text>
              <Text variant="bodySmall" style={styles.emptySubtitle}>
                This offer may have expired. Go back and check the latest deals on home.
              </Text>
            </View>
          ) : (
            <>
              <DecoratedCard style={styles.offerCard} contentStyle={styles.offerCardContent}>
                <View style={styles.offerHeader}>
                  <View style={styles.offerChip}>
                    <Text style={styles.offerChipText}>{offer.label}</Text>
                  </View>
                  <Text style={styles.offerDiscount}>{formatOfferDiscount(offer)}</Text>
                </View>
                <Text style={styles.offerTitle}>{offer.title}</Text>
                <Text style={styles.offerCode}>Use code {offer.code} at checkout</Text>
              </DecoratedCard>

              <View style={styles.sectionHeader}>
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  Available services
                </Text>
                <Text variant="bodySmall" style={styles.sectionSubtitle}>
                  {applicableServices.length === 1
                    ? '1 service eligible for this offer'
                    : `${applicableServices.length} services eligible for this offer`}
                </Text>
              </View>

              {applicableServices.length > 0 ? (
                <View style={styles.servicesList}>
                  {applicableServices.map((service) => {
                  const isPopular = service.category === 'DEEP_CLEANING';
                  const isCorp = service.category === 'CORPORATE';
                  const price = (service.variants?.[0] as unknown as { basePrice?: number | string })?.basePrice;
                  const tagline =
                    (service as Service & { tagline?: string }).tagline || service.description;

                  return (
                    <ServiceListCard
                      key={service.id}
                      name={service.name}
                      tagline={tagline}
                      priceLabel={isCorp ? 'Custom Pricing' : `₹${price || '---'}`}
                      imageSource={CATEGORY_IMAGES[service.category]}
                      badge={isPopular ? 'POPULAR' : undefined}
                      icon={
                        <HugeiconsIcon
                          icon={CATEGORY_ICONS[service.category] || SparklesIcon}
                          size={28}
                          color={colors.primary}
                          strokeWidth={1.5}
                        />
                      }
                      onPress={() => handleServicePress(service.id)}
                    />
                  );
                })}
                </View>
              ) : (
                <View style={styles.emptyContainer}>
                  <IconCircle
                    icon={SparklesIcon}
                    size={72}
                    iconSize={36}
                    backgroundColor={colors.tertiary + '50'}
                  />
                  <Text variant="titleMedium" style={styles.emptyTitle}>
                    No eligible services
                  </Text>
                  <Text variant="bodySmall" style={styles.emptySubtitle}>
                    None of our current services match this offer. Try another deal from home.
                  </Text>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  scrollView: { flex: 1 },
  content: { paddingBottom: 24, flexGrow: 1 },
  headerCopy: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  title: { color: colors.textPrimary, fontWeight: '700', fontSize: 15 },
  subtitle: { color: colors.textSecondary, marginTop: 3, fontSize: 12 },
  loadingWrap: { paddingHorizontal: 16 },
  offerShimmer: { width: '100%', marginBottom: 20 },
  serviceShimmer: { width: '100%', marginBottom: 12 },
  offerCard: { marginHorizontal: 16, marginBottom: 20 },
  offerCardContent: { gap: 6 },
  offerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  offerChip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.tertiary + '55',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  offerChipText: {
    color: colors.primary,
    fontSize: 10,
    fontFamily: fonts.bold,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  offerDiscount: {
    color: colors.primary,
    fontFamily: fonts.bold,
    fontWeight: '700',
    fontSize: 14,
  },
  offerTitle: {
    color: colors.textPrimary,
    fontFamily: fonts.bold,
    fontWeight: '700',
    fontSize: 16,
    lineHeight: 22,
  },
  offerCode: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
  sectionHeader: { paddingHorizontal: 16, marginBottom: 12 },
  sectionTitle: { color: colors.textPrimary, fontWeight: '700' },
  sectionSubtitle: { color: colors.textSecondary, marginTop: 2 },
  servicesList: { paddingHorizontal: 16 },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyTitle: { color: colors.textPrimary, fontWeight: '700', fontSize: 15 },
  emptySubtitle: { color: colors.textSecondary, textAlign: 'center', fontSize: 12 },
});
