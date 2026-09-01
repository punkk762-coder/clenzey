import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View, ViewStyle, TextStyle } from 'react-native';
import { Text } from 'react-native-paper';
import { colors, controlSizes, materialPressedStyle, materialStyle } from '../theme';

export type SegmentTabSize = 'xs' | 'sm' | 'md' | 'lg';
export type SegmentTabLayout = 'equal' | 'wrap' | 'auto';
export type SegmentTabVariant = 'filled' | 'plain';

export interface SegmentTabItem {
  value: string;
  label: string;
  renderIcon?: (active: boolean) => ReactNode;
}

export interface SegmentTabsProps {
  value: string;
  onValueChange: (value: string) => void;
  tabs: SegmentTabItem[];
  size?: SegmentTabSize;
  /** equal: single row with equal-width tabs spread across the row. wrap: flows to multiple rows. auto: content width tabs with horizontal scroll. */
  layout?: SegmentTabLayout;
  /** filled: grey trough background. plain: no container background. */
  variant?: SegmentTabVariant;
  /** Scroll horizontally when tabs overflow — use with variant="plain" for filter rows. */
  scrollable?: boolean;
  style?: ViewStyle;
  tabStyle?: ViewStyle;
}

const SIZE_CONFIG: Record<
  SegmentTabSize,
  { tab: ViewStyle; labelVariant: 'labelSmall' | 'labelMedium' | 'labelLarge'; gap: number; fontSize: number }
> = {
  xs: {
    tab: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, minHeight: 38 },
    labelVariant: 'labelSmall',
    gap: 4,
    fontSize: 12,
  },
  sm: {
    tab: {
      paddingHorizontal: controlSizes.tab.paddingHorizontal,
      paddingVertical: controlSizes.tab.paddingVertical,
      borderRadius: 10,
      minHeight: controlSizes.tab.minHeight,
    },
    labelVariant: 'labelSmall',
    gap: controlSizes.tab.gap,
    fontSize: controlSizes.tab.fontSize,
  },
  md: {
    tab: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, minHeight: 44 },
    labelVariant: 'labelMedium',
    gap: 8,
    fontSize: 14,
  },
  lg: {
    tab: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 10, minHeight: 48 },
    labelVariant: 'labelMedium',
    gap: 10,
    fontSize: 15,
  },
};

export function SegmentTabs({
  value,
  onValueChange,
  tabs,
  size = 'sm',
  layout = 'equal',
  variant = 'filled',
  scrollable = false,
  style,
  tabStyle,
}: SegmentTabsProps) {
  const sizeConfig = SIZE_CONFIG[size];
  const useAutoWidth = layout === 'auto';
  const useScroll = scrollable || layout === 'auto';
  const layoutStyle = useScroll
    ? styles.tabAuto
    : layout === 'wrap'
      ? styles.tabWrap
      : styles.tabEqual;
  const labelStyle = useAutoWidth ? styles.labelAuto : styles.label;

  const renderLabel = (label: string, isActive: boolean) => (
    <Text
      variant={sizeConfig.labelVariant}
      numberOfLines={1}
      adjustsFontSizeToFit={!useAutoWidth}
      minimumFontScale={0.72}
      style={[labelStyle, { fontSize: sizeConfig.fontSize }, isActive && styles.labelActive]}
    >
      {label}
    </Text>
  );

  const tabNodes = tabs.map((tab) => {
    const isActive = tab.value === value;
    return (
      <Pressable
        key={tab.value}
        onPress={() => onValueChange(tab.value)}
        style={({ pressed }) => [
          styles.tab,
          layoutStyle,
          sizeConfig.tab,
          isActive ? styles.tabActive : styles.tabInactive,
          isActive ? materialStyle('tabActive') : undefined,
          pressed && materialPressedStyle('tab'),
          tabStyle,
        ]}
        accessibilityRole="tab"
        accessibilityState={{ selected: isActive }}
        accessibilityLabel={tab.label}
      >
        {tab.renderIcon ? (
          <View style={styles.tabContent}>
            {tab.renderIcon(isActive)}
            {renderLabel(tab.label, isActive)}
          </View>
        ) : (
          renderLabel(tab.label, isActive)
        )}
      </Pressable>
    );
  });

  const row = (
    <View
      style={[
        styles.container,
        { gap: sizeConfig.gap },
        !useScroll && layout === 'equal' && styles.containerNowrap,
      ]}
    >
      {tabNodes}
    </View>
  );

  const content = useScroll ? (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.scrollContent, { gap: sizeConfig.gap }]}
    >
      {tabNodes}
    </ScrollView>
  ) : (
    row
  );

  if (variant === 'plain') {
    return <View style={[styles.plain, style]}>{content}</View>;
  }

  return <View style={[styles.trough, materialStyle('trough'), style]}>{content}</View>;
}

const styles = StyleSheet.create({
  plain: {
    width: '100%',
  },
  trough: {
    backgroundColor: colors.chipInactive,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'stretch',
    flexWrap: 'wrap',
    width: '100%',
  },
  containerNowrap: {
    flexWrap: 'nowrap',
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 4,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  tabEqual: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
  },
  tabAuto: {
    flexShrink: 0,
    flexGrow: 0,
  },
  tabWrap: {
    flexGrow: 1,
    flexBasis: '47%',
    maxWidth: '50%',
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabInactive: {
    backgroundColor: colors.white,
    borderColor: '#E8EDF5',
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  label: {
    color: colors.textPrimary,
    fontWeight: '600',
    textAlign: 'center',
    width: '100%',
  } as TextStyle,
  labelAuto: {
    color: colors.textPrimary,
    fontWeight: '600',
    textAlign: 'center',
  } as TextStyle,
  labelActive: {
    color: colors.white,
  },
});
