import { type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Portal, Dialog, Text, IconButton } from 'react-native-paper';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { colors, fonts, getSemanticTone, type SemanticTone } from '@clenzey/design-system';

interface AppScrollDialogProps {
  visible: boolean;
  onDismiss: () => void;
  title: string;
  subtitle?: string;
  tone?: SemanticTone;
  headerIcon?: Parameters<typeof HugeiconsIcon>[0]['icon'];
  children: ReactNode;
}

export function AppScrollDialog({
  visible,
  onDismiss,
  title,
  subtitle,
  tone = 'primary',
  headerIcon,
  children,
}: AppScrollDialogProps) {
  const semantic = getSemanticTone(tone);

  return (
    <Portal>
      <Dialog
        visible={visible}
        onDismiss={onDismiss}
        style={[
          styles.dialog,
          {
            borderColor: semantic.border,
            backgroundColor: colors.white,
          },
        ]}
      >
        <View style={[styles.accentBar, { backgroundColor: semantic.foreground }]} />
        <View style={[styles.header, { backgroundColor: semantic.background }]}>
          <View style={styles.headerMain}>
            {headerIcon ? (
              <View
                style={[
                  styles.headerIconWrap,
                  {
                    backgroundColor: colors.white,
                    borderColor: semantic.border,
                  },
                ]}
              >
                <HugeiconsIcon
                  icon={headerIcon}
                  size={22}
                  color={semantic.foreground}
                  strokeWidth={1.5}
                />
              </View>
            ) : null}
            <View style={styles.headerText}>
              <Text variant="titleMedium" style={[styles.title, { color: semantic.foreground }]}>
                {title}
              </Text>
              {subtitle ? (
                <Text variant="bodySmall" style={styles.subtitle}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
          </View>
          <IconButton icon="close" size={20} onPress={onDismiss} style={styles.closeButton} />
        </View>
        <Dialog.ScrollArea style={styles.scrollArea}>
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </Dialog.ScrollArea>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  dialog: {
    borderRadius: 16,
    marginHorizontal: 20,
    maxHeight: '85%',
    borderWidth: 1,
    overflow: 'hidden',
  },
  accentBar: {
    height: 4,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingLeft: 16,
    paddingRight: 4,
    paddingTop: 14,
    paddingBottom: 10,
    gap: 8,
  },
  headerMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  headerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerText: {
    flex: 1,
    paddingTop: 2,
  },
  title: {
    fontFamily: fonts.bold,
    fontWeight: '700',
    fontSize: 18,
  },
  subtitle: {
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  closeButton: {
    margin: 0,
  },
  scrollArea: {
    paddingHorizontal: 0,
    maxHeight: 480,
    backgroundColor: colors.white,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
});
