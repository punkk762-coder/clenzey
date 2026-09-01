import { useCallback, useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Text, Button } from 'react-native-paper';
import { HugeiconsIcon } from '@hugeicons/react-native';
import {
  Location01Icon,
  Edit02Icon,
  Delete02Icon,
  Add01Icon,
} from '@hugeicons/core-free-icons';
import { Address } from '@clenzey/types';
import { createAddressesEndpoints, createLocationEndpoints, ServiceabilityResponse } from '@clenzey/api-client';
import { colors, IconCircle, DecoratedCard, fonts } from '@clenzey/design-system';
import { sharedPaperStyles } from '../../../src/styles/paperControls';
import { apiClient } from '../../../src/lib/api';
import { useAddressStore } from '../../../src/store/address';
import { useAuthStore } from '../../../src/store/auth';
import { normalizeAddressList } from '../../../src/utils/address-response';
import { ServiceabilityBadge } from '../../../src/components/ServiceabilityBadge';

const addressesApi = createAddressesEndpoints(apiClient);
const locationApi = createLocationEndpoints(apiClient);

export default function AddressesScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [serviceabilityMap, setServiceabilityMap] = useState<Record<string, ServiceabilityResponse>>({});

  const { data: addresses, isLoading, isRefetching, refetch } = useQuery<Address[]>({
    queryKey: ['addresses'],
    queryFn: async () => {
      const result = await addressesApi.list();
      const addressList = normalizeAddressList(result);
      addressList.forEach((addr) => {
        if (addr.latitude != null && addr.longitude != null && !serviceabilityMap[addr.id]) {
          checkServiceability(addr.id, addr.latitude, addr.longitude);
        }
      });
      return addressList;
    },
  });

  const checkServiceability = async (addressId: string, lat: number, lng: number) => {
    try {
      const response = await locationApi.serviceability(lat, lng);
      const data = response as unknown as ServiceabilityResponse;
      setServiceabilityMap((prev) => ({ ...prev, [addressId]: data }));
    } catch {}
  };

  const setDefaultMutation = useMutation({
    mutationFn: (addressId: string) => addressesApi.setDefault(addressId) as unknown as Promise<Address>,
    onMutate: async (addressId) => {
      await queryClient.cancelQueries({ queryKey: ['addresses'] });
      const previousAddresses = queryClient.getQueryData<Address[]>(['addresses']);
      queryClient.setQueryData<Address[]>(['addresses'], (old) =>
        old?.map((addr) => ({ ...addr, isDefault: addr.id === addressId })) ?? [],
      );
      return { previousAddresses };
    },
    onError: (_error, _id, context) => {
      if (context?.previousAddresses) queryClient.setQueryData(['addresses'], context.previousAddresses);
      Alert.alert('Error', 'Failed to set default address');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['addresses'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (addressId: string) => addressesApi.delete(addressId) as unknown as Promise<void>,
    onSuccess: async (_data, addressId) => {
      if (useAddressStore.getState().selectedAddressId === addressId) {
        const userId = useAuthStore.getState().user?.id;
        if (userId) {
          await useAddressStore.getState().clearPersistedSelection(userId);
        } else {
          useAddressStore.getState().clearInMemorySelection();
        }
      }
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
    },
    onError: () => Alert.alert('Error', 'Failed to delete address'),
  });

  const handleDelete = useCallback((addressId: string, label: string) => {
    Alert.alert('Delete Address', `Delete "${label}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(addressId) },
    ]);
  }, [deleteMutation]);

  const renderItem = useCallback(({ item }: { item: Address }) => {
    const serviceability = serviceabilityMap[item.id];
    return (
      <DecoratedCard selected={item.isDefault}>
        <View style={styles.cardHeader}>
          <View style={styles.labelRow}>
            <HugeiconsIcon icon={Location01Icon} size={14} color={colors.primary} strokeWidth={1.5} />
            <Text style={styles.label}>{item.label}</Text>
            {item.isDefault && (
              <View style={styles.defaultBadge}>
                <Text style={styles.defaultBadgeText}>Default</Text>
              </View>
            )}
          </View>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{item.addressType}</Text>
          </View>
        </View>
        <Text style={styles.line1}>
          {item.line1}
          {item.line2 ? `, ${item.line2}` : ''}
        </Text>
        <Text style={styles.cityState}>
          {item.city}, {item.state} - {item.pincode}
        </Text>
        {serviceability && (
          <View style={styles.serviceabilityRow}>
            <ServiceabilityBadge isServiceable={serviceability.isServiceable} message={serviceability.message} />
          </View>
        )}
        <View style={[styles.actionsRow, item.isDefault && styles.actionsRowSelected]}>
          <Button
            mode="text"
            compact
            onPress={() => router.push(`/address/${item.id}/edit`)}
            labelStyle={styles.actionLabel}
            icon={() => <HugeiconsIcon icon={Edit02Icon} size={14} color={colors.primary} strokeWidth={1.5} />}
          >
            Edit
          </Button>
          <Button
            mode="text"
            compact
            textColor={colors.error}
            onPress={() => handleDelete(item.id, item.label)}
            labelStyle={styles.actionLabel}
            icon={() => <HugeiconsIcon icon={Delete02Icon} size={14} color={colors.error} strokeWidth={1.5} />}
          >
            Delete
          </Button>
          {!item.isDefault && (
            <Button mode="text" compact onPress={() => setDefaultMutation.mutate(item.id)} labelStyle={styles.actionLabel}>
              Set Default
            </Button>
          )}
        </View>
      </DecoratedCard>
    );
  }, [serviceabilityMap, router, handleDelete, setDefaultMutation]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.headerCopy}>
        <Text style={styles.headerTitle}>Saved addresses</Text>
        <Text style={styles.headerSubtitle}>Manage delivery locations for your bookings</Text>
      </View>
      <FlatList
        style={styles.list}
        data={addresses ?? []}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <IconCircle icon={Location01Icon} size={64} iconSize={32} backgroundColor={colors.tertiary + '50'} />
              <Text style={styles.emptyTitle}>No addresses yet</Text>
              <Text style={styles.emptySubtitle}>
                Add an address to get started with bookings
              </Text>
            </View>
          ) : null
        }
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[colors.primary]} tintColor={colors.primary} />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
      <View style={styles.footer}>
        <Button
          mode="contained" compact
          onPress={() => router.push('/address/create')}
          icon={() => <HugeiconsIcon icon={Add01Icon} size={16} color={colors.white} strokeWidth={2} />}
          style={styles.addBtn}
          contentStyle={styles.addBtnContent}
          labelStyle={styles.footerBtnLabel}
        >
          Add Address
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  headerCopy: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 },
  headerTitle: { color: colors.textPrimary, fontFamily: fonts.bold, fontWeight: '700', fontSize: 13 },
  headerSubtitle: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },
  list: { flex: 1 },
  listContent: { padding: 16, flexGrow: 1, paddingBottom: 16, paddingTop: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, flexWrap: 'wrap' },
  label: { color: colors.textPrimary, fontFamily: fonts.bold, fontWeight: '700', fontSize: 13 },
  defaultBadge: {
    backgroundColor: colors.tertiary,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    height: 18,
    justifyContent: 'center',
  },
  defaultBadgeText: { color: colors.primary, fontSize: 9, fontFamily: fonts.bold, fontWeight: '700', lineHeight: 12 },
  typeBadge: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: colors.white,
  },
  typeBadgeText: {
    color: colors.textSecondary,
    fontSize: 9,
    fontFamily: fonts.semiBold,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  line1: { color: colors.textSecondary, marginBottom: 2, fontSize: 11, lineHeight: 16, fontFamily: fonts.regular, alignSelf: 'stretch' },
  cityState: { color: colors.textSecondary, fontSize: 11, lineHeight: 15, fontFamily: fonts.regular, alignSelf: 'stretch' },
  serviceabilityRow: { marginTop: 6 },
  actionsRow: {
    flexDirection: 'row',
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 8,
  },
  actionsRowSelected: {
    borderTopColor: '#CBD5E1',
  },
  actionLabel: { fontSize: 11, fontWeight: '600', marginVertical: 0 },
  separator: { height: 10 },
  emptyContainer: { alignItems: 'center', paddingVertical: 48, gap: 6 },
  emptyTitle: { color: colors.textPrimary, fontFamily: fonts.bold, fontWeight: '700', fontSize: 14 },
  emptySubtitle: { color: colors.textSecondary, textAlign: 'center', fontSize: 11, paddingHorizontal: 32 },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: colors.white,
  },
  addBtn: { borderRadius: 10 },
  addBtnContent: sharedPaperStyles.buttonContent,
  footerBtnLabel: sharedPaperStyles.buttonLabel,
});
