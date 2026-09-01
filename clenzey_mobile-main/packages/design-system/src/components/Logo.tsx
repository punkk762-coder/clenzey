import React, { useState } from 'react';
import { Image, View, ViewStyle } from 'react-native';

export interface LogoProps {
  width?: number;
  style?: ViewStyle;
  variant?: 'default' | 'white';
}

const logoSources = {
  default: require('../../assets/logo.png'),
  white: require('../../assets/logo-white.png'),
} as const;

export function Logo({ width = 160, style, variant = 'default' }: LogoProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return null;
  }

  const containerStyle: ViewStyle = {
    alignItems: 'center',
    ...style,
  };

  return (
    <View style={containerStyle} accessibilityRole="image" accessibilityLabel="Clenzey logo">
      <Image
        source={logoSources[variant]}
        style={{ width, height: width * 0.5 }}
        resizeMode="contain"
        onError={() => setHasError(true)}
      />
    </View>
  );
}
