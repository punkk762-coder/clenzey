/**
 * Web stub for react-native-maps.
 * Maps are not supported on web — components render nothing.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

function MapViewStub(props: any) {
  return React.createElement(
    View,
    {
      style: [
        {
          backgroundColor: '#f3f4f6',
          height: 220,
          justifyContent: 'center',
          alignItems: 'center',
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          overflow: 'hidden',
        },
        props.style,
      ],
    },
    React.createElement(Text, { style: { color: '#6b7280', fontSize: 14 } }, '🗺️ Map not available on web'),
    props.children,
  );
}

function MarkerStub(_props: any) {
  return null;
}

export default MapViewStub;
export const Marker = MarkerStub;
export const PROVIDER_GOOGLE = 'google';
