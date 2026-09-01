import { useCallback, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Text, Card, Button, Chip, Divider, TextInput } from 'react-native-paper';
import { colors, materialStyle, fonts } from '@clenzey/design-system';
import type { Assignment } from '@clenzey/types';
import { createPartnersEndpoints } from '@clenzey/api-client';
import { apiClient } from '../../src/lib/api';
import { sharedPaperStyles } from '../../src/styles/paperControls';

const partnersApi = createPartnersEndpoints(apiClient);

export default function AssignmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [declineReason, setDeclineReason] = useState('');
  const [showDeclineInput, setShowDeclineInput] = useState(false);

  const assignmentQuery = useQuery({
    queryKey: ['assignments', 'detail', id],
    queryFn: async () => {
      const response = await partnersApi.getAssignments();
      const assignments = (Array.isArray(response) ? response : []) as Assignment[];
      const assignment = assignments.find((a) => a.id === id);
      if (!assignment) throw new Error('Assignment not found');
      return assignment;
    },
    enabled: !!id,
  });

  const acceptMutation = useMutation({
    mutationFn: () => partnersApi.acceptAssignment(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      Alert.alert('Accepted', 'You have accepted this assignment.', [{ text: 'OK', onPress: () => router.back() }]);
    },
    onError: () => Alert.alert('Error', 'Failed to accept the assignment. Please try again.'),
  });

  const declineMutation = useMutation({
    mutationFn: (reason?: string) => partnersApi.declineAssignment(id!, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      Alert.alert('Declined', 'You have declined this assignment.', [{ text: 'OK', onPress: () => router.back() }]);
    },
    onError: () => Alert.alert('Error', 'Failed to decline the assignment. Please try again.'),
  });

  const handleAccept = useCallback(() => {
    Alert.alert('Accept Assignment', 'Are you sure you want to accept this assignment?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Accept', onPress: () => acceptMutation.mutate() },
    ]);
  }, [acceptMutation]);

  const handleDecline = useCallback(() => {
    if (!showDeclineInput) {
      setShowDeclineInput(true);
      return;
    }
    const reason = declineReason.trim() || undefined;
    Alert.alert('Decline Assignment', 'Are you sure you want to decline this assignment?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Decline', style: 'destructive', onPress: () => declineMutation.mutate(reason) },
    ]);
  }, [showDeclineInput, declineReason, declineMutation]);

  if (assignmentQuery.isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (assignmentQuery.isError || !assignmentQuery.data) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text variant="bodyLarge" style={styles.errorText}>Assignment not found</Text>
          <Button mode="outlined" onPress={() => router.back()} textColor={colors.primary}>Go Back</Button>
        </View>
      </SafeAreaView>
    );
  }

  const assignment = assignmentQuery.data;
  const booking = assignment.booking;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text variant="headlineSmall" style={styles.title}>Assignment Details</Text>
          <Chip compact style={assignment.status === 'PROPOSED' ? styles.pendingChip : styles.activeChip}>
            {assignment.status}
          </Chip>
        </View>

        <Card style={[styles.section, materialStyle('card')]} mode="elevated">
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>Booking Information</Text>
            <Divider style={styles.divider} />
            <View style={styles.infoRow}>
              <Text variant="bodyMedium" style={styles.infoLabel}>Service</Text>
              <Text variant="bodyMedium" style={styles.infoValue}>
                {booking?.bookingName ?? `Booking #${booking?.id?.slice(0, 8) ?? assignment.bookingId.slice(0, 8)}`}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text variant="bodyMedium" style={styles.infoLabel}>Type</Text>
              <Text variant="bodyMedium" style={styles.infoValue}>
                {booking?.bookingType === 'SCHEDULED' ? 'Scheduled' : 'Instant'}
              </Text>
            </View>
            {booking?.scheduledAt && (
              <View style={styles.infoRow}>
                <Text variant="bodyMedium" style={styles.infoLabel}>Scheduled At</Text>
                <Text variant="bodyMedium" style={styles.infoValue}>{formatDateTime(booking.scheduledAt)}</Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <Text variant="bodyMedium" style={styles.infoLabel}>Payment Mode</Text>
              <Text variant="bodyMedium" style={styles.infoValue}>{booking?.paymentMode ?? 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text variant="bodyMedium" style={styles.infoLabel}>Amount</Text>
              <Text variant="bodyMedium" style={styles.infoValue}>
                {booking?.totalAmount != null ? `₹${booking.totalAmount}` : 'N/A'}
              </Text>
            </View>
          </Card.Content>
        </Card>

        <Card style={[styles.section, materialStyle('card')]} mode="elevated">
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>Service Address</Text>
            <Divider style={styles.divider} />
            <View style={styles.infoRow}>
              <Text variant="bodyMedium" style={styles.infoLabel}>Address ID</Text>
              <Text variant="bodyMedium" style={styles.infoValue}>{booking?.addressId ?? 'N/A'}</Text>
            </View>
          </Card.Content>
        </Card>

        <Card style={[styles.section, materialStyle('card')]} mode="elevated">
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>Service Details</Text>
            <Divider style={styles.divider} />
            <View style={styles.infoRow}>
              <Text variant="bodyMedium" style={styles.infoLabel}>Service ID</Text>
              <Text variant="bodyMedium" style={styles.infoValue}>{booking?.serviceId ?? 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text variant="bodyMedium" style={styles.infoLabel}>Variant ID</Text>
              <Text variant="bodyMedium" style={styles.infoValue}>{booking?.variantId ?? 'N/A'}</Text>
            </View>
            {booking?.consumerNotes && (
              <View style={styles.notesContainer}>
                <Text variant="bodyMedium" style={styles.infoLabel}>Consumer Notes</Text>
                <Text variant="bodyMedium" style={styles.notesText}>{booking.consumerNotes}</Text>
              </View>
            )}
          </Card.Content>
        </Card>

        <Card style={[styles.section, materialStyle('card')]} mode="elevated">
          <Card.Content>
            <View style={styles.infoRow}>
              <Text variant="bodyMedium" style={styles.infoLabel}>Assigned On</Text>
              <Text variant="bodyMedium" style={styles.infoValue}>{formatDateTime(assignment.createdAt)}</Text>
            </View>
          </Card.Content>
        </Card>

        {showDeclineInput && (
          <Card style={[styles.section, materialStyle('card')]} mode="elevated">
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>Decline Reason (Optional)</Text>
              <TextInput
                placeholder="Enter reason for declining (max 500 chars)"
                value={declineReason}
                onChangeText={(text) => setDeclineReason(text.slice(0, 500))}
                multiline
                maxLength={500}
                mode="outlined"
                dense
                outlineStyle={styles.inputOutline}
                style={styles.reasonInput}
                contentStyle={sharedPaperStyles.inputContent}
              />
              <Text variant="bodySmall" style={styles.charCount}>{declineReason.length}/500</Text>
            </Card.Content>
          </Card>
        )}

        {assignment.status === 'PROPOSED' && (
          <View style={styles.actionContainer}>
            <Button
              mode="contained"
              compact
              onPress={handleAccept}
              loading={acceptMutation.isPending}
              disabled={declineMutation.isPending}
              buttonColor={colors.success}
              style={styles.actionButton}
              contentStyle={sharedPaperStyles.buttonContent}
            >
              Accept
            </Button>
            <Button
              mode="outlined"
              compact
              onPress={handleDecline}
              loading={declineMutation.isPending}
              disabled={acceptMutation.isPending}
              textColor={colors.error}
              style={[styles.actionButton, styles.declineButton]}
              contentStyle={sharedPaperStyles.buttonContent}
            >
              {showDeclineInput ? 'Confirm Decline' : 'Decline'}
            </Button>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  scrollContent: { padding: 16, paddingBottom: 32 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16 },
  errorText: { color: colors.textSecondary },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontWeight: '700', fontFamily: fonts.bold, color: colors.textPrimary, flex: 1 },
  pendingChip: { backgroundColor: colors.tertiary },
  activeChip: { backgroundColor: `${colors.primary}20` },
  section: { marginBottom: 12, backgroundColor: colors.white, borderRadius: 16 },
  sectionTitle: { fontWeight: '600', fontFamily: fonts.semiBold, color: colors.textPrimary, marginBottom: 4 },
  divider: { marginBottom: 8 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  infoLabel: { color: colors.textSecondary },
  infoValue: { fontWeight: '500', fontFamily: fonts.medium, color: colors.textPrimary, flex: 1, textAlign: 'right', marginLeft: 8 },
  notesContainer: { paddingVertical: 8 },
  notesText: { color: colors.textPrimary, marginTop: 4, lineHeight: 20 },
  reasonInput: { backgroundColor: colors.white, marginTop: 8 },
  inputOutline: { borderRadius: 10 },
  charCount: { color: colors.textSecondary, textAlign: 'right', marginTop: 4 },
  actionContainer: { marginTop: 24, gap: 12 },
  actionButton: { borderRadius: 10 },
  declineButton: { borderColor: colors.error },
});
