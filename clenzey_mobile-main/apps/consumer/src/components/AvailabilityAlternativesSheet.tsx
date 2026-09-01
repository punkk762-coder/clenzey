import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { Calendar01Icon, Clock01Icon, CalendarRemove01Icon } from '@hugeicons/core-free-icons';
import {
  BottomSheet,
  Button,
  colors,
  fonts,
  materialStyle,
} from '@clenzey/design-system';
import type {
  AvailabilityAlternativeDay,
  AvailabilityPeriodName,
} from '@clenzey/api-client';

const PERIOD_LABELS: Record<AvailabilityPeriodName, string> = {
  MORNING: 'Morning',
  AFTERNOON: 'Afternoon',
  EVENING: 'Evening',
};

const AVAILABILITY_REASON_MESSAGES: Record<string, string> = {
  NO_PARTNER_IN_AREA:
    'No cleaning partners are available near your address for the time you selected.',
  NO_PARTNERS_AVAILABLE:
    'All nearby partners are booked for the time you selected.',
  SLOT_UNAVAILABLE: 'That time slot is no longer available.',
  PARTNER_UNAVAILABLE: 'No partner is free at the time you selected.',
  OUTSIDE_SERVICE_HOURS: 'That time is outside our service hours for your area.',
  BOOKING_OVERLAP: 'Partners in your area are already booked around that time.',
};

function formatAvailabilityReason(reason: string): string {
  const trimmed = reason.trim();
  if (!trimmed) {
    return '';
  }

  const mapped = AVAILABILITY_REASON_MESSAGES[trimmed.toUpperCase()];
  if (mapped) {
    return mapped;
  }

  if (/^[A-Z][A-Z0-9_]+$/.test(trimmed)) {
    return 'Your chosen time is not available right now.';
  }

  return trimmed;
}

function countAvailableSlots(day: AvailabilityAlternativeDay): number {
  return day.periods.reduce(
    (total, group) => total + group.slots.filter((slot) => slot.available).length,
    0,
  );
}

function dayHasAvailableSlots(day: AvailabilityAlternativeDay): boolean {
  return countAvailableSlots(day) > 0;
}

interface AvailabilityAlternativesSheetProps {
  visible: boolean;
  reason: string;
  alternatives: AvailabilityAlternativeDay[];
  onDismiss: () => void;
  onConfirm: (scheduledAt: string) => void;
}

function normalizeAlternatives(
  alternatives: AvailabilityAlternativeDay | AvailabilityAlternativeDay[],
): AvailabilityAlternativeDay[] {
  return Array.isArray(alternatives) ? alternatives : [alternatives];
}

export function normalizeAvailabilityAlternatives(
  alternatives?: AvailabilityAlternativeDay | AvailabilityAlternativeDay[],
): AvailabilityAlternativeDay[] {
  if (!alternatives) return [];
  return normalizeAlternatives(alternatives);
}

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function formatDay(date: Date): string {
  const today = startOfDay(new Date());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === tomorrow.toDateString()) return 'Tmrw';

  return date.toLocaleDateString(undefined, { weekday: 'short' });
}

function formatMonth(date: Date): string {
  return date.toLocaleDateString(undefined, { month: 'short' });
}

function formatSlotTime(scheduledAt: string): string {
  const date = new Date(scheduledAt);
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatSelectedSummary(scheduledAt: string): string {
  const date = new Date(scheduledAt);
  const dayPart = date.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  const timePart = date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${dayPart} · ${timePart}`;
}

export function AvailabilityAlternativesSheet({
  visible,
  reason,
  alternatives,
  onDismiss,
  onConfirm,
}: AvailabilityAlternativesSheetProps) {
  const days = useMemo(() => normalizeAlternatives(alternatives), [alternatives]);

  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const totalAvailableSlots = useMemo(
    () => days.reduce((total, day) => total + countAvailableSlots(day), 0),
    [days],
  );

  const activeDay = days[selectedDayIndex] ?? days[0];
  const activeDaySlotCount = useMemo(
    () => (activeDay ? countAvailableSlots(activeDay) : 0),
    [activeDay],
  );
  const activeDate = useMemo(
    () => (activeDay ? startOfDay(new Date(activeDay.date)) : startOfDay(new Date())),
    [activeDay],
  );

  useEffect(() => {
    if (!visible) {
      setSelectedDayIndex(0);
      setSelectedSlot(null);
      return;
    }

    const firstDayWithSlots = days.findIndex(dayHasAvailableSlots);
    setSelectedDayIndex(firstDayWithSlots >= 0 ? firstDayWithSlots : 0);
    setSelectedSlot(null);
  }, [visible, days]);

  const handleDaySelect = useCallback((index: number) => {
    setSelectedDayIndex(index);
    setSelectedSlot(null);
  }, []);

  const reasonMessage = formatAvailabilityReason(reason);
  const hasAnySlots = totalAvailableSlots > 0;
  const subtitle = useMemo(() => {
    if (!hasAnySlots) {
      return reasonMessage
        ? `${reasonMessage} We couldn't find any open slots soon — try a different time on the previous screen.`
        : "We couldn't find any open slots soon. Try choosing a different time on the previous screen.";
    }

    return reasonMessage
      ? `${reasonMessage} Pick another slot below to continue.`
      : 'Pick another available slot below to continue.';
  }, [hasAnySlots, reasonMessage]);

  const handlePrimaryAction = useCallback(() => {
    if (selectedSlot) {
      onConfirm(selectedSlot);
      return;
    }
    if (!hasAnySlots) {
      onDismiss();
    }
  }, [hasAnySlots, onConfirm, onDismiss, selectedSlot]);

  const primaryButtonTitle = selectedSlot
    ? `Confirm · ${formatSelectedSummary(selectedSlot)}`
    : hasAnySlots
      ? 'Select a slot to continue'
      : 'Choose a different time';

  if (!visible || days.length === 0) {
    return null;
  }

  return (
    <BottomSheet visible={visible} onClose={onDismiss}>
      <View style={styles.header}>
        <View style={styles.headerTextCol}>
          <Text style={styles.title}>That time isn't available</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        <Pressable
          onPress={onDismiss}
          accessibilityRole="button"
          hitSlop={8}
          style={styles.cancelButton}
        >
          <Text style={styles.cancelText}>Close</Text>
        </Pressable>
      </View>

      {selectedSlot ? (
        <View style={styles.previewCard}>
          <View style={styles.previewIconWrap}>
            <HugeiconsIcon icon={Calendar01Icon} size={16} color={colors.primary} strokeWidth={1.5} />
          </View>
          <View style={styles.previewTextCol}>
            <Text style={styles.previewLabel}>Selected slot</Text>
            <Text style={styles.previewValue}>{formatSelectedSummary(selectedSlot)}</Text>
          </View>
        </View>
      ) : null}

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {days.length > 1 ? (
          <>
            <Text style={styles.sectionLabel}>Pick a date</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dateScrollContent}
            >
              {days.map((day, index) => {
                const date = startOfDay(new Date(day.date));
                const isSelected = index === selectedDayIndex;
                const slotCount = countAvailableSlots(day);
                return (
                  <Pressable
                    key={day.date}
                    style={[styles.dateChip, isSelected && styles.dateChipSelected]}
                    onPress={() => handleDaySelect(index)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Text style={[styles.dateChipDay, isSelected && styles.dateChipTextSelected]}>
                      {formatDay(date)}
                    </Text>
                    <Text style={[styles.dateChipDate, isSelected && styles.dateChipTextSelected]}>
                      {date.getDate()}
                    </Text>
                    <Text style={[styles.dateChipMonth, isSelected && styles.dateChipTextSelected]}>
                      {formatMonth(date)}
                    </Text>
                    {slotCount > 0 ? (
                      <Text style={[styles.dateChipSlots, isSelected && styles.dateChipTextSelected]}>
                        {slotCount} slot{slotCount === 1 ? '' : 's'}
                      </Text>
                    ) : (
                      <Text style={[styles.dateChipSlotsMuted, isSelected && styles.dateChipTextSelected]}>
                        Full
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </>
        ) : hasAnySlots ? (
          <Text style={styles.sectionLabel}>
            Available on {formatDay(activeDate)}, {activeDate.getDate()} {formatMonth(activeDate)}
          </Text>
        ) : null}

        {!hasAnySlots ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <HugeiconsIcon icon={CalendarRemove01Icon} size={24} color={colors.primary} strokeWidth={1.5} />
            </View>
            <Text style={styles.emptyTitle}>No open slots right now</Text>
            <Text style={styles.emptyText}>
              Partners near you are fully booked for the upcoming days. Go back and pick a later
              scheduled time, or try again in a little while.
            </Text>
          </View>
        ) : activeDaySlotCount === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <HugeiconsIcon icon={Calendar01Icon} size={24} color={colors.primary} strokeWidth={1.5} />
            </View>
            <Text style={styles.emptyTitle}>Nothing open on this day</Text>
            <Text style={styles.emptyText}>
              {days.length > 1
                ? 'Try another date above — partners may be available on a different day.'
                : 'Go back and choose a different time to check again.'}
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionLabel}>Pick a time</Text>
            {activeDay?.periods.map((group) => {
              const availableSlots = group.slots.filter((slot) => slot.available);
              if (availableSlots.length === 0) return null;

              return (
                <View key={group.period} style={styles.timeGroup}>
                  <View style={styles.timeGroupHeader}>
                    <HugeiconsIcon icon={Clock01Icon} size={14} color={colors.textSecondary} strokeWidth={1.5} />
                    <Text style={styles.timeGroupLabel}>{PERIOD_LABELS[group.period]}</Text>
                  </View>
                  <View style={styles.timeGrid}>
                    {group.slots.map((slot) => {
                      const isSelected = selectedSlot === slot.scheduledAt;
                      const isUnavailable = !slot.available;

                      return (
                        <Pressable
                          key={slot.scheduledAt}
                          style={[
                            styles.timeChip,
                            isSelected && styles.timeChipSelected,
                            isUnavailable && styles.timeChipDisabled,
                          ]}
                          onPress={() => !isUnavailable && setSelectedSlot(slot.scheduledAt)}
                          disabled={isUnavailable}
                          accessibilityRole="button"
                          accessibilityState={{ selected: isSelected, disabled: isUnavailable }}
                        >
                          <Text
                            style={[
                              styles.timeChipText,
                              isSelected && styles.timeChipTextSelected,
                              isUnavailable && styles.timeChipTextDisabled,
                            ]}
                          >
                            {formatSlotTime(slot.scheduledAt)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>

      <Button
        title={primaryButtonTitle}
        onPress={handlePrimaryAction}
        size="lg"
        style={styles.confirmButton}
        disabled={hasAnySlots && !selectedSlot}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  headerTextCol: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 24,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  cancelButton: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  cancelText: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    marginBottom: 4,
    ...materialStyle('card'),
  },
  previewIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewTextCol: {
    flex: 1,
    minWidth: 0,
  },
  previewLabel: {
    fontFamily: fonts.medium,
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
    letterSpacing: 0.2,
  },
  previewValue: {
    fontFamily: fonts.bold,
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 1,
  },
  scrollArea: {
    maxHeight: 360,
  },
  scrollContent: {
    paddingBottom: 8,
  },
  sectionLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 14,
    marginBottom: 10,
  },
  dateScrollContent: {
    gap: 8,
    paddingRight: 4,
  },
  dateChip: {
    width: 68,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  dateChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dateChipDay: {
    fontFamily: fonts.medium,
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  dateChipDate: {
    fontFamily: fonts.bold,
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 2,
    lineHeight: 22,
  },
  dateChipMonth: {
    fontFamily: fonts.medium,
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 1,
  },
  dateChipSlots: {
    fontFamily: fonts.medium,
    fontSize: 9,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 4,
  },
  dateChipSlotsMuted: {
    fontFamily: fonts.medium,
    fontSize: 9,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 4,
  },
  dateChipTextSelected: {
    color: colors.white,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 20,
    marginTop: 8,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 6,
  },
  emptyText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
  },
  timeGroup: {
    marginBottom: 12,
  },
  timeGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  timeGroupLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeChip: {
    width: '31%',
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  timeChipDisabled: {
    backgroundColor: '#F8FAFC',
    borderColor: '#F1F5F9',
  },
  timeChipText: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  timeChipTextSelected: {
    color: colors.white,
  },
  timeChipTextDisabled: {
    color: '#CBD5E1',
    textDecorationLine: 'line-through',
  },
  confirmButton: {
    marginTop: 12,
    width: '100%',
  },
});
