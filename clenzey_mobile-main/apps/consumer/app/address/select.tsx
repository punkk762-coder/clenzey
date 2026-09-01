import { useCallback, useState } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Text, Button } from 'react-native-paper';
import { HugeiconsIcon } from '@hugeicons/react-native';
import {
  Location01Icon,
  Add01Icon,
  CheckmarkCircle01Icon,
} from '@hugeicons/core-free-icons';
import { Address } from '@clenzey/types';
import { createAddressesEndpoints } from '@clenzey/api-client';
import { colors, IconCircle, fonts, DecoratedCard } from '@clenzey/design-system';
import { sharedPaperStyles } from '../../src/styles/paperControls';
import { StackBackButton, stackHeaderChrome } from '../../src/components/StackBackButton';
import { apiClient } from '../../src/lib/api';
import { useAddressStore } from '../../src/store/address';
import { useAuthStore } from '../../src/store/auth';
import { normalizeAddressList } from '../../src/utils/address-response';

const addressesApi = createAddressesEndpoints(apiClient);

export default function SelectAddressScreen() {
  const router = useRouter();
  const { required } = useLocalSearchParams<{ required?: string }>();
  const isRequired = required === 'true';

  const storedAddressId = useAddressStore((state) => state.selectedAddressId);
  const persistSelectedAddressId = useAddressStore((state) => state.persistSelectedAddressId);
  const [pendingAddressId, setPendingAddressId] = useState<string | null>(storedAddressId);

  const { data: addresses, isLoading } = useQuery<Address[]>({
    queryKey: ['addresses'],
    queryFn: async () => {
      const result = await addressesApi.list();
      return normalizeAddressList(result);
    },
  });

  const handleContinue = useCallback(async () => {
    if (!pendingAddressId) return;
    const userId = useAuthStore.getState().user?.id;
    if (userId) {
      await persistSelectedAddressId(userId, pendingAddressId);
    } else {
      useAddressStore.getState().setSelectedAddressId(pendingAddressId);
    }
    if (isRequired) {
      router.replace('/(tabs)');
    } else {
      router.back();
    }
  }, [pendingAddressId, isRequired, router, persistSelectedAddressId]);

  const handleAddAddress = useCallback(() => {
    const returnTo = isRequired ? 'tabs' : 'select';
    router.push(`/address/create?returnTo=${returnTo}`);
  }, [isRequired, router]);

  const renderItem = useCallback(({ item }: { item: Address }) => {
    const isActive = item.id === pendingAddressId;
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setPendingAddressId(item.id)}
      >
        <DecoratedCard selected={isActive} contentStyle={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={[styles.radio, isActive && styles.radioSelected]}>
              {isActive && <View style={styles.radioFill} />}
            </View>
            <View style={styles.cardBody}>
              <View style={styles.labelRow}>
                <HugeiconsIcon icon={Location01Icon} size={14} color={colors.primary} strokeWidth={1.5} />
                <Text style={[styles.label, isActive && styles.labelActive]}>
                  {item.label}
                </Text>
                {item.isDefault && (
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultChipText}>Default</Text>
                  </View>
                )}
              </View>
              <Text variant="labelSmall" style={styles.line1}>
                {item.line1}
                {item.line2 ? `, ${item.line2}` : ''}
              </Text>
              <Text variant="labelSmall" style={styles.cityState}>
                {item.city}, {item.state} - {item.pincode}
              </Text>
            </View>
            <View style={styles.checkmarkSlot}>
              {isActive && (
                <HugeiconsIcon icon={CheckmarkCircle01Icon} size={18} color={colors.primary} strokeWidth={2} />
              )}
            </View>
          </View>
        </DecoratedCard>
      </TouchableOpacity>
    );
  }, [pendingAddressId]);

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Select Address',
          headerTitleAlign: 'center',
          headerTintColor: colors.textPrimary,
          headerStyle: { backgroundColor: colors.white },
          headerTitleStyle: {
            fontFamily: fonts.bold,
            fontWeight: '700',
            fontSize: 16,
          },
          gestureEnabled: !isRequired,
          ...(isRequired
            ? { headerBackVisible: false }
            : {
                ...stackHeaderChrome,
                headerLeft: () => <StackBackButton fallbackRoute="/(tabs)" />,
              }),
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.headerCopy}>
          <Text variant="titleSmall" style={styles.title}>
            {isRequired ? 'Where should we serve you?' : 'Choose a delivery address'}
          </Text>
          <Text variant="labelSmall" style={styles.subtitle}>
            Select an address to continue or add a new one
          </Text>
        </View>

        <FlatList
          data={addresses ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            !isLoading ? (
              <View style={styles.emptyContainer}>
                <IconCircle icon={Location01Icon} size={72} iconSize={36} backgroundColor={colors.tertiary + '50'} />
                <Text variant="titleMedium" style={styles.emptyTitle}>No addresses yet</Text>
                <Text variant="bodySmall" style={styles.emptySubtitle}>
                  Add your first address to start booking services
                </Text>
              </View>
            ) : null
          }
        />

        <View style={styles.footer}>
          <Button
            mode="outlined"
            compact
            onPress={handleAddAddress}
            icon={() => <HugeiconsIcon icon={Add01Icon} size={16} color={colors.primary} strokeWidth={2} />}
            style={styles.addBtn}
            contentStyle={styles.continueBtnContent}
            labelStyle={styles.footerBtnLabel}
          >
            Add New Address
          </Button>
          {(addresses?.length ?? 0) > 0 && (
            <Button
              mode="contained" compact
              onPress={handleContinue}
              disabled={!pendingAddressId}
              style={styles.continueBtn}
              contentStyle={styles.continueBtnContent}
              labelStyle={styles.footerBtnLabel}
            >
              Continue
            </Button>
          )}
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  headerCopy: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10 },
  title: { color: colors.textPrimary, fontWeight: '700', fontSize: 15 },
  subtitle: { color: colors.textSecondary, marginTop: 3, fontSize: 12 },
  listContent: { padding: 16, flexGrow: 1, paddingBottom: 8 },
  cardContent: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  radio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  radioSelected: { borderColor: colors.primary },
  radioFill: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  cardBody: { flex: 1, minWidth: 0 },
  checkmarkSlot: { width: 18, alignItems: 'center', marginTop: 1 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 },
  label: { color: colors.textPrimary, fontFamily: fonts.bold, fontWeight: '700', fontSize: 13 },
  labelActive: { color: colors.primary },
  defaultBadge: {
    backgroundColor: colors.tertiary,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    height: 20,
    justifyContent: 'center',
  },
  defaultChipText: { color: colors.primary, fontSize: 9, fontFamily: fonts.bold, fontWeight: '700', lineHeight: 12 },
  line1: { color: colors.textSecondary, marginBottom: 2, fontSize: 11, lineHeight: 16, alignSelf: 'stretch' },
  cityState: { color: colors.textSecondary, fontSize: 11, lineHeight: 15, alignSelf: 'stretch' },
  separator: { height: 8 },
  emptyContainer: { alignItems: 'center', paddingVertical: 64, gap: 8 },
  emptyTitle: { color: colors.textPrimary, fontWeight: '700', fontSize: 15 },
  emptySubtitle: { color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 24, fontSize: 12 },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: colors.white,
  },
  addBtn: { borderRadius: 10 },
  continueBtn: { borderRadius: 10 },
  continueBtnContent: sharedPaperStyles.buttonContent,
  footerBtnLabel: sharedPaperStyles.buttonLabel,
});
