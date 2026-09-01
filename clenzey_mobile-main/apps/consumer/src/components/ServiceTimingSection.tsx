import { useCallback } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { Calendar01Icon, Clock01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { colors, fonts, materialStyle } from '@clenzey/design-system';
import DateTimePicker from './DateTimePicker';

export type BookingTimingType = 'INSTANT' | 'SCHEDULE';

interface ServiceTimingSectionProps {
  bookingType: BookingTimingType;
  scheduledAt: Date | null;
  showDatePicker: boolean;
  onSelectInstant: () => void;
  onSelectSchedule: () => void;
  onScheduleConfirm: (date: Date) => void;
  onDismissDatePicker: () => void;
}

function formatScheduledAt(date: Date): string {
  return date.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function ServiceTimingSection({
  bookingType,
  scheduledAt,
  showDatePicker,
  onSelectInstant,
  onSelectSchedule,
  onScheduleConfirm,
  onDismissDatePicker,
}: ServiceTimingSectionProps) {
  const handleSchedulePress = useCallback(() => {
    onSelectSchedule();
  }, [onSelectSchedule]);

  return (
    <>
      <View style={styles.section}>
        <Text style={styles.sectionHeading}>Service Timing</Text>
        <View style={styles.timingRow}>
          <Pressable
            style={({ pressed }) => [
              styles.timingCard,
              bookingType === 'INSTANT' && styles.timingCardActive,
              pressed && styles.pressed,
            ]}
            onPress={onSelectInstant}
            accessibilityRole="radio"
            accessibilityState={{ selected: bookingType === 'INSTANT' }}
          >
            <View
              style={[
                styles.timingIconWrap,
                bookingType === 'INSTANT' && styles.timingIconWrapActive,
              ]}
            >
              <HugeiconsIcon
                icon={Clock01Icon}
                size={22}
                color={bookingType === 'INSTANT' ? colors.white : colors.primary}
                strokeWidth={1.5}
              />
            </View>
            <Text style={[styles.timingTitle, bookingType === 'INSTANT' && styles.timingTitleActive]}>
              Instant
            </Text>
            <Text style={[styles.timingDesc, bookingType === 'INSTANT' && styles.timingDescActive]}>
              Available partner will report within the next estimated 20–30 mins
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.timingCard,
              bookingType === 'SCHEDULE' && styles.timingCardActive,
              pressed && styles.pressed,
            ]}
            onPress={handleSchedulePress}
            accessibilityRole="radio"
            accessibilityState={{ selected: bookingType === 'SCHEDULE' }}
          >
            <View
              style={[
                styles.timingIconWrap,
                bookingType === 'SCHEDULE' && styles.timingIconWrapActive,
              ]}
            >
              <HugeiconsIcon
                icon={Calendar01Icon}
                size={22}
                color={bookingType === 'SCHEDULE' ? colors.white : colors.primary}
                strokeWidth={1.5}
              />
            </View>
            <Text style={[styles.timingTitle, bookingType === 'SCHEDULE' && styles.timingTitleActive]}>
              Schedule
            </Text>
            <Text style={[styles.timingDesc, bookingType === 'SCHEDULE' && styles.timingDescActive]}>
              Select your preferred date and time for the service
            </Text>
          </Pressable>
        </View>

        {bookingType === 'SCHEDULE' ? (
          <Pressable
            style={({ pressed }) => [styles.scheduleSummary, pressed && styles.pressed]}
            onPress={handleSchedulePress}
            accessibilityRole="button"
            accessibilityLabel={scheduledAt ? 'Change scheduled date and time' : 'Select date and time'}
          >
            <View style={styles.scheduleSummaryIconWrap}>
              <HugeiconsIcon icon={Calendar01Icon} size={18} color={colors.primary} strokeWidth={1.5} />
            </View>
            <View style={styles.scheduleSummaryContent}>
              <Text style={styles.scheduleSummaryLabel}>
                {scheduledAt ? 'Scheduled for' : 'Select date & time'}
              </Text>
              {scheduledAt ? (
                <Text style={styles.scheduleSummaryValue}>{formatScheduledAt(scheduledAt)}</Text>
              ) : (
                <Text style={styles.scheduleSummaryHint}>Tap to choose your preferred slot</Text>
              )}
            </View>
            <HugeiconsIcon icon={ArrowRight01Icon} size={18} color={colors.primary} strokeWidth={2} />
          </Pressable>
        ) : null}
      </View>

      {showDatePicker ? (
        <DateTimePicker
          value={scheduledAt ?? getDefaultScheduleDate()}
          minimumDate={new Date()}
          onChange={onScheduleConfirm}
          onDismiss={onDismissDatePicker}
        />
      ) : null}
    </>
  );
}

function getDefaultScheduleDate(): Date {
  const date = new Date();
  date.setHours(date.getHours() + 1, 0, 0, 0);
  return date;
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  sectionHeading: {
    fontSize: 17,
    fontFamily: fonts.bold,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  timingRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
  timingCard: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: colors.white,
    minHeight: 148,
    ...materialStyle('card'),
  },
  timingCardActive: {
    borderColor: colors.primary,
    backgroundColor: '#F8FAFF',
  },
  pressed: {
    opacity: 0.92,
  },
  timingIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  timingIconWrapActive: {
    backgroundColor: colors.primary,
  },
  timingTitle: {
    fontSize: 14,
    fontFamily: fonts.bold,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  timingTitleActive: {
    color: colors.primary,
  },
  timingDesc: {
    fontSize: 11,
    lineHeight: 16,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
  timingDescActive: {
    color: '#4B5563',
  },
  scheduleSummary: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: '#DBEAFE',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...materialStyle('card'),
  },
  scheduleSummaryIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scheduleSummaryContent: {
    flex: 1,
    minWidth: 0,
  },
  scheduleSummaryLabel: {
    fontSize: 11,
    fontFamily: fonts.semiBold,
    fontWeight: '600',
    color: colors.primary,
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  scheduleSummaryValue: {
    fontSize: 14,
    fontFamily: fonts.bold,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  scheduleSummaryHint: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
});
