import RazorpayCheckout from 'react-native-razorpay';

/**
 * Razorpay wrapper. Metro resolves `react-native-razorpay` to a safe stub in
 * Expo Go (`EXPO_USE_NATIVE_RAZORPAY=0`) and to the native SDK in dev/APK builds.
 */
export default RazorpayCheckout;
