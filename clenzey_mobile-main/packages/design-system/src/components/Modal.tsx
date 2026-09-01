import React from 'react';
import {
  Modal as RNModal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ViewStyle,
  ModalProps as RNModalProps,
} from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

export interface ModalProps extends Omit<RNModalProps, 'children'> {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function Modal({
  visible,
  onClose,
  title,
  children,
  ...rest
}: ModalProps) {
  const theme = useTheme();

  const cardStyle: ViewStyle = {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    width: '85%',
    maxHeight: '80%',
  };

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      accessibilityViewIsModal
      {...rest}
    >
      <View style={styles.overlay}>
        <View style={cardStyle}>
          <View style={styles.header}>
            {title ? (
              <Text
                style={[
                  styles.title,
                  {
                    fontFamily: theme.typography.headline3.fontFamily,
                    fontSize: theme.typography.headline3.fontSize,
                    fontWeight: theme.typography.headline3.fontWeight,
                    color: theme.colors.textPrimary,
                  },
                ]}
              >
                {title}
              </Text>
            ) : (
              <View />
            )}
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close modal"
              hitSlop={8}
            >
              <Text style={[styles.closeButton, { color: theme.colors.textSecondary }]}>
                ✕
              </Text>
            </Pressable>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    flex: 1,
  },
  closeButton: {
    fontSize: 20,
    paddingLeft: 8,
  },
});
