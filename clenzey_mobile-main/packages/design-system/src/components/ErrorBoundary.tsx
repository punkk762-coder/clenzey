import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TextStyle } from 'react-native';
import { fonts } from '../theme/fonts';
import { Button } from './Button';

export interface ErrorBoundaryProps {
  /** Child components to wrap */
  children: ReactNode;
  /** Optional callback when user presses retry */
  onRetry?: () => void;
  /** Optional fallback component to render instead of the default error screen */
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary component that catches unhandled errors in the component tree.
 * Displays a generic error screen with a "Try Again" button.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error for debugging — can be extended with crash reporting
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
    this.props.onRetry?.();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container} accessibilityRole="alert">
          <Text style={styles.icon}>⚠️</Text>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            {this.state.error?.message || 'An unexpected error occurred. Please try again.'}
          </Text>
          <View style={styles.buttonContainer}>
            <Button variant="primary" title="Try Again" onPress={this.handleRetry} />
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#FFFFFF',
  },
  icon: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontFamily: fonts.bold,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 24,
  },
  buttonContainer: {
    marginTop: 8,
  },
});
