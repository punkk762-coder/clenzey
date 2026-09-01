import { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { Calendar01Icon, Clock01Icon } from '@hugeicons/core-free-icons';
import { BottomSheet, Button, colors, fonts, materialStyle } from '@clenzey/design-system';

interface DateTimePickerProps {
  value: Date;
  minimumDate?: Date;
  onChange: (date: Date) => void;
  onDismiss: () => void;
}

const TIME_GROUPS = [
  { label: 'Morning', slots: [8, 9, 10, 11] },
  { label: 'Afternoon', slots: [12, 13, 14, 15, 16] },
  { label: 'Evening', slots: [17, 18, 19, 20] },
] as const;

const DATE_OPTIONS_COUNT = 14;

function startOfDay(date: Date) {
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

function formatHour(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

function formatSelectedSummary(date: Date): string {
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

function isSlotPast(selectedDay: Date, hour: number, minDate: Date) {
  const slot = new Date(selectedDay);
  slot.setHours(hour, 0, 0, 0);
  return slot <= minDate;
}

function getFirstAvailableHour(selectedDay: Date, minDate: Date): number {
  for (const group of TIME_GROUPS) {
    for (const hour of group.slots) {
      if (!isSlotPast(selectedDay, hour, minDate)) {
        return hour;
      }
    }
  }
  return TIME_GROUPS[0].slots[0];
}

function clampSelectedDate(selectedDay: Date, hour: number, minDate: Date): Date {
  const next = new Date(selectedDay);
  next.setHours(hour, 0, 0, 0);
  if (next < minDate) {
    const fallbackHour = getFirstAvailableHour(selectedDay, minDate);
    next.setHours(fallbackHour, 0, 0, 0);
  }
  return next;
}

/**
 * Bottom sheet date-time picker styled for quick slot selection.
 */
export default function DateTimePicker({
  value,
  minimumDate,
  onChange,
  onDismiss,
}: DateTimePickerProps) {
  const minDate = minimumDate ?? new Date();
  const [selectedDate, setSelectedDate] = useState(() => clampSelectedDate(value, value.getHours(), minDate));

  const dates = useMemo(
    () =>
      Array.from({ length: DATE_OPTIONS_COUNT }, (_, index) => {
        const date = startOfDay(new Date());
        date.setDate(date.getDate() + index);
        return date;
      }),
    [],
  );

  const selectedDay = useMemo(() => startOfDay(selectedDate), [selectedDate]);

  const handleDateSelect = useCallback(
    (date: Date) => {
      setSelectedDate((current) => {
        const hour = current.getHours();
        const next = new Date(date);
        next.setHours(hour, 0, 0, 0);
        return clampSelectedDate(next, hour, minDate);
      });
    },
    [minDate],
  );

  const handleTimeSelect = useCallback((hour: number) => {
    setSelectedDate((current) => {
      const next = new Date(current);
      next.setHours(hour, 0, 0, 0);
      return next;
    });
  }, []);

  const handleConfirm = useCallback(() => {
    onChange(clampSelectedDate(selectedDate, selectedDate.getHours(), minDate));
  }, [minDate, onChange, selectedDate]);

  return (
    <BottomSheet visible onClose={onDismiss}>
      <View style={styles.header}>
        <View style={styles.headerTextCol}>
          <Text style={styles.title}>Select Date & Time</Text>
          <Text style={styles.subtitle}>Choose when you want the service</Text>
        </View>
        <Pressable
          onPress={onDismiss}
          accessibilityRole="button"
          hitSlop={8}
          style={styles.cancelButton}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>

      <View style={styles.previewCard}>
        <View style={styles.previewIconWrap}>
          <HugeiconsIcon icon={Calendar01Icon} size={16} color={colors.primary} strokeWidth={1.5} />
        </View>
        <View style={styles.previewTextCol}>
          <Text style={styles.previewLabel}>Your slot</Text>
          <Text style={styles.previewValue}>{formatSelectedSummary(selectedDate)}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Text style={styles.sectionLabel}>Pick a date</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateScrollContent}
        >
          {dates.map((date) => {
            const isSelected = date.toDateString() === selectedDay.toDateString();
            return (
              <Pressable
                key={date.toISOString()}
                style={[styles.dateChip, isSelected && styles.dateChipSelected]}
                onPress={() => handleDateSelect(date)}
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
              </Pressable>
            );
          })}
        </ScrollView>

        <Text style={styles.sectionLabel}>Pick a time</Text>
        {TIME_GROUPS.map((group) => {
          const availableSlots = group.slots.filter(
            (hour) => !isSlotPast(selectedDay, hour, minDate),
          );
          if (availableSlots.length === 0) return null;

          return (
            <View key={group.label} style={styles.timeGroup}>
              <View style={styles.timeGroupHeader}>
                <HugeiconsIcon icon={Clock01Icon} size={14} color={colors.textSecondary} strokeWidth={1.5} />
                <Text style={styles.timeGroupLabel}>{group.label}</Text>
              </View>
              <View style={styles.timeGrid}>
                {group.slots.map((hour) => {
                  const isSelected = selectedDate.getHours() === hour;
                  const isPast = isSlotPast(selectedDay, hour, minDate);

                  return (
                    <Pressable
                      key={hour}
                      style={[
                        styles.timeChip,
                        isSelected && styles.timeChipSelected,
                        isPast && styles.timeChipDisabled,
                      ]}
                      onPress={() => !isPast && handleTimeSelect(hour)}
                      disabled={isPast}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected, disabled: isPast }}
                    >
                      <Text
                        style={[
                          styles.timeChipText,
                          isSelected && styles.timeChipTextSelected,
                          isPast && styles.timeChipTextDisabled,
                        ]}
                      >
                        {formatHour(hour)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })}
      </ScrollView>

      <Button
        title={`Confirm · ${formatSelectedSummary(selectedDate)}`}
        onPress={handleConfirm}
        size="lg"
        style={styles.confirmButton}
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
    marginTop: 2,
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
  dateChipTextSelected: {
    color: colors.white,
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
