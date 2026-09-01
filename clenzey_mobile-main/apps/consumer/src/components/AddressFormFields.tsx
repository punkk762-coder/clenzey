import { View, StyleSheet, Pressable } from 'react-native';
import { Control, Controller, FieldErrors, UseFormSetValue } from 'react-hook-form';
import { TextInput, Text } from 'react-native-paper';
import { HugeiconsIcon } from '@hugeicons/react-native';
import {
  Home01Icon,
  Building01Icon,
  Location04Icon,
} from '@hugeicons/core-free-icons';
import { AddressType } from '@clenzey/types';
import { Button, colors, fonts } from '@clenzey/design-system';
import { sharedPaperStyles } from '../styles/paperControls';
import type { AddressFormData } from '../schemas/address';
import { PlaceSearch, type PlaceSearchResult } from './PlaceSearch';

const ADDRESS_TYPES: { type: AddressType; label: string; icon: typeof Home01Icon }[] = [
  { type: 'HOME', label: 'Home', icon: Home01Icon },
  { type: 'WORK', label: 'Work', icon: Building01Icon },
  { type: 'OTHER', label: 'Other', icon: Location04Icon },
];

interface AddressFormFieldsProps {
  control: Control<AddressFormData>;
  errors: FieldErrors<AddressFormData>;
  selectedType: AddressType;
  setValue: UseFormSetValue<AddressFormData>;
  onPlaceSelect: (result: PlaceSearchResult) => void;
  onUseCurrentLocation: () => void;
  isLoadingCurrentLocation?: boolean;
}

export function AddressFormFields({
  control,
  errors,
  selectedType,
  setValue,
  onPlaceSelect,
  onUseCurrentLocation,
  isLoadingCurrentLocation = false,
}: AddressFormFieldsProps) {
  return (
    <>
      <View style={styles.locationSection}>
        <Text style={styles.sectionTitle}>Find Location</Text>
        <Text style={styles.sectionHint}>Search or use GPS to pin your address on the map</Text>
        <PlaceSearch
          onPlaceSelect={onPlaceSelect}
          placeholder="Search area, street, or landmark..."
        />
        <Button
          title="Use Current Location"
          variant="secondary"
          size="sm"
          loading={isLoadingCurrentLocation}
          disabled={isLoadingCurrentLocation}
          onPress={onUseCurrentLocation}
          style={styles.currentLocationBtn}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Address Type</Text>
        <View style={styles.typeRow}>
          {ADDRESS_TYPES.map((item) => {
            const isActive = selectedType === item.type;
            return (
              <Pressable
                key={item.type}
                style={({ pressed }) => [
                  styles.typeCard,
                  isActive && styles.typeCardActive,
                  pressed && styles.typeCardPressed,
                ]}
                onPress={() => setValue('addressType', item.type, { shouldDirty: true })}
                accessibilityRole="radio"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={item.label}
              >
                <View style={[styles.typeIconWrap, isActive && styles.typeIconWrapActive]}>
                  <HugeiconsIcon
                    icon={item.icon}
                    size={14}
                    color={isActive ? colors.white : colors.primary}
                    strokeWidth={1.5}
                  />
                </View>
                <Text style={[styles.typeLabel, isActive && styles.typeLabelActive]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Controller
          control={control}
          name="label"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label="Label"
              placeholder="e.g. My Home"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={!!errors.label}
              mode="outlined"
              dense
              style={styles.input}
              contentStyle={styles.inputContent}
              outlineColor={colors.tertiary}
              activeOutlineColor={colors.primary}
              maxLength={50}
            />
          )}
        />
        {errors.label ? <Text style={styles.errorText}>{errors.label.message}</Text> : null}
      </View>

      <View style={styles.section}>
        <Controller
          control={control}
          name="line1"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label="Address Line 1"
              placeholder="House/Flat, Street"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={!!errors.line1}
              mode="outlined"
              dense
              style={styles.input}
              contentStyle={styles.inputContent}
              outlineColor={colors.tertiary}
              activeOutlineColor={colors.primary}
            />
          )}
        />
        {errors.line1 ? <Text style={styles.errorText}>{errors.line1.message}</Text> : null}
      </View>

      <View style={styles.section}>
        <Controller
          control={control}
          name="line2"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label="Address Line 2 (optional)"
              placeholder="Building, Area"
              value={value ?? ''}
              onChangeText={(t) => onChange(t || undefined)}
              onBlur={onBlur}
              mode="outlined"
              dense
              style={styles.input}
              contentStyle={styles.inputContent}
              outlineColor={colors.tertiary}
              activeOutlineColor={colors.primary}
            />
          )}
        />
      </View>

      <View style={styles.section}>
        <Controller
          control={control}
          name="landmark"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label="Landmark (optional)"
              placeholder="Near park, opposite mall"
              value={value ?? ''}
              onChangeText={(t) => onChange(t || undefined)}
              onBlur={onBlur}
              mode="outlined"
              dense
              style={styles.input}
              contentStyle={styles.inputContent}
              outlineColor={colors.tertiary}
              activeOutlineColor={colors.primary}
            />
          )}
        />
      </View>

      <View style={styles.row}>
        <View style={styles.halfField}>
          <Controller
            control={control}
            name="city"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="City"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={!!errors.city}
                mode="outlined"
                dense
                style={styles.input}
                contentStyle={styles.inputContent}
                outlineColor={colors.tertiary}
                activeOutlineColor={colors.primary}
              />
            )}
          />
          {errors.city ? <Text style={styles.errorText}>{errors.city.message}</Text> : null}
        </View>
        <View style={styles.halfField}>
          <Controller
            control={control}
            name="state"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="State"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={!!errors.state}
                mode="outlined"
                dense
                style={styles.input}
                contentStyle={styles.inputContent}
                outlineColor={colors.tertiary}
                activeOutlineColor={colors.primary}
              />
            )}
          />
          {errors.state ? <Text style={styles.errorText}>{errors.state.message}</Text> : null}
        </View>
      </View>

      <View style={styles.section}>
        <Controller
          control={control}
          name="pincode"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label="Pincode"
              placeholder="e.g. 400001"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={!!errors.pincode}
              mode="outlined"
              dense
              style={styles.input}
              contentStyle={styles.inputContent}
              outlineColor={colors.tertiary}
              activeOutlineColor={colors.primary}
              keyboardType="numeric"
              maxLength={8}
            />
          )}
        />
        {errors.pincode ? <Text style={styles.errorText}>{errors.pincode.message}</Text> : null}
      </View>
    </>
  );
}

export const addressFormStyles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.surface },
  mapHero: {
    position: 'relative',
    backgroundColor: colors.white,
  },
  scroll: { flex: 1 },
  content: { paddingBottom: 16, paddingTop: 0 },
  section: { paddingHorizontal: 16, marginTop: 16 },
  sectionTitle: {
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 6,
    fontSize: 13,
    fontFamily: fonts.semiBold,
  },
  sectionHint: {
    color: colors.textSecondary,
    fontSize: 11,
    marginBottom: 10,
    lineHeight: 16,
  },
  locationSection: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
    zIndex: 20,
  },
  currentLocationBtn: {
    marginTop: 10,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: colors.white,
    minHeight: 36,
  },
  typeCardActive: {
    borderColor: colors.primary,
    backgroundColor: '#F8FAFF',
  },
  typeCardPressed: {
    opacity: 0.92,
  },
  typeIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeIconWrapActive: {
    backgroundColor: colors.primary,
  },
  typeLabel: {
    fontSize: 11,
    fontFamily: fonts.semiBold,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  typeLabelActive: {
    color: colors.primary,
  },
  input: { backgroundColor: colors.white, ...sharedPaperStyles.input },
  inputContent: sharedPaperStyles.inputContent,
  row: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginTop: 16 },
  halfField: { flex: 1 },
  errorText: { color: colors.error, marginTop: 2, marginLeft: 4, fontSize: 11 },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  saveBtn: { borderRadius: 10 },
  saveBtnContent: sharedPaperStyles.buttonContent,
  saveBtnLabel: sharedPaperStyles.buttonLabel,
});

const styles = addressFormStyles;
