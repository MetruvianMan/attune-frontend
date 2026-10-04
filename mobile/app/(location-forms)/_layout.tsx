import { Stack } from 'expo-router';

/**
 * Layout for Family Location Tracking form screens (Saved Place and
 * Location Period create/edit). Mirrors app/(rewards-forms)/_layout.tsx's
 * Stack setup exactly - modal presentation, slide up from bottom, no
 * native header (each screen renders its own header row).
 *
 * No shared context provider wraps this Stack, unlike RewardsFormsLayout's
 * RewardsProvider - these screens call location-service.ts/databaseService
 * directly (via useProfile() for the active profile) rather than through a
 * dedicated LocationContext, since there's no optimistic-update store
 * equivalent needed here (see saved-place-form.tsx/location-period-form.tsx's
 * plain try/catch save pattern, matching relationship-form.tsx rather than
 * behavior-form.tsx's context-backed optimistic navigation).
 *
 * List screens (saved-places-list.tsx, location-periods-list.tsx) are not
 * declared as explicit <Stack.Screen> entries here, matching the existing
 * rewards-forms convention - expo-router still renders them through this
 * layout since it's the nearest _layout.tsx up the route tree.
 */
export default function LocationFormsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: 'modal',
        animation: 'slide_from_bottom',
      }}
    >
      <Stack.Screen name="saved-place-form" />
      <Stack.Screen name="location-period-form" />
    </Stack>
  );
}
