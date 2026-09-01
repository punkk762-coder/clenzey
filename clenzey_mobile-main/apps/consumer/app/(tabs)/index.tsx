import { useCallback, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Text, Surface } from 'react-native-paper';
import { HugeiconsIcon } from '@hugeicons/react-native';
import {
  SparklesIcon,
  CleaningBucketIcon,
  Diamond01Icon,
  Building01Icon,
  CheckmarkCircle01Icon,
  Leaf01Icon,
  Clock01Icon,
} from '@hugeicons/core-free-icons';
import {
  TabScreenHeader,
  colors,
  IconCircle,
  ServiceListCard,
  SegmentTabs,
  materialStyle,
  shadows,
} from '@clenzey/design-system';
import { useServices } from '../../src/hooks/useServices';
import { useCouponOffers } from '../../src/hooks/useCouponOffers';
import { useLocationHeader } from '../../src/hooks/useSelectedAddress';
import { ShimmerPlaceholder } from '../../src/components/ShimmerPlaceholder';
import { OfferBannerCarousel } from '../../src/components/OfferBannerCarousel';
import type { Service, ServiceCategory } from '@clenzey/types';
import type { CouponOffer } from '@clenzey/api-client';

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

const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  QUICK_SHINE: 'Quick Shine',
  DEEP_CLEANING: 'Deep Cleaning',
  DEEP_LUXE: 'Deep Luxe',
  CORPORATE: 'Corporate',
};

export default function HomeTab() {
  const router = useRouter();
  const { location, locationSubtitle, onLocationPress } = useLocationHeader();
  const { data: services, refetch: refetchServices, isRefetching: isServicesRefetching, isLoading } = useServices();
  const {
    data: offers,
    refetch: refetchOffers,
    isRefetching: isOffersRefetching,
    isLoading: isOffersLoading,
  } = useCouponOffers();
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | 'ALL'>('ALL');

  const refetch = useCallback(() => {
    void refetchServices();
    void refetchOffers();
  }, [refetchServices, refetchOffers]);

  const isRefetching = isServicesRefetching || isOffersRefetching;

  const categories = useMemo(() => {
    if (!services) return [];
    const unique = [...new Set(services.map((s) => s.category))];
    return unique;
  }, [services]);

  const categoryTabs = useMemo(
    () => [
      { value: 'ALL', label: 'All' },
      ...categories.map((cat) => ({ value: cat, label: CATEGORY_LABELS[cat] })),
    ],
    [categories],
  );

  const filteredServices = useMemo(() => {
    if (!services) return [];
    if (selectedCategory === 'ALL') return services;
    return services.filter((s) => s.category === selectedCategory);
  }, [services, selectedCategory]);

  const handleServicePress = useCallback((serviceId: string) => {
    router.push(`/services/${serviceId}`);
  }, [router]);

  const handleOfferPress = useCallback((offer: CouponOffer) => {
    router.push({
      pathname: '/offers/select-service',
      params: { offerId: offer.id },
    });
  }, [router]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <TabScreenHeader location={location} locationSubtitle={locationSubtitle} onLocationPress={onLocationPress} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {isOffersLoading ? (
          <ShimmerPlaceholder width={999} height={176} borderRadius={12} style={styles.banner} />
        ) : offers && offers.length > 0 ? (
          <OfferBannerCarousel
            offers={offers}
            services={services}
            servicesLoading={isLoading}
            onOfferPress={handleOfferPress}
          />
        ) : null}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              Our Services
            </Text>
            <Text variant="bodySmall" style={styles.sectionSubtitle}>
              Choose the best care for your space
            </Text>
          </View>

          {categoryTabs.length > 1 && (
            <SegmentTabs
              value={selectedCategory}
              onValueChange={(value) => setSelectedCategory(value as ServiceCategory | 'ALL')}
              tabs={categoryTabs}
              variant="plain"
              size="xs"
              style={styles.categoryTabs}
            />
          )}

          <View style={styles.servicesList}>
            {isLoading ? (
              <>
                <ShimmerPlaceholder width={999} height={116} borderRadius={12} style={{ width: '100%' }} />
                <ShimmerPlaceholder width={999} height={116} borderRadius={12} style={{ width: '100%', marginTop: 12 }} />
              </>
            ) : filteredServices.length > 0 ? (
              filteredServices.map((service) => {
                const isPopular = service.category === 'DEEP_CLEANING';
                const isCorp = service.category === 'CORPORATE';
                const price = (service.variants?.[0] as unknown as { basePrice?: number | string })?.basePrice;
                const tagline = (service as Service & { tagline?: string }).tagline || service.description;

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
              })
            ) : (
              <Text variant="bodyMedium" style={styles.emptyText}>
                No services available
              </Text>
            )}
          </View>
        </View>

        <Surface style={styles.trustCard} elevation={0}>
          <Text variant="titleMedium" style={styles.trustTitle}>
            Reliability you can trust
          </Text>

          {[
            { icon: CheckmarkCircle01Icon, title: 'Verified Professionals', desc: 'Background-checked and trained crew.', color: colors.primary },
            { icon: Leaf01Icon, title: 'Eco-Friendly Products', desc: 'Safe for family, pets, and environment.', color: '#16A34A' },
            { icon: Clock01Icon, title: 'On-Time Guarantee', desc: 'Punctuality is our promise.', color: '#DC2626' },
          ].map((item) => (
            <View key={item.title} style={styles.trustItem}>
              <IconCircle icon={item.icon} size={44} iconSize={22} color={item.color} backgroundColor={colors.white} />
              <View style={styles.trustText}>
                <Text variant="labelLarge" style={styles.trustItemTitle}>{item.title}</Text>
                <Text variant="bodySmall" style={styles.trustItemDesc}>{item.desc}</Text>
              </View>
            </View>
          ))}

          <View style={styles.trustImageWrap}>
            <Image
              source={require('../../assets/professional-cleaning.png')}
              style={styles.trustImage}
              resizeMode="cover"
            />
            <Surface style={styles.ratingFloating} elevation={0}>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Text key={s} style={styles.star}>★</Text>
                ))}
              </View>
              <Text variant="labelMedium" style={styles.ratingText}>4.9/5 Average Rating</Text>
            </Surface>
          </View>
        </Surface>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface },
  scrollView: { flex: 1, backgroundColor: colors.surface },
  content: { paddingBottom: 100, paddingTop: 8 },
  banner: { marginHorizontal: 16, marginTop: 8, marginBottom: 8 },
  section: { marginTop: 20, paddingHorizontal: 16 },
  sectionHeader: { marginBottom: 14 },
  sectionTitle: { fontWeight: '700', color: colors.textPrimary },
  sectionSubtitle: { color: colors.textSecondary, marginTop: 2 },
  categoryTabs: { marginBottom: 16 },
  servicesList: { gap: 0 },
  emptyText: { color: colors.textSecondary, textAlign: 'center', paddingVertical: 24 },
  trustCard: {
    margin: 16,
    marginTop: 24,
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...materialStyle('card'),
  },
  trustTitle: { color: colors.textPrimary, fontWeight: '700', marginBottom: 16 },
  trustItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14, gap: 12 },
  trustText: { flex: 1, paddingTop: 2 },
  trustItemTitle: { color: colors.textPrimary, fontWeight: '700' },
  trustItemDesc: { color: colors.textSecondary, marginTop: 2 },
  trustImageWrap: { position: 'relative', marginTop: 12 },
  trustImage: { width: '100%', height: 210, borderRadius: 12 },
  ratingFloating: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    backgroundColor: colors.white,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...shadows.cardSoft,
  },
  starsRow: { flexDirection: 'row', gap: 2 },
  star: { fontSize: 14, color: '#F59E0B' },
  ratingText: { color: colors.textPrimary, fontWeight: '700', marginTop: 2 },
});
