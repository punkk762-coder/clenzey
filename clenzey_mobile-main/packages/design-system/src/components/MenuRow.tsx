import { View, StyleSheet } from 'react-native';
import { List, Badge } from 'react-native-paper';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { colors, getSemanticTone, type SemanticTone } from '../theme';
import { fonts } from '../theme/fonts';

interface MenuRowProps {
  title: string;
  icon: Parameters<typeof HugeiconsIcon>[0]['icon'];
  onPress: () => void;
  badge?: string | number;
  destructive?: boolean;
  tone?: SemanticTone;
  compact?: boolean;
}

export function MenuRow({
  title,
  icon,
  onPress,
  badge,
  destructive,
  tone,
  compact,
}: MenuRowProps) {
  const resolvedTone: SemanticTone = destructive ? 'error' : tone ?? 'primary';
  const semantic = tone != null || destructive ? getSemanticTone(resolvedTone) : null;
  const tint = destructive ? colors.error : semantic?.foreground ?? colors.primary;
  const bg = destructive ? '#FEE2E2' : semantic?.background ?? colors.chipInactive;
  const iconBorder = semantic?.border;
  const iconSize = compact ? 36 : 44;
  const glyphSize = compact ? 18 : 20;

  return (
    <List.Item
      title={title}
      onPress={onPress}
      left={() => (
        <View
          style={[
            styles.iconWrap,
            {
              backgroundColor: bg,
              width: iconSize,
              height: iconSize,
              borderRadius: iconSize / 2,
            },
            iconBorder ? { borderWidth: 1, borderColor: iconBorder } : null,
          ]}
        >
          <HugeiconsIcon icon={icon} size={glyphSize} color={tint} strokeWidth={1.5} />
        </View>
      )}
      right={(props) => (
        <View style={[props.style, styles.rightWrap]}>
          {badge != null && badge !== 0 ? (
            <Badge size={20} style={[styles.badge, semantic ? { backgroundColor: semantic.foreground } : null]}>
              {String(badge)}
            </Badge>
          ) : null}
          <HugeiconsIcon
            icon={ArrowRight01Icon}
            size={18}
            color={colors.textSecondary}
            strokeWidth={1.5}
          />
        </View>
      )}
      titleStyle={[
        styles.title,
        compact && styles.titleCompact,
        destructive && styles.destructive,
        semantic ? { color: semantic.foreground } : null,
      ]}
      style={[
        styles.item,
        compact && styles.itemCompact,
        semantic
          ? {
              backgroundColor: semantic.background,
              borderColor: semantic.border,
              borderWidth: 1,
              marginBottom: 8,
            }
          : null,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  item: {
    paddingVertical: 4,
    borderRadius: 12,
  },
  itemCompact: {
    paddingVertical: 2,
    minHeight: 52,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  rightWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginRight: 4,
  },
  badge: {
    backgroundColor: colors.error,
    alignSelf: 'center',
  },
  title: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.textPrimary,
  },
  titleCompact: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    fontWeight: '600',
  },
  destructive: {
    color: colors.error,
  },
});
