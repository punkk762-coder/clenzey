import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Portal, Dialog, Text, Button } from 'react-native-paper';
import { colors, fonts } from '@clenzey/design-system';
import { sharedPaperStyles } from '../styles/paperControls';
import { DialogIcon, type DialogIconType } from './DialogIcon';

type ConfirmVariant = 'primary' | 'destructive';

interface AppConfirmDialogProps {
  visible: boolean;
  onDismiss: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: ConfirmVariant;
  confirmLoading?: boolean;
  showIcon?: boolean;
  iconType?: DialogIconType;
  children?: ReactNode;
}

export function AppConfirmDialog({
  visible,
  onDismiss,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'primary',
  confirmLoading = false,
  showIcon = true,
  iconType = 'error',
  children,
}: AppConfirmDialogProps) {
  const confirmColor = confirmVariant === 'destructive' ? colors.error : colors.primary;

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <Dialog.Content style={styles.content}>
          {showIcon ? <DialogIcon type={iconType} compact /> : null}
          <Text variant="titleMedium" style={styles.title}>
            {title}
          </Text>
          <Text variant="bodyMedium" style={styles.message}>
            {message}
          </Text>
          {children ? <View style={styles.children}>{children}</View> : null}
          <View style={styles.actions}>
            <Button
              mode="outlined"
              compact
              onPress={onDismiss}
              disabled={confirmLoading}
              textColor={colors.textPrimary}
              style={styles.cancelButton}
              contentStyle={styles.buttonContent}
              labelStyle={styles.cancelLabel}
            >
              {cancelLabel}
            </Button>
            <Button
              mode="contained"
              compact
              onPress={onConfirm}
              loading={confirmLoading}
              disabled={confirmLoading}
              buttonColor={confirmColor}
              textColor={colors.white}
              style={styles.confirmButton}
              contentStyle={styles.buttonContent}
              labelStyle={styles.buttonLabel}
            >
              {confirmLabel}
            </Button>
          </View>
        </Dialog.Content>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  dialog: {
    borderRadius: 14,
    backgroundColor: colors.white,
    marginHorizontal: 40,
    maxWidth: 320,
    alignSelf: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 16,
  },
  title: {
    textAlign: 'center',
    fontFamily: fonts.bold,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 2,
    fontSize: 16,
    lineHeight: 22,
  },
  message: {
    textAlign: 'center',
    color: colors.textSecondary,
    marginTop: 6,
    lineHeight: 18,
    fontSize: 13,
    fontFamily: fonts.regular,
  },
  children: {
    width: '100%',
    marginTop: 12,
  },
  actions: {
    width: '100%',
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  confirmButton: {
    flex: 1,
    borderRadius: 10,
  },
  cancelButton: {
    flex: 1,
    borderRadius: 10,
    borderColor: '#E5E7EB',
    backgroundColor: colors.white,
  },
  buttonContent: sharedPaperStyles.buttonContent,
  buttonLabel: {
    ...sharedPaperStyles.buttonLabel,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
  cancelLabel: {
    ...sharedPaperStyles.buttonLabel,
    fontFamily: fonts.semiBold,
    lineHeight: 18,
  },
});
