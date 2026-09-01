import React from 'react';
import {
  Modal as RNModal,
  View,
  Pressable,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function BottomSheet({ visible, onClose, children }: BottomSheetProps) {
  const theme = useTheme();

  const sheetStyle: ViewStyle = {
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: theme.borderRadius.lg,
    borderTopRightRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    maxHeight: '80%',
  };

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={sheetStyle}>
          <View style={styles.handleContainer}>
            <View
              style={[
                styles.handle,
                { backgroundColor: theme.colors.textSecondary },
              ]}
            />
          </View>
          {children}
        </View>
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    opacity: 0.4,
  },
});
