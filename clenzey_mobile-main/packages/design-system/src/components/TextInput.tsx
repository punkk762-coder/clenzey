import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput as RNTextInput,
  TextInputProps as RNTextInputProps,
  StyleSheet,
  ViewStyle,
  Platform,
} from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

export interface TextInputProps extends Omit<RNTextInputProps, 'style'> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: ViewStyle;
}

export function TextInput({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  containerStyle,
  secureTextEntry,
  multiline,
  ...rest
}: TextInputProps) {
  const theme = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const borderColor = error
    ? theme.colors.error
    : isFocused
      ? theme.colors.primary
      : 'transparent';

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text
          style={[
            styles.label,
            {
              fontFamily: theme.typography.label.fontFamily,
              fontSize: theme.typography.label.fontSize,
              fontWeight: theme.typography.label.fontWeight,
              color: theme.colors.textPrimary,
              marginBottom: theme.spacing.xs,
            },
          ]}
        >
          {label}
        </Text>
      )}

      <View
        style={[
          styles.inputContainer,
          multiline && styles.inputContainerMultiline,
          {
            borderColor,
            borderRadius: theme.borderRadius.lg,
            paddingHorizontal: theme.controlSizes.input.paddingHorizontal,
            minHeight: multiline ? 80 : theme.controlSizes.input.height,
            backgroundColor: theme.colors.chipInactive,
          },
        ]}
      >
        {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}

        <RNTextInput
          style={[
            styles.input,
            {
              fontFamily: theme.typography.body1.fontFamily,
              fontSize: theme.controlSizes.input.fontSize,
              color: theme.colors.textPrimary,
              borderWidth: 0,
              backgroundColor: 'transparent',
            },
            Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null,
            multiline && styles.multilineInput,
          ]}
          placeholderTextColor={theme.colors.textSecondary}
          secureTextEntry={secureTextEntry}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          onFocus={(e) => {
            setIsFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            rest.onBlur?.(e);
          }}
          accessibilityLabel={label}
          accessibilityHint={helperText}
          {...rest}
        />

        {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
      </View>

      {error && (
        <Text
          style={[
            styles.helperText,
            {
              color: theme.colors.error,
              marginTop: theme.spacing.xs,
            },
          ]}
          accessibilityRole="alert"
        >
          {error}
        </Text>
      )}

      {!error && helperText && (
        <Text
          style={[
            styles.helperText,
            {
              color: theme.colors.textSecondary,
              marginTop: theme.spacing.xs,
            },
          ]}
        >
          {helperText}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {},
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  inputContainerMultiline: {
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 8,
  },
  multilineInput: {
    minHeight: 64,
    width: '100%',
    paddingTop: 0,
    paddingBottom: 0,
  },
  iconLeft: {
    marginRight: 6,
  },
  iconRight: {
    marginLeft: 6,
  },
  helperText: {
    fontSize: 11,
  },
});
