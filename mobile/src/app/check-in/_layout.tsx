import { Stack } from 'expo-router';

import { colors } from '@/theme/tokens';

export default function CheckInLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: colors.ivory },
      }}
    />
  );
}
