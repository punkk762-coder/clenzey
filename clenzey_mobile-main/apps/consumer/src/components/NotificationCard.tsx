import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { HugeiconsIcon } from '@hugeicons/react-native';
import {
  Alert02Icon,
  Calendar01Icon,
  CheckmarkCircle01Icon,
  CreditCardAcceptIcon,
  Notification03Icon,
} from '@hugeicons/core-free-icons';
import type { Notification } from '@clenzey/types';
import { colors, fonts, getSemanticTone, type SemanticTone } from '@clenzey/design-system';
import {
  formatNotificationBody,
  formatNotificationTimestamp,
  formatNotificationTitle,
  getNotificationTone,
} from '../utils/notification-display';

interface NotificationCardProps {
  notification: Notification;
  onPress: (notification: Notification) => void;
}

function getNotificationIcon(tone: SemanticTone, type?: string | null) {
  const normalizedType = (type ?? '').toLowerCase();

  if (normalizedType.includes('payment')) return CreditCardAcceptIcon;
  if (normalizedType.includes('cancel') || tone === 'error') return Alert02Icon;
  if (normalizedType.includes('completed') || tone === 'success') return CheckmarkCircle01Icon;
  if (normalizedType.includes('booking') || tone === 'info') return Calendar01Icon;

  return Notification03Icon;
}

export function NotificationCard({ notification, onPress }: NotificationCardProps) {
  const tone = getNotificationTone(notification);
  const semantic = getSemanticTone(tone);
  const icon = getNotificationIcon(tone, notification.type);
  const title = formatNotificationTitle(notification.title);
  const body = formatNotificationBody(notification.body);
  const timestamp = formatNotificationTimestamp(notification.createdAt);

  return (
    <Pressable
      onPress={() => onPress(notification)}
      accessibilityRole="button"
      accessibilityState={{ selected: !notification.isRead }}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: notification.isRead ? colors.white : semantic.background,
          borderColor: notification.isRead ? '#E5E7EB' : semantic.border,
        },
        pressed && styles.cardPressed,
      ]}
    >
      {!notification.isRead ? (
        <View style={[styles.unreadBar, { backgroundColor: semantic.foreground }]} />
      ) : null}

      <View style={styles.content}>
        <View
          style={[
            styles.iconWrap,
            {
              backgroundColor: `${semantic.foreground}14`,
              borderColor: semantic.border,
            },
          ]}
        >
          <HugeiconsIcon icon={icon} size={20} color={semantic.foreground} strokeWidth={1.5} />
        </View>

        <View style={styles.textBlock}>
          <View style={styles.titleRow}>
            <Text
              variant="titleSmall"
              style={[
                styles.title,
                !notification.isRead && styles.titleUnread,
                { color: notification.isRead ? colors.textPrimary : semantic.foreground },
              ]}
              numberOfLines={1}
            >
              {title}
            </Text>
            {!notification.isRead ? (
              <View style={[styles.unreadDot, { backgroundColor: semantic.foreground }]} />
            ) : null}
          </View>

          {body ? (
            <Text variant="bodySmall" style={styles.body} numberOfLines={2}>
              {body}
            </Text>
          ) : null}

          <Text variant="labelSmall" style={styles.timestamp}>
            {timestamp}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 10,
  },
  cardPressed: {
    opacity: 0.92,
  },
  unreadBar: {
    height: 3,
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginTop: 1,
  },
  textBlock: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    flex: 1,
    fontFamily: fonts.semiBold,
    fontWeight: '600',
    fontSize: 15,
  },
  titleUnread: {
    fontFamily: fonts.bold,
    fontWeight: '700',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  body: {
    color: colors.textSecondary,
    lineHeight: 18,
    fontFamily: fonts.regular,
  },
  timestamp: {
    color: colors.textSecondary,
    marginTop: 2,
    fontFamily: fonts.regular,
  },
});
