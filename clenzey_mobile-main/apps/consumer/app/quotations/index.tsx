import { useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Quotation } from '@clenzey/types';
import { Card, Text, Button, Chip, FAB } from 'react-native-paper';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { File01Icon } from '@hugeicons/core-free-icons';
import { colors, IconCircle } from '@clenzey/design-system';
import { sharedPaperStyles } from '../../src/styles/paperControls';
import { quotationsApi } from '../../src/lib/api';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getStatusColor(status: string): string {
  switch (status.toUpperCase()) {
    case 'PENDING': return '#F59E0B';
    case 'ACCEPTED': return colors.success;
    case 'CANCELLED':
    case 'REJECTED': return colors.error;
    case 'COMPLETED': return colors.primary;
    default: return colors.textSecondary;
  }
}

function formatStatus(status: string): string {
  return status.split('_').map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
}

function QuotationListItem({
  quotation,
  onAccept,
  onCancel,
  isAccepting,
  isCancelling,
}: {
  quotation: Quotation;
  onAccept: (id: string) => void;
  onCancel: (id: string) => void;
  isAccepting: boolean;
  isCancelling: boolean;
}) {
  const isPending = quotation.status.toUpperCase() === 'PENDING';
  return (
    <Card style={styles.quotationCard} mode="outlined">
      <Card.Content>
        <View style={styles.cardHeader}>
          <Text variant="titleSmall" style={styles.quotationName} numberOfLines={1}>{quotation.name}</Text>
          <Chip compact textStyle={styles.chipText} style={{ backgroundColor: getStatusColor(quotation.status) }}>
            {formatStatus(quotation.status)}
          </Chip>
        </View>
        <View style={styles.cardBody}>
          <InfoRow label="Phone" value={quotation.phone} />
          <InfoRow label="Date" value={formatDate(quotation.createdAt)} />
          {quotation.address && <InfoRow label="Address" value={quotation.address} />}
          {quotation.preferredTime && <InfoRow label="Preferred Time" value={quotation.preferredTime} />}
        </View>
        {isPending && (
          <View style={styles.actionRow}>
            <Button mode="contained" compact onPress={() => onAccept(quotation.id)} loading={isAccepting} disabled={isAccepting || isCancelling} style={styles.actionBtn} contentStyle={styles.btnContent}>
              Accept
            </Button>
            <Button mode="outlined" compact onPress={() => onCancel(quotation.id)} loading={isCancelling} disabled={isAccepting || isCancelling} textColor={colors.error} style={styles.actionBtn} contentStyle={styles.btnContent}>
              Cancel
            </Button>
          </View>
        )}
      </Card.Content>
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text variant="bodySmall" style={styles.infoLabel}>{label}</Text>
      <Text variant="bodySmall" style={styles.infoValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

export default function QuotationsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: quotations, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['quotations'],
    queryFn: () => quotationsApi.list(),
    select: (response: { data?: Quotation[] } | Quotation[]) => {
      const data = Array.isArray(response) ? response : response?.data;
      return (data ?? []) as Quotation[];
    },
  });

  const acceptMutation = useMutation({
    mutationFn: (id: string) => quotationsApi.accept(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quotations'] }),
    onError: (error: { response?: { data?: { message?: string } } }) => {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to accept quotation.');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => quotationsApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quotations'] }),
    onError: (error: { response?: { data?: { message?: string } } }) => {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to cancel quotation.');
    },
  });

  const handleCancel = useCallback((id: string) => {
    Alert.alert('Cancel Quotation', 'Are you sure you want to cancel this quotation request?', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes, Cancel', style: 'destructive', onPress: () => cancelMutation.mutate(id) },
    ]);
  }, [cancelMutation]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : isError ? (
        <View style={styles.centered}>
          <Text variant="bodyLarge" style={styles.errorText}>Failed to load quotations</Text>
          <Button mode="contained" compact onPress={() => refetch()} contentStyle={styles.btnContent}>Retry</Button>
        </View>
      ) : (
        <FlatList
          data={quotations ?? []}
          renderItem={({ item }) => (
            <QuotationListItem
              quotation={item}
              onAccept={(id) => acceptMutation.mutate(id)}
              onCancel={handleCancel}
              isAccepting={acceptMutation.isPending && acceptMutation.variables === item.id}
              isCancelling={cancelMutation.isPending && cancelMutation.variables === item.id}
            />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <IconCircle icon={File01Icon} size={72} iconSize={36} backgroundColor={colors.tertiary + '50'} />
              <Text variant="titleMedium" style={styles.emptyTitle}>No quotations</Text>
              <Text variant="bodySmall" style={styles.emptySubtitle}>
                You haven't submitted any quotation requests yet.
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[colors.primary]} tintColor={colors.primary} />
          }
        />
      )}
      <FAB
        icon="plus"
        label="New Request"
        style={styles.fab}
        onPress={() => router.push('/quotations/create')}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  listContent: { padding: 16, paddingBottom: 88 },
  quotationCard: { marginBottom: 12, borderRadius: 14 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  quotationName: { color: colors.textPrimary, fontWeight: '600', flex: 1, marginRight: 8 },
  chipText: { color: colors.white, fontSize: 10, fontWeight: '700' },
  cardBody: { gap: 4 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between' },
  infoLabel: { color: colors.textSecondary },
  infoValue: { color: colors.textPrimary, fontWeight: '500', flex: 1, textAlign: 'right', marginLeft: 12 },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  actionBtn: { flex: 1, borderRadius: 10 },
  btnContent: sharedPaperStyles.buttonContent,
  emptyContainer: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyTitle: { color: colors.textPrimary, fontWeight: '700' },
  emptySubtitle: { color: colors.textSecondary, textAlign: 'center' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText: { color: colors.error },
  fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: colors.primary },
});
