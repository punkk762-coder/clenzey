import { StyleSheet } from 'react-native';
import { Portal, Dialog, Text, Button } from 'react-native-paper';
import { colors } from '@clenzey/design-system';
import { DialogIcon } from './DialogIcon';

type AppDialogType = 'error' | 'success';

interface AppDialogProps {
  visible: boolean;
  onDismiss: () => void;
  title: string;
  message: string;
  type?: AppDialogType;
  actionLabel?: string;
}

export function AppDialog({
  visible,
  onDismiss,
  title,
  message,
  type = 'error',
  actionLabel = 'OK',
}: AppDialogProps) {
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <Dialog.Content style={styles.content}>
          <DialogIcon type={type} />
          <Text variant="titleMedium" style={styles.title}>
            {title}
          </Text>
          <Text variant="bodyMedium" style={styles.message}>
            {message}
          </Text>
          <Button
            mode="contained"
            compact
            onPress={onDismiss}
            buttonColor={colors.primary}
            textColor={colors.white}
            style={styles.button}
            contentStyle={styles.buttonContent}
            labelStyle={styles.buttonLabel}
          >
            {actionLabel}
          </Button>
        </Dialog.Content>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  dialog: {
    borderRadius: 16,
    backgroundColor: colors.white,
    marginHorizontal: 28,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
  },
  title: {
    textAlign: 'center',
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 4,
  },
  message: {
    textAlign: 'center',
    color: colors.textSecondary,
    marginTop: 8,
    lineHeight: 20,
    fontSize: 14,
  },
  button: {
    marginTop: 20,
    width: '100%',
    borderRadius: 10,
  },
  buttonContent: {
    height: 40,
  },
  buttonLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
});
