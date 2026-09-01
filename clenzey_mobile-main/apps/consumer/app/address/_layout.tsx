import { Stack } from 'expo-router';

export default function AddressLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="select" />
      <Stack.Screen name="create" />
      <Stack.Screen name="[id]/edit" />
    </Stack>
  );
}
