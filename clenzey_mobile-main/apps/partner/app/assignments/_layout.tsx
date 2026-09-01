import { Stack } from 'expo-router';
import { detailHeaderOptions } from '../../src/navigation/detailHeaderOptions';

export default function AssignmentsLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={detailHeaderOptions('Assignments', '/(tabs)')}
      />
      <Stack.Screen
        name="[id]"
        options={detailHeaderOptions('Assignment Detail', '/assignments')}
      />
    </Stack>
  );
}
