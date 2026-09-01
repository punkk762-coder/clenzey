/**
 * Stub for react-native-razorpay when the native SDK is not linked
 * (Expo Go, web, or Metro dev without EXPO_USE_NATIVE_RAZORPAY=1).
 */
export default {
  open: async (_options: Record<string, unknown>) => {
    throw new Error(
      'Razorpay requires a development build. Payment is not available in Expo Go.',
    );
  },
};
