import { Stack } from 'expo-router';
import { RewardsProvider } from '../../contexts/RewardsContext';

/**
 * Layout for rewards form screens
 * Wraps behavior-form and reward-form with RewardsProvider
 */
export default function RewardsFormsLayout() {
  return (
    <RewardsProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      >
        <Stack.Screen name="behavior-form" />
        <Stack.Screen name="reward-form" />
      </Stack>
    </RewardsProvider>
  );
}
