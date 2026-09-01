import { useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { Text, Card, Button } from 'react-native-paper';
import { colors, SegmentTabs, materialStyle, fonts } from '@clenzey/design-system';
import { createPartnersEndpoints } from '@clenzey/api-client';
import type { AvailabilitySlot, DayOfWeek } from '@clenzey/types';
import { apiClient } from '../../../src/lib/api';
import { sharedPaperStyles } from '../../../src/styles/paperControls';

const partnersApi = createPartnersEndpoints(apiClient);

const DAYS_OF_WEEK: DayOfWeek[] = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

const DAY_LABELS: Record<DayOfWeek, string> = {
  SUN: 'Sunday', MON: 'Monday', TUE: 'Tuesday', WED: 'Wednesday',
  THU: 'Thursday', FRI: 'Friday', SAT: 'Saturday',
};

const availabilitySchema = z
  .object({
    dayOfWeek: z.enum(['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']),
    startHour: z.number().min(0).max(23),
    endHour: z.number().min(1).max(24),
  })
  .refine((d) => d.endHour > d.startHour, {
    message: 'End hour must be greater than start hour',
    path: ['endHour'],
  });

function formatHour(hour: number): string {
  if (hour === 0) return '12:00 AM';
  if (hour === 12) return '12:00 PM';
  if (hour === 24) return '12:00 AM';
  if (hour > 12) return `${hour - 12}:00 PM`;
  return `${hour}:00 AM`;
}

export default function AvailabilityScreen() {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>('MON');
  const [startHour, setStartHour] = useState<number>(9);
  const [endHour, setEndHour] = useState<number>(17);
  const [formError, setFormError] = useState<string | null>(null);

  const availabilityQuery = useQuery({
    queryKey: ['availability'],
    queryFn: async () => {
      const response = await partnersApi.getAvailability();
      return (Array.isArray(response) ? response : []) as AvailabilitySlot[];
    },
  });

  const addMutation = useMutation({
    mutationFn: (data: { dayOfWeek: DayOfWeek; startHour: number; endHour: number }) =>
      partnersApi.addAvailability(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability'] });
      setFormError(null);
    },
    onError: () => Alert.alert('Error', 'Failed to add availability slot. Please try again.'),
  });

  const removeMutation = useMutation({
    mutationFn: (availabilityId: string) => partnersApi.removeAvailability(availabilityId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['availability'] }),
    onError: () => Alert.alert('Error', 'Failed to remove availability slot. Please try again.'),
  });

  const slotsByDay: Record<DayOfWeek, AvailabilitySlot[]> = {
    SUN: [], MON: [], TUE: [], WED: [], THU: [], FRI: [], SAT: [],
  };

  if (availabilityQuery.data) {
    for (const slot of availabilityQuery.data) {
      const day = slot.dayOfWeek as DayOfWeek;
      if (slotsByDay[day]) slotsByDay[day].push(slot);
    }
  }

  const handleAddSlot = useCallback(() => {
    setFormError(null);
    const result = availabilitySchema.safeParse({ dayOfWeek: selectedDay, startHour, endHour });
    if (!result.success) {
      setFormError(result.error.errors[0]?.message ?? 'Invalid input');
      return;
    }
    addMutation.mutate({ dayOfWeek: selectedDay, startHour, endHour });
  }, [selectedDay, startHour, endHour, addMutation]);

  const handleDeleteSlot = useCallback(
    (slot: AvailabilitySlot) => {
      Alert.alert(
        'Remove Slot',
        `Remove ${formatHour(slot.startHour)} - ${formatHour(slot.endHour)} on ${DAY_LABELS[slot.dayOfWeek]}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Remove', style: 'destructive', onPress: () => removeMutation.mutate(slot.id) },
        ]
      );
    },
    [removeMutation]
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['availability'] });
    setIsRefreshing(false);
  }, [queryClient]);

  const startHourOptions = Array.from({ length: 24 }, (_, i) => i);
  const endHourOptions = Array.from({ length: 24 }, (_, i) => i + 1).filter((h) => h > startHour);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
      >
        <Text variant="headlineSmall" style={styles.title}>Availability</Text>
        <Text variant="bodyMedium" style={styles.subtitle}>Set your weekly availability schedule</Text>

        <Card style={[styles.formCard, materialStyle('card')]} mode="elevated">
          <Card.Content>
            <Text variant="titleMedium" style={styles.formTitle}>Add Availability Slot</Text>

            <Text variant="labelLarge" style={styles.fieldLabel}>Day of Week</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              <SegmentTabs
                value={selectedDay}
                onValueChange={(v) => setSelectedDay(v as DayOfWeek)}
                tabs={DAYS_OF_WEEK.map((day) => ({ value: day, label: day }))}
              />
            </ScrollView>

            <Text variant="labelLarge" style={styles.fieldLabel}>Start Hour</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hourScroll} contentContainerStyle={styles.hourScrollContent}>
              <SegmentTabs
                value={String(startHour)}
                onValueChange={(v) => {
                  const hour = Number(v);
                  setStartHour(hour);
                  if (endHour <= hour) setEndHour(hour + 1);
                }}
                tabs={startHourOptions.map((hour) => ({ value: String(hour), label: formatHour(hour) }))}
              />
            </ScrollView>

            <Text variant="labelLarge" style={styles.fieldLabel}>End Hour</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hourScroll} contentContainerStyle={styles.hourScrollContent}>
              <SegmentTabs
                value={String(endHour)}
                onValueChange={(v) => setEndHour(Number(v))}
                tabs={endHourOptions.map((hour) => ({ value: String(hour), label: formatHour(hour) }))}
              />
            </ScrollView>

            {formError && <Text variant="bodySmall" style={styles.errorText}>{formError}</Text>}

            <Button
              mode="contained"
              compact
              onPress={handleAddSlot}
              loading={addMutation.isPending}
              disabled={addMutation.isPending}
              buttonColor={colors.primary}
              style={styles.addButton}
              contentStyle={sharedPaperStyles.buttonContent}
            >
              Add Slot
            </Button>
          </Card.Content>
        </Card>

        <Text variant="titleMedium" style={styles.sectionTitle}>Weekly Schedule</Text>

        {availabilityQuery.isLoading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text variant="bodyMedium" style={styles.loadingText}>Loading availability...</Text>
          </View>
        )}

        {DAYS_OF_WEEK.map((day) => {
          const slots = slotsByDay[day];
          return (
            <Card key={day} style={[styles.dayCard, materialStyle('card')]} mode="elevated">
              <Card.Content>
                <View style={styles.dayHeader}>
                  <Text variant="titleSmall" style={styles.dayLabel}>{DAY_LABELS[day]}</Text>
                  <Text variant="labelSmall" style={styles.dayAbbrev}>{day}</Text>
                </View>
                {slots.length === 0 ? (
                  <Text variant="bodySmall" style={styles.noSlotsText}>No availability set</Text>
                ) : (
                  slots.map((slot) => (
                    <View key={slot.id} style={styles.slotRow}>
                      <Text variant="bodyMedium" style={styles.slotTime}>
                        {formatHour(slot.startHour)} – {formatHour(slot.endHour)}
                      </Text>
                      <Pressable onPress={() => handleDeleteSlot(slot)} style={styles.deleteButton} accessibilityRole="button" accessibilityLabel={`Delete slot ${formatHour(slot.startHour)} to ${formatHour(slot.endHour)}`}>
                        <Text variant="labelMedium" style={styles.deleteButtonText}>✕</Text>
                      </Pressable>
                    </View>
                  ))
                )}
              </Card.Content>
            </Card>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  scrollContent: { padding: 16, paddingBottom: 48 },
  title: { fontWeight: '700', fontFamily: fonts.bold, color: colors.textPrimary, marginBottom: 4 },
  subtitle: { color: colors.textSecondary, marginBottom: 24 },
  formCard: { marginBottom: 24, backgroundColor: colors.white, borderRadius: 16 },
  formTitle: { fontWeight: '600', fontFamily: fonts.semiBold, color: colors.textPrimary, marginBottom: 8 },
  fieldLabel: { color: colors.textSecondary, marginBottom: 8, marginTop: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hourScroll: { maxHeight: 44, marginBottom: 8 },
  hourScrollContent: { gap: 8, alignItems: 'center' },
  errorText: { color: colors.error, marginTop: 8, marginBottom: 8 },
  addButton: { marginTop: 12, borderRadius: 10 },
  sectionTitle: { fontWeight: '600', fontFamily: fonts.semiBold, color: colors.textPrimary, marginBottom: 12 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  loadingText: { color: colors.textSecondary },
  dayCard: { marginBottom: 8, backgroundColor: colors.white, borderRadius: 14 },
  dayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  dayLabel: { fontWeight: '600', fontFamily: fonts.semiBold, color: colors.textPrimary },
  dayAbbrev: { fontWeight: '600', color: colors.textSecondary },
  noSlotsText: { color: colors.textSecondary, fontStyle: 'italic' },
  slotRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4, borderTopWidth: 1, borderTopColor: colors.surfaceVariant },
  slotTime: { fontWeight: '500', fontFamily: fonts.medium, color: colors.textPrimary },
  deleteButton: { width: 28, height: 28, borderRadius: 14, backgroundColor: `${colors.error}18`, alignItems: 'center', justifyContent: 'center' },
  deleteButtonText: { color: colors.error, fontWeight: '600' },
});
