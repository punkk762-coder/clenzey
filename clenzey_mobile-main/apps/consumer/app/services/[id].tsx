import { useState, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text, Button } from 'react-native-paper';
import { HugeiconsIcon } from '@hugeicons/react-native';
import {
  Home01Icon,
  Clock01Icon,
  CheckmarkCircle01Icon,
  Add01Icon,
  Building01Icon,
} from '@hugeicons/core-free-icons';
import { colors, fonts, StickyFooter, materialStyle, controlSizes } from '@clenzey/design-system';
import { useServiceById } from '../../src/hooks/useServiceById';
import { useEstimate } from '../../src/hooks/useEstimate';
import { useSelectedAddress } from '../../src/hooks/useSelectedAddress';
import { ServiceTimingSection, type BookingTimingType } from '../../src/components/ServiceTimingSection';
import { OrderSummaryCard } from '../../src/components/OrderSummaryCard';
import { FloatingBackButton } from '../../src/components/FloatingBackButton';
import {
  AvailabilityAlternativesSheet,
  normalizeAvailabilityAlternatives,
} from '../../src/components/AvailabilityAlternativesSheet';
import { AppConfirmDialog } from '../../src/components/AppConfirmDialog';
import { bookingsApi } from '../../src/lib/api';
import { getErrorMessage } from '../../src/utils/error-message';
import { getInstantScheduledAt } from '../../src/utils/instant-scheduling';
import {
  isMisconfiguredCorporateService,
  resolveBookingVariantIds,
  variantRequiresSubVariant,
} from '../../src/utils/service-booking';
import { useBookingDraftStore } from '../../src/store/booking-draft';
import {
  resolveServiceEstimate,
  resolveSubVariantPrice,
} from '../../src/utils/corporate-estimate';
import type { AvailabilityAlternativeDay, CheckAvailabilityResponse } from '@clenzey/api-client';

const CATEGORY_IMAGES: Record<string, any> = {
  QUICK_SHINE: require('../../assets/quick-shine.png'),
  DEEP_CLEANING: require('../../assets/deep-cleaning.png'),
  DEEP_LUXE: require('../../assets/deep-cleaning.png'),
  CORPORATE: require('../../assets/clenzey-corporate.png'),
};

const CORPORATE_VENUE_IMAGES: Record<string, any> = {
  OFFICE: require('../../assets/office.png'),
  SHOP: require('../../assets/shop.png'),
  CLINIC: require('../../assets/clinic.png'),
};

const CORPORATE_CAPACITY_IMAGES: Record<string, any> = {
  SMALL: require('../../assets/corporate-capacity-small.png'),
  MEDIUM: require('../../assets/corporate-capacity-medium.png'),
  LARGE: require('../../assets/corporate-capacity-large.png'),
};

function resolveCorporateVariantImage(label: string, value: string) {
  const sizeKey = `${value} ${label}`.toLowerCase();
  if (sizeKey.includes('small')) return CORPORATE_CAPACITY_IMAGES.SMALL;
  if (sizeKey.includes('medium')) return CORPORATE_CAPACITY_IMAGES.MEDIUM;
  if (sizeKey.includes('large')) return CORPORATE_CAPACITY_IMAGES.LARGE;

  const venueKey = `${value} ${label}`.toUpperCase();
  if (venueKey.includes('OFFICE')) return CORPORATE_VENUE_IMAGES.OFFICE;
  if (venueKey.includes('SHOP')) return CORPORATE_VENUE_IMAGES.SHOP;
  if (venueKey.includes('CLINIC')) return CORPORATE_VENUE_IMAGES.CLINIC;

  return CATEGORY_IMAGES.CORPORATE;
}

function resolveCorporateCapacityImage(label: string, value: string) {
  return resolveCorporateVariantImage(label, value);
}

type CorporateSizeTier = 'SMALL' | 'MEDIUM' | 'LARGE' | 'DEFAULT';

function resolveCorporateSizeTier(label: string, value: string): CorporateSizeTier {
  const key = `${value} ${label}`.toLowerCase();
  if (key.includes('small')) return 'SMALL';
  if (key.includes('medium')) return 'MEDIUM';
  if (key.includes('large')) return 'LARGE';
  return 'DEFAULT';
}

const CORPORATE_OVERLAY_COLORS: Record<CorporateSizeTier, string> = {
  SMALL: 'rgba(6, 95, 70, 0.58)',
  MEDIUM: 'rgba(0, 67, 186, 0.52)',
  LARGE: 'rgba(67, 56, 202, 0.58)',
  DEFAULT: 'rgba(0, 3, 69, 0.45)',
};

function resolveCorporateOverlayColor(label: string, value: string): string {
  return CORPORATE_OVERLAY_COLORS[resolveCorporateSizeTier(label, value)];
}

function formatVariantPrice(basePrice: string): string {
  const amount = Number(basePrice);
  if (Number.isNaN(amount)) return `₹${basePrice}`;
  return `₹${amount.toLocaleString('en-IN')}`;
}

function parseDurationMinutes(label: string, value: string): number | null {
  const match = `${label} ${value}`.match(/(\d+)/);
  return match ? Number.parseInt(match[1], 10) : null;
}

function durationHint(minutes: number | null): string {
  if (minutes === null) return 'Flexible cleaning session';
  if (minutes <= 30) return 'Quick touch-ups & studio';
  if (minutes <= 60) return 'Ideal for 1–2 rooms';
  if (minutes <= 90) return 'Covers most apartments';
  return 'Full home refresh';
}

function propertySizeHint(label: string, value: string): string {
  const key = `${label} ${value}`.toLowerCase();
  if (/1\s*bhk|studio/.test(key)) return 'Studio & 1 BHK homes';
  if (/2\s*bhk/.test(key)) return 'Compact to mid-size';
  if (/3\s*bhk/.test(key)) return 'Spacious apartments';
  if (/4\s*bhk|villa|bungalow/.test(key)) return 'Large homes & villas';
  return 'Choose what fits your space';
}

function isLargePropertySize(label: string, value: string): boolean {
  const key = `${label} ${value}`.toLowerCase();
  return /[34]\s*bhk|villa|bungalow|large/.test(key);
}

const INCLUSION_CARD_COLORS = ['#F0FDF4', '#EFF6FF', '#FEF3C7', '#FDF2F8', '#F5F3FF', '#ECFEFF'];

function AddonCardAccents() {
  return (
    <>
      <View style={s.addonAccentCircle} />
      <View style={s.addonAccentRect} />
    </>
  );
}

function InclusionCardAccents() {
  return (
    <>
      <View style={s.inclusionAccentCircle} />
      <View style={s.inclusionAccentRect} />
    </>
  );
}

export default function ServiceDetailScreen() {
  const { id, couponCode } = useLocalSearchParams<{ id: string; couponCode?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: service, isLoading, error } = useServiceById(id ?? '');

  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [selectedSubVariantId, setSelectedSubVariantId] = useState<string | null>(null);
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const [bookingType, setBookingType] = useState<BookingTimingType>('INSTANT');
  const [scheduledAt, setScheduledAt] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [availabilityAlternatives, setAvailabilityAlternatives] = useState<AvailabilityAlternativeDay[]>([]);
  const [availabilityReason, setAvailabilityReason] = useState('');
  const [showAlternativesSheet, setShowAlternativesSheet] = useState(false);
  const [errorDialog, setErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { selectedAddressId } = useSelectedAddress();

  const activeVariantId = useMemo(() => {
    if (selectedVariantId) return selectedVariantId;
    if (service?.variants?.length) return service.variants[0].id;
    return null;
  }, [selectedVariantId, service]);

  const activeVariant = useMemo(
    () => service?.variants.find((variant) => variant.id === activeVariantId) ?? null,
    [service, activeVariantId],
  );

  const activeSubVariants = useMemo(
    () => activeVariant?.subVariants ?? [],
    [activeVariant],
  );

  const activeSubVariantId = useMemo(() => {
    if (
      selectedSubVariantId &&
      activeSubVariants.some((subVariant) => subVariant.id === selectedSubVariantId)
    ) {
      return selectedSubVariantId;
    }
    if (activeSubVariants.length === 1) return activeSubVariants[0].id;
    return null;
  }, [selectedSubVariantId, activeSubVariants]);

  const requiresSubVariant = variantRequiresSubVariant(service, activeVariant);
  const isMisconfiguredCorporate = isMisconfiguredCorporateService(service);

  const timingReady = bookingType === 'INSTANT' || (bookingType === 'SCHEDULE' && scheduledAt !== null);

  const canProceed = Boolean(
    activeVariantId &&
      !isMisconfiguredCorporate &&
      (!requiresSubVariant || activeSubVariantId) &&
      timingReady,
  );

  const selectedSubVariant = useMemo(() => {
    if (!activeSubVariantId) return null;
    return activeSubVariants.find((subVariant) => subVariant.id === activeSubVariantId) ?? null;
  }, [activeSubVariantId, activeSubVariants]);

  const estimateVariantIds = useMemo(
    () => resolveBookingVariantIds(activeVariantId ?? undefined, activeSubVariantId ?? undefined),
    [activeVariantId, activeSubVariantId],
  );

  const { data: apiEstimate, isFetching: isEstimateLoading } = useEstimate({
    serviceId: id,
    variantId: estimateVariantIds.variantId,
    subVariantId: estimateVariantIds.subVariantId,
    addonIds: selectedAddonIds.length > 0 ? selectedAddonIds : undefined,
  });

  const estimate = useMemo(
    () =>
      resolveServiceEstimate({
        service,
        variant: activeVariant,
        subVariant: selectedSubVariant,
        apiEstimate,
      }),
    [service, activeVariant, selectedSubVariant, apiEstimate],
  );

  const corporateVariants = useMemo(
    () => (service?.category === 'CORPORATE' ? service.variants : []),
    [service?.category, service?.variants],
  );

  const handleVariantSelect = useCallback((variantId: string) => {
    setSelectedVariantId(variantId);
    setSelectedSubVariantId(null);
  }, []);

  const handleAddonToggle = useCallback((addonId: string) => {
    setSelectedAddonIds((prev) =>
      prev.includes(addonId) ? prev.filter((i) => i !== addonId) : [...prev, addonId]
    );
  }, []);

  const handleSelectInstant = useCallback(() => {
    setBookingType('INSTANT');
    setShowDatePicker(false);
  }, []);

  const handleSelectSchedule = useCallback(() => {
    setBookingType('SCHEDULE');
    setShowDatePicker(true);
  }, []);

  const handleScheduleConfirm = useCallback((date: Date) => {
    setScheduledAt(date);
    setShowDatePicker(false);
  }, []);

  const handleDismissDatePicker = useCallback(() => {
    setShowDatePicker(false);
    if (!scheduledAt) {
      setBookingType('INSTANT');
    }
  }, [scheduledAt]);

  const navigateToCheckout = useCallback(
    (options?: { scheduledAtIso?: string; forceScheduled?: boolean }) => {
      if (!activeVariantId || !service) return;

      if (isMisconfiguredCorporate) {
        setErrorMessage('This corporate service is missing capacity options. Please contact support.');
        setErrorDialog(true);
        return;
      }

      if (requiresSubVariant && !activeSubVariantId) {
        setErrorMessage('Please select a capacity option for this corporate service.');
        setErrorDialog(true);
        return;
      }

      const resolvedBookingType =
        options?.forceScheduled || bookingType === 'SCHEDULE' ? 'SCHEDULED' : 'INSTANT';
      const resolvedScheduledAt =
        options?.scheduledAtIso ??
        (bookingType === 'SCHEDULE' && scheduledAt ? scheduledAt.toISOString() : undefined);

      const bookingIds = resolveBookingVariantIds(
        activeVariantId,
        activeSubVariantId ?? undefined,
      );

      const bookingParams: Record<string, string> = {
        serviceId: service.id,
        variantId: bookingIds.variantId!,
        addonIds: selectedAddonIds.join(','),
        bookingType: resolvedBookingType,
      };

      if (bookingIds.subVariantId) {
        bookingParams.subVariantId = bookingIds.subVariantId;
      }

      if (resolvedBookingType === 'SCHEDULED' && resolvedScheduledAt) {
        bookingParams.scheduledAt = resolvedScheduledAt;
      }

      if (couponCode?.trim()) {
        bookingParams.couponCode = couponCode.trim();
      }

      useBookingDraftStore.getState().setDraft({
        serviceId: service.id,
        variantId: bookingIds.variantId!,
        subVariantId: bookingIds.subVariantId,
        addonIds: selectedAddonIds,
        bookingType: resolvedBookingType,
        scheduledAt: resolvedScheduledAt,
        couponCode: couponCode?.trim() || undefined,
      });

      router.push({
        pathname: '/booking/create',
        params: bookingParams,
      });
    },
    [
      service,
      activeVariantId,
      activeSubVariantId,
      selectedAddonIds,
      bookingType,
      scheduledAt,
      couponCode,
      router,
      requiresSubVariant,
      isMisconfiguredCorporate,
    ],
  );

  const resolveScheduledAtIso = useCallback((): string => {
    if (bookingType === 'SCHEDULE' && scheduledAt) {
      return scheduledAt.toISOString();
    }
    return getInstantScheduledAt().toISOString();
  }, [bookingType, scheduledAt]);

  const handleProceed = useCallback(async () => {
    if (!activeVariantId || !service || !canProceed || isCheckingAvailability) return;

    if (!selectedAddressId) {
      router.push('/address/select?required=true');
      return;
    }

    setIsCheckingAvailability(true);
    try {
      const result = (await bookingsApi.checkAvailability({
        serviceId: service.id,
        variantId: activeVariantId,
        scheduledAt: resolveScheduledAtIso(),
        addressId: selectedAddressId,
      })) as unknown as CheckAvailabilityResponse;

      if (result.matched) {
        navigateToCheckout();
        return;
      }

      const alternatives = normalizeAvailabilityAlternatives(result.alternatives);
      if (alternatives.length === 0) {
        setErrorMessage(result.reason || 'No partners are available for your selected time.');
        setErrorDialog(true);
        return;
      }

      setAvailabilityReason(result.reason);
      setAvailabilityAlternatives(alternatives);
      setShowAlternativesSheet(true);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Unable to check availability. Please try again.'));
      setErrorDialog(true);
    } finally {
      setIsCheckingAvailability(false);
    }
  }, [
    activeVariantId,
    service,
    canProceed,
    isCheckingAvailability,
    selectedAddressId,
    resolveScheduledAtIso,
    navigateToCheckout,
    router,
  ]);

  const handleAlternativeConfirm = useCallback(
    (scheduledAtIso: string) => {
      setShowAlternativesSheet(false);
      setAvailabilityAlternatives([]);
      setAvailabilityReason('');
      setScheduledAt(new Date(scheduledAtIso));
      setBookingType('SCHEDULE');
      navigateToCheckout({ scheduledAtIso, forceScheduled: true });
    },
    [navigateToCheckout],
  );

  const handleDismissAlternatives = useCallback(() => {
    setShowAlternativesSheet(false);
    setAvailabilityAlternatives([]);
    setAvailabilityReason('');
  }, []);

  if (isLoading) {
    return (
      <SafeAreaView style={s.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (error || !service) {
    return (
      <SafeAreaView style={s.centered}>
        <Text variant="bodyLarge" style={{ color: '#DC2626' }}>Service not found</Text>
        <Button mode="outlined" compact onPress={() => router.back()} textColor={colors.primary} contentStyle={{ height: controlSizes.button.height }}>Go Back</Button>
      </SafeAreaView>
    );
  }

  const heroImage = CATEGORY_IMAGES[service.category] || CATEGORY_IMAGES.QUICK_SHINE;
  const isCorporate = service.category === 'CORPORATE';
  const isDeepCleaning = service.category === 'DEEP_CLEANING' || service.category === 'DEEP_LUXE';

  const renderHero = (title?: string, subtitle?: string) => (
    <View style={s.heroWrap}>
      <Image source={heroImage} style={s.heroImageFull} resizeMode="cover" />
      {title ? (
        <>
          <View style={s.heroOverlay} />
          <View style={s.heroContent}>
            <Text style={s.heroServiceName}>{title}</Text>
            {subtitle ? <Text style={s.heroTagline}>{subtitle}</Text> : null}
          </View>
        </>
      ) : null}
    </View>
  );

  const renderFloatingBackButton = () => (
    <FloatingBackButton top={insets.top + 8} fallbackRoute="/(tabs)" />
  );

  const renderFooter = (subLabel: string, buttonLabel: string) => (
    <StickyFooter
      priceLabel={`₹${Number(estimate?.total ?? 0)}`}
      priceSubLabel={subLabel}
      buttonLabel={buttonLabel}
      onPress={handleProceed}
      disabled={!canProceed}
      loading={isCheckingAvailability}
      bottomInset={insets.bottom}
    />
  );

  const renderAvailabilityOverlays = () => (
    <>
      <AvailabilityAlternativesSheet
        visible={showAlternativesSheet}
        reason={availabilityReason}
        alternatives={availabilityAlternatives}
        onDismiss={handleDismissAlternatives}
        onConfirm={handleAlternativeConfirm}
      />
      <AppConfirmDialog
        visible={errorDialog}
        onDismiss={() => setErrorDialog(false)}
        onConfirm={() => setErrorDialog(false)}
        title="Unable to Continue"
        message={errorMessage}
        confirmLabel="OK"
        cancelLabel="Close"
        showIcon
        iconType="error"
      />
    </>
  );

  const renderServiceTiming = () => (
    <ServiceTimingSection
      bookingType={bookingType}
      scheduledAt={scheduledAt}
      showDatePicker={showDatePicker}
      onSelectInstant={handleSelectInstant}
      onSelectSchedule={handleSelectSchedule}
      onScheduleConfirm={handleScheduleConfirm}
      onDismissDatePicker={handleDismissDatePicker}
    />
  );

  if (isCorporate) return renderCorporateLayout();
  if (isDeepCleaning) return renderDeepCleaningLayout();
  return renderQuickShineLayout();

  // ─── CORPORATE LAYOUT ─────────────────────────────────────────────────────
  function renderCorporateLayout() {
    const heroSubtitle = service!.tagline || service!.description;
    const activeSizeLabel = `${activeVariant?.label ?? ''} ${activeVariant?.value ?? ''} ${selectedSubVariant?.label ?? ''} ${selectedSubVariant?.value ?? ''}`.toLowerCase();
    const isLargeOffice = activeSizeLabel.includes('large');
    const sizeSectionTitle = 'Select Capacity';
    const sizeSectionHint = 'Choose the team size that fits your space';
    const venueSectionTitle = 'Select Premises Type';
    const venueSectionHint = 'Office, shop, or clinic — pricing varies by space';

    return (
      <View style={s.screen}>
        <ScrollView
          style={s.scrollView}
          contentContainerStyle={s.sheetContent}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={false}
        >
          {renderHero(service!.name, heroSubtitle)}
          <View style={s.bottomSheet}>
          <View style={s.sheetHandle} />

          {/* Variants as selectable cards */}
          <View style={[s.section, s.sectionFirst]}>
            <Text style={s.sectionHeading}>{sizeSectionTitle}</Text>
            <Text style={s.sectionHint}>{sizeSectionHint}</Text>
            <View style={cs.categorySection} collapsable={false}>
              {corporateVariants.map((variant: any) => {
                const isSelected = variant.id === activeVariantId;
                const variantImage = resolveCorporateVariantImage(variant.label, variant.value);
                const variantOverlay = resolveCorporateOverlayColor(variant.label, variant.value);
                return (
                  <TouchableOpacity
                    key={variant.id}
                    style={[cs.categoryCard, isSelected && cs.categoryCardActive]}
                    onPress={() => handleVariantSelect(variant.id)}
                    activeOpacity={0.8}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`${variant.label}, ₹${variant.basePrice}`}
                  >
                    <Image source={variantImage} style={cs.categoryImage} resizeMode="cover" />
                    <View style={[cs.categoryOverlay, { backgroundColor: variantOverlay }]} />
                    {isSelected && (
                      <View style={cs.categoryCheckmark}>
                        <HugeiconsIcon icon={CheckmarkCircle01Icon} size={22} color="#FFFFFF" strokeWidth={2} />
                      </View>
                    )}
                    <View style={cs.categoryContent}>
                      <View style={cs.categoryIconWrap}>
                        <HugeiconsIcon icon={Building01Icon} size={16} color={colors.primary} strokeWidth={1.5} />
                      </View>
                      <Text style={cs.categoryLabel}>{variant.label}</Text>
                      <Text style={cs.categorySubtitle}>From ₹{variant.basePrice}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {activeSubVariants.length > 0 ? (
            <View style={s.section}>
              <Text style={s.sectionHeading}>{venueSectionTitle}</Text>
              <Text style={s.sectionHint}>{venueSectionHint}</Text>
              <View style={cs.venueGrid}>
                {activeSubVariants.map((subVariant) => {
                  const isSelected = subVariant.id === activeSubVariantId;
                  const capacityImage = resolveCorporateCapacityImage(subVariant.label, subVariant.value);
                  const capacityOverlay = resolveCorporateOverlayColor(subVariant.label, subVariant.value);
                  const pricing = resolveSubVariantPrice(subVariant);
                  return (
                    <TouchableOpacity
                      key={subVariant.id}
                      style={[cs.capacityCard, isSelected && cs.capacityCardActive]}
                      onPress={() => setSelectedSubVariantId(subVariant.id)}
                      activeOpacity={0.8}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: isSelected }}
                      accessibilityLabel={`${subVariant.label}, ₹${pricing.effectivePrice}`}
                    >
                      <Image source={capacityImage} style={cs.capacityImage} resizeMode="cover" />
                      <View style={[cs.capacityOverlay, { backgroundColor: capacityOverlay }]} />
                      {isSelected && (
                        <View style={cs.capacityCheckmark}>
                          <HugeiconsIcon icon={CheckmarkCircle01Icon} size={18} color="#FFFFFF" strokeWidth={2} />
                        </View>
                      )}
                      <View style={cs.capacityContent}>
                        <Text style={cs.capacityCardLabel} numberOfLines={1}>
                          {subVariant.label}
                        </Text>
                        <View style={cs.priceBadge}>
                          {pricing.hasDiscount ? (
                            <>
                              <Text style={cs.priceBadgeStrike}>
                                ₹{pricing.basePrice.toLocaleString('en-IN')}
                              </Text>
                              <Text style={cs.priceBadgeText}>
                                ₹{pricing.effectivePrice.toLocaleString('en-IN')}
                              </Text>
                            </>
                          ) : (
                            <Text style={cs.priceBadgeText}>
                              ₹{pricing.effectivePrice.toLocaleString('en-IN')}
                            </Text>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : null}

          {service!.pricingModel ? (
            <View style={cs.pricingModelCard}>
              <View style={cs.pricingModelHeader}>
                <HugeiconsIcon icon={Building01Icon} size={16} color={colors.primary} strokeWidth={1.5} />
                <Text style={cs.pricingModelLabel}>Pricing Model</Text>
              </View>
              <Text style={cs.pricingModelValue}>
                {service!.pricingModel.replace(/_/g, ' ')}
              </Text>
            </View>
          ) : null}

          {isLargeOffice ? (
            <View style={cs.inspectionNotice}>
              <HugeiconsIcon icon={Clock01Icon} size={16} color="#92400E" strokeWidth={1.5} />
              <Text style={cs.inspectionNoticeText}>
                Final quotation will be notified after the inspection of your premises.
              </Text>
            </View>
          ) : null}

          {renderServiceTiming()}

          {service!.inclusions && service!.inclusions.length > 0 ? (
            <View style={s.section}>
              <Text style={s.sectionHeading}>Included Services</Text>
              <View style={s.inclusionsGrid}>
                {service!.inclusions.map((inc: any, index: number) => (
                  <View
                    key={inc.id}
                    style={[
                      s.inclusionCard,
                      { backgroundColor: INCLUSION_CARD_COLORS[index % INCLUSION_CARD_COLORS.length] },
                    ]}
                  >
                    <InclusionCardAccents />
                    <View style={s.inclusionIconWrap}>
                      <HugeiconsIcon icon={CheckmarkCircle01Icon} size={16} color={colors.primary} strokeWidth={1.5} />
                    </View>
                    <Text style={s.inclusionTitle}>{inc.title}</Text>
                    {inc.description ? (
                      <Text style={s.inclusionDesc} numberOfLines={2}>{inc.description}</Text>
                    ) : null}
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {service!.addons && service!.addons.length > 0 ? (
            <View style={s.section}>
              <Text style={s.sectionHeading}>Add-ons</Text>
              {service!.addons.map((addon: any) => {
                const isSelected = selectedAddonIds.includes(addon.id);
                return (
                  <View key={addon.id} style={[s.dcAddonCard, isSelected && s.dcAddonCardSelected]}>
                    <AddonCardAccents />
                    <View style={s.dcAddonIconWrap}>
                      <HugeiconsIcon icon={Building01Icon} size={18} color={colors.primary} strokeWidth={1.5} />
                    </View>
                    <View style={s.dcAddonInfo}>
                      <Text style={s.dcAddonName}>{addon.name}</Text>
                      {addon.description ? (
                        <Text style={s.dcAddonDesc} numberOfLines={1}>{addon.description}</Text>
                      ) : null}
                    </View>
                    <Text style={s.dcAddonPrice}>+₹{addon.price}</Text>
                    <TouchableOpacity
                      style={[s.dcAddonBtn, isSelected && s.dcAddonBtnActive]}
                      onPress={() => handleAddonToggle(addon.id)}
                      activeOpacity={0.7}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: isSelected }}
                    >
                      {isSelected ? (
                        <Text style={s.dcAddonBtnTextActive}>✓</Text>
                      ) : (
                        <HugeiconsIcon icon={Add01Icon} size={16} color={colors.primary} strokeWidth={2} />
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          ) : null}

          <View style={s.section}>
            <Text style={[s.sectionHeading, { color: colors.primary }]}>Order Summary</Text>
            <OrderSummaryCard
              estimate={estimate}
              isLoading={isEstimateLoading && !selectedSubVariant}
              placeholderText={
                requiresSubVariant && !activeSubVariantId
                  ? 'Select a capacity and premises type to see pricing'
                  : 'Select a capacity to see pricing'
              }
            />
          </View>
          </View>
        </ScrollView>

        {renderFooter('Estimated Quote', 'Book Service')}
        {renderFloatingBackButton()}
        {renderAvailabilityOverlays()}
      </View>
    );
  }

  // ─── QUICK SHINE LAYOUT ───────────────────────────────────────────────────
  function renderQuickShineLayout() {
    return (
      <View style={s.screen}>
        <ScrollView
          style={s.scrollView}
          contentContainerStyle={s.sheetContent}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={false}
        >
          {renderHero()}
          <View style={s.bottomSheet}>
          <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>{service!.name}</Text>
            {service!.tagline ? (
              <Text style={s.sheetSubtitle}>{service!.tagline}</Text>
            ) : null}

          {/* Select Duration — variants from API */}
          <View style={s.section}>
            <Text style={s.sectionHeading}>Select Duration</Text>
            <Text style={s.sectionHint}>How long should your cleaner stay?</Text>
            <View style={s.optionGrid}>
              {service!.variants.map((variant: any) => {
                const isActive = variant.id === activeVariantId;
                const minutes = parseDurationMinutes(variant.label, variant.value);
                return (
                  <TouchableOpacity
                    key={variant.id}
                    style={[s.durationCard, isActive && s.optionCardActive]}
                    onPress={() => setSelectedVariantId(variant.id)}
                    activeOpacity={0.8}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isActive }}
                    accessibilityLabel={`${variant.label}, ${formatVariantPrice(variant.basePrice)}`}
                  >
                    {isActive ? (
                      <View style={s.optionCheckmark}>
                        <HugeiconsIcon icon={CheckmarkCircle01Icon} size={16} color={colors.primary} strokeWidth={2} />
                      </View>
                    ) : null}
                    <View style={[s.optionIconWrap, isActive && s.optionIconWrapActive]}>
                      <HugeiconsIcon
                        icon={Clock01Icon}
                        size={18}
                        color={isActive ? colors.white : colors.primary}
                        strokeWidth={1.5}
                      />
                    </View>
                    <Text style={[s.durationLabel, isActive && s.optionTextActive]}>
                      {variant.label}
                    </Text>
                    <Text
                      style={[s.optionHint, isActive && s.optionSubtextActive]}
                      numberOfLines={2}
                    >
                      {durationHint(minutes)}
                    </Text>
                    <View style={[s.optionPriceBadge, isActive && s.optionPriceBadgeActive]}>
                      <Text style={[s.optionPriceText, isActive && s.optionPriceTextActive]}>
                        {formatVariantPrice(variant.basePrice)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {renderServiceTiming()}

          {/* Add-ons — from API */}
          {service!.addons && service!.addons.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionHeading}>Add-ons</Text>
              {service!.addons.map((addon: any) => {
                const isSelected = selectedAddonIds.includes(addon.id);
                return (
                  <TouchableOpacity
                    key={addon.id}
                    style={[s.addonCard, isSelected && s.addonCardSelected]}
                    onPress={() => handleAddonToggle(addon.id)}
                    activeOpacity={0.7}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isSelected }}
                  >
                    <AddonCardAccents />
                    <View style={s.addonIconWrap}>
                      <HugeiconsIcon icon={Home01Icon} size={18} color={colors.primary} strokeWidth={1.5} />
                    </View>
                    <View style={s.addonInfo}>
                      <Text style={s.addonName}>{addon.name}</Text>
                      <Text style={s.addonPrice}>+₹{addon.price}</Text>
                    </View>
                    <View style={[s.checkbox, isSelected && s.checkboxChecked]}>
                      {isSelected && <Text style={s.checkmark}>✓</Text>}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          </View>
        </ScrollView>

        {renderFooter('Estimated Total', 'Book Now')}
        {renderFloatingBackButton()}
        {renderAvailabilityOverlays()}
      </View>
    );
  }

  // ─── DEEP CLEANING LAYOUT ─────────────────────────────────────────────────
  function renderDeepCleaningLayout() {
    const heroSubtitle = service!.tagline || service!.description;

    return (
      <View style={s.screen}>
        <ScrollView
          style={s.scrollView}
          contentContainerStyle={s.sheetContent}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={false}
        >
          {renderHero(service!.name, heroSubtitle)}
          <View style={s.bottomSheet}>
          <View style={s.sheetHandle} />

          {/* Select Property Size — variants from API */}
          <View style={[s.section, s.sectionFirst]}>
            <Text style={s.sectionHeading}>Select Property Size</Text>
            <Text style={s.sectionHint}>Choose based on your home layout</Text>
            <View style={s.optionGrid}>
              {service!.variants.map((variant: any) => {
                const isActive = variant.id === activeVariantId;
                const useBuildingIcon = isLargePropertySize(variant.label, variant.value);
                return (
                  <TouchableOpacity
                    key={variant.id}
                    style={[s.propertyCard, isActive && s.optionCardActive]}
                    onPress={() => setSelectedVariantId(variant.id)}
                    activeOpacity={0.8}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isActive }}
                    accessibilityLabel={`${variant.label}, ${formatVariantPrice(variant.basePrice)}`}
                  >
                    {isActive ? (
                      <View style={s.optionCheckmark}>
                        <HugeiconsIcon icon={CheckmarkCircle01Icon} size={16} color={colors.primary} strokeWidth={2} />
                      </View>
                    ) : null}
                    <View style={[s.optionIconWrap, isActive && s.optionIconWrapActive]}>
                      <HugeiconsIcon
                        icon={useBuildingIcon ? Building01Icon : Home01Icon}
                        size={18}
                        color={isActive ? colors.white : colors.primary}
                        strokeWidth={1.5}
                      />
                    </View>
                    <Text style={[s.propertyLabel, isActive && s.optionTextActive]}>
                      {variant.label}
                    </Text>
                    <Text
                      style={[s.optionHint, isActive && s.optionSubtextActive]}
                      numberOfLines={2}
                    >
                      {propertySizeHint(variant.label, variant.value)}
                    </Text>
                    <View style={[s.optionPriceBadge, isActive && s.optionPriceBadgeActive]}>
                      <Text style={[s.optionPriceText, isActive && s.optionPriceTextActive]}>
                        {formatVariantPrice(variant.basePrice)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {renderServiceTiming()}

          {/* Inclusions — from API */}
          {service!.inclusions && service!.inclusions.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionHeading}>Included Services</Text>
              <View style={s.inclusionsGrid}>
                {service!.inclusions.map((inc: any, index: number) => (
                  <View
                    key={inc.id}
                    style={[
                      s.inclusionCard,
                      { backgroundColor: INCLUSION_CARD_COLORS[index % INCLUSION_CARD_COLORS.length] },
                    ]}
                  >
                    <InclusionCardAccents />
                    <View style={s.inclusionIconWrap}>
                      <HugeiconsIcon icon={CheckmarkCircle01Icon} size={16} color={colors.primary} strokeWidth={1.5} />
                    </View>
                    <Text style={s.inclusionTitle}>{inc.title}</Text>
                    {inc.description ? (
                      <Text style={s.inclusionDesc} numberOfLines={2}>{inc.description}</Text>
                    ) : null}
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Add-ons — from API */}
          {service!.addons && service!.addons.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionHeading}>Add-ons</Text>
              {service!.addons.map((addon: any) => {
                const isSelected = selectedAddonIds.includes(addon.id);
                return (
                  <View key={addon.id} style={[s.dcAddonCard, isSelected && s.dcAddonCardSelected]}>
                    <AddonCardAccents />
                    <View style={s.dcAddonIconWrap}>
                      <HugeiconsIcon icon={Home01Icon} size={18} color={colors.primary} strokeWidth={1.5} />
                    </View>
                    <View style={s.dcAddonInfo}>
                      <Text style={s.dcAddonName}>{addon.name}</Text>
                      {addon.description ? (
                        <Text style={s.dcAddonDesc} numberOfLines={1}>{addon.description}</Text>
                      ) : null}
                    </View>
                    <Text style={s.dcAddonPrice}>+₹{addon.price}</Text>
                    <TouchableOpacity
                      style={[s.dcAddonBtn, isSelected && s.dcAddonBtnActive]}
                      onPress={() => handleAddonToggle(addon.id)}
                      activeOpacity={0.7}
                    >
                      {isSelected ? (
                        <Text style={s.dcAddonBtnTextActive}>✓</Text>
                      ) : (
                        <HugeiconsIcon icon={Add01Icon} size={16} color={colors.primary} strokeWidth={2} />
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}

          {/* Order Summary — from estimate API */}
          <View style={s.section}>
            <Text style={[s.sectionHeading, { color: colors.primary }]}>Order Summary</Text>
            <OrderSummaryCard
              estimate={estimate}
              isLoading={isEstimateLoading}
              placeholderText="Select a property size to see pricing"
            />
          </View>
          </View>
        </ScrollView>

        {renderFooter('Estimated Total', 'Book Now')}
        {renderFloatingBackButton()}
        {renderAvailabilityOverlays()}
      </View>
    );
  }
}


// ─── CORPORATE STYLES ─────────────────────────────────────────────────────────
const cs = StyleSheet.create({
  categorySection: {
    marginTop: 0,
  },
  categoryCard: {
    height: 150,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryCardActive: {
    borderColor: colors.primary,
  },
  categoryImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  categoryOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  categoryCheckmark: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryContent: {
    position: 'absolute',
    bottom: 14,
    left: 14,
  },
  categoryIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  categoryLabel: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  categorySubtitle: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    marginTop: 2,
  },
  venueGrid: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
    width: '100%',
  },
  capacityCard: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    height: 130,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  capacityCardActive: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  capacityImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  capacityOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  capacityCheckmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  capacityContent: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    gap: 4,
  },
  capacityCardLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
  },
  priceBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.92)',
    gap: 2,
  },
  priceBadgeStrike: {
    fontSize: 9,
    fontWeight: '600',
    color: '#6B7280',
    textDecorationLine: 'line-through',
  },
  priceBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#166534',
  },
  pricingModelCard: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  pricingModelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  pricingModelLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.3,
  },
  pricingModelValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    textTransform: 'capitalize',
    marginLeft: 22,
  },
  inspectionNotice: {
    marginHorizontal: 20,
    marginTop: 14,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  inspectionNoticeText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    color: '#92400E',
    lineHeight: 18,
  },
});

// ─── SHARED / QUICK SHINE / DEEP CLEANING STYLES ─────────────────────────────
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 16, gap: 16 },
  scrollView: { flex: 1, backgroundColor: colors.surface },
  sheetContent: { paddingBottom: 120, flexGrow: 1 },
  heroWrap: { height: 280, position: 'relative' },
  heroImageFull: { width: '100%', height: '100%' },
  bottomSheet: {
    marginTop: -28,
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    paddingBottom: 8,
    minHeight: 200,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  sheetSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  content: { paddingBottom: 120, paddingTop: 8 },

  // Hero (legacy)
  heroContainer: { marginHorizontal: 20, height: 190, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  heroImage: { width: '100%', height: '100%' },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 3, 69, 0.35)',
  },
  heroContent: {
    position: 'absolute',
    bottom: 40,
    left: 16,
    right: 16,
    zIndex: 1,
  },
  heroServiceName: {
    color: colors.white,
    fontSize: 22,
    fontWeight: '700',
  },
  heroTagline: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },

  // Shared Section
  section: { paddingHorizontal: 20, marginTop: 20 },
  sectionFirst: { marginTop: 0 },
  sectionHeading: { fontSize: 17, fontFamily: fonts.bold, fontWeight: '700', color: colors.textPrimary },
  sectionHint: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 12,
    lineHeight: 18,
  },

  // Variant option cards (Quick Shine duration & Deep Cleaning property size)
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  durationCard: {
    width: '47%',
    minHeight: 132,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: colors.white,
    alignItems: 'center',
    position: 'relative',
    ...materialStyle('card'),
  },
  propertyCard: {
    width: '47%',
    minHeight: 132,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: colors.white,
    alignItems: 'center',
    position: 'relative',
    ...materialStyle('card'),
  },
  optionCardActive: {
    borderColor: colors.primary,
    backgroundColor: '#F8FAFF',
  },
  optionCheckmark: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  optionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  optionIconWrapActive: {
    backgroundColor: colors.primary,
  },
  durationLabel: {
    fontSize: 15,
    fontFamily: fonts.bold,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 2,
  },
  propertyLabel: {
    fontSize: 15,
    fontFamily: fonts.bold,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 2,
  },
  optionHint: {
    fontSize: 10,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 14,
    minHeight: 24,
    marginBottom: 6,
  },
  optionTextActive: {
    color: colors.primary,
  },
  optionSubtextActive: {
    color: '#4B5563',
  },
  optionPriceBadge: {
    marginTop: 'auto',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: colors.chipInactive,
  },
  optionPriceBadgeActive: {
    backgroundColor: colors.primary,
  },
  optionPriceText: {
    fontSize: 12,
    fontFamily: fonts.bold,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  optionPriceTextActive: {
    color: colors.white,
  },

  // Quick Shine Toggle
  toggleContainer: { flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 10, padding: 4 },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', minHeight: 44, justifyContent: 'center' },
  toggleBtnActive: { backgroundColor: colors.primary },
  toggleText: { fontSize: 13, fontWeight: '700', color: '#9CA3AF', letterSpacing: 0.5 },
  toggleTextActive: { color: '#FFFFFF' },

  // Quick Shine Add-ons
  addonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
    position: 'relative',
    ...materialStyle('card'),
  },
  addonCardSelected: {
    borderColor: colors.primary,
    backgroundColor: '#F8FAFF',
  },
  addonAccentCircle: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
  },
  addonAccentRect: {
    position: 'absolute',
    bottom: -2,
    left: 8,
    width: 32,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F0F4FF',
  },
  addonIconWrap: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#F5F7FA', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  addonInfo: { flex: 1 },
  addonName: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  addonPrice: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 1.5, borderColor: '#D1D5DB', justifyContent: 'center', alignItems: 'center' },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkmark: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },

  // Bottom Bar
  bottomBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 16, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  totalLabel: { fontSize: 9, fontWeight: '700', color: '#9CA3AF', letterSpacing: 0.8, marginBottom: 2 },
  totalValue: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  ctaBtn: { backgroundColor: colors.textPrimary, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 10 },
  ctaBtnDisabled: { opacity: 0.4 },
  ctaBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },

  // DC Service Type Cards
  serviceTypeRow: { flexDirection: 'row', gap: 12, marginTop: 14 },
  serviceTypeCard: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12, borderWidth: 2, borderColor: '#E5E7EB', backgroundColor: '#FFFFFF', ...materialStyle('card') },
  serviceTypeCardActive: { borderColor: colors.primary },
  serviceTypeIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  serviceTypeIconActive: { backgroundColor: colors.primary },
  serviceTypeTitle: { fontSize: 13, fontWeight: '700', color: '#6B7280' },
  serviceTypeTitleActive: { color: colors.primary },

  // DC Inclusions Grid
  inclusionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  inclusionCard: {
    width: '47%',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    position: 'relative',
    ...materialStyle('card'),
  },
  inclusionAccentCircle: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
  },
  inclusionAccentRect: {
    position: 'absolute',
    bottom: -2,
    left: 6,
    width: 28,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F0F4FF',
  },
  inclusionIconWrap: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  inclusionTitle: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginBottom: 2 },
  inclusionDesc: { fontSize: 10, color: '#6B7280', lineHeight: 14 },

  // DC Add-ons
  dcAddonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
    position: 'relative',
    ...materialStyle('card'),
  },
  dcAddonCardSelected: {
    borderColor: colors.primary,
    backgroundColor: '#F8FAFF',
  },
  dcAddonIconWrap: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#F5F7FA', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  dcAddonInfo: { flex: 1 },
  dcAddonName: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  dcAddonDesc: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  dcAddonPrice: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginRight: 10 },
  dcAddonBtn: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  dcAddonBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dcAddonBtnTextActive: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },

});
