import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { Clock01Icon } from '@hugeicons/core-free-icons';
import { colors, fonts } from '@clenzey/design-system';
import type { SocketManager } from '@clenzey/socket-client';
import { useBookingEta } from '../hooks/useBookingEta';
import { formatEtaMinutes } from '../utils/eta-response';

interface BookingEtaBannerProps {
  bookingId: string;
  bookingStatus: string;
  socketManager: SocketManager | null;
  destinationLatitude?: number;
  destinationLongitude?: number;
}

export function BookingEtaBanner({
  bookingId,
  bookingStatus,
  socketManager,
  destinationLatitude,
  destinationLongitude,
}: BookingEtaBannerProps) {
  const { etaMinutes, isLoading, isFetching, isPending } = useBookingEta(
    bookingId,
    bookingStatus,
    socketManager,
    { destinationLatitude, destinationLongitude },
  );

  if (bookingStatus !== 'PROFESSIONAL_EN_ROUTE') {
    return null;
  }

  return (
    <View style={styles.banner}>
      <View style={styles.iconWrap}>
        <HugeiconsIcon icon={Clock01Icon} size={16} color={colors.primary} strokeWidth={1.5} />
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.label}>Partner ETA</Text>
        {isLoading || (isPending && isFetching) ? (
          <ActivityIndicator size="small" color={colors.primary} style={styles.loader} />
        ) : etaMinutes != null ? (
          <Text style={styles.value}>Arriving in {formatEtaMinutes(etaMinutes)}</Text>
        ) : isPending ? (
          <Text style={styles.placeholder}>Calculating arrival time...</Text>
        ) : (
          <Text style={styles.placeholder}>ETA unavailable right now</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: `${colors.primary}10`,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: `${colors.primary}20`,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 10,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  value: {
    fontFamily: fonts.bold,
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
  placeholder: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
  },
  loader: {
    alignSelf: 'flex-start',
    marginTop: 2,
  },
});
