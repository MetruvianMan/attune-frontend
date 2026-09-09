import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

/**
 * Runs `onForeground` whenever the app transitions from background/
 * inactive back to active (e.g. the user switches back to Attune after
 * being in another app, or after their phone was locked) - not just on
 * initial mount or on React Navigation focus.
 *
 * Motivation: this is a shared two-parent app where each parent has the
 * app open independently on their own phone. Every screen only refetches
 * from Supabase on mount/navigation-focus, so if one parent logs an event
 * while the other is already sitting on a screen (not navigating away and
 * back), the second parent doesn't see it until they happen to leave and
 * re-enter that screen. Refreshing on foreground closes most of that
 * gap cheaply - the moment either parent glances back at the app, whatever
 * the other parent did while it was backgrounded is already there,
 * without needing a full websocket/Realtime subscription.
 *
 * Deliberately NOT a polling timer - this only fires on a real
 * background->active transition, so it costs nothing while the app is
 * already in the foreground (which is the common case for someone
 * actively using a screen) and never fires more often than a user
 * actually switches back to the app.
 *
 * Usage: call once per screen that wants foreground-triggered refresh,
 * passing the same reload function that screen's own focus-effect/mount
 * effect already uses (e.g. `refreshData` in RewardsTabScreen.tsx,
 * `loadDataForDate(selectedDate)` in the Today tab) - not a new fetch
 * path, just an additional trigger for the existing one.
 */
export function useAppForegroundRefresh(onForeground: () => void) {
  // Ref so the AppState listener (added once) always calls the latest
  // version of onForeground, without needing to re-subscribe every time
  // the caller's callback identity changes (e.g. a new closure captured
  // on every render because it references childProfileId/selectedDate).
  const onForegroundRef = useRef(onForeground);
  onForegroundRef.current = onForeground;

  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const wasBackgrounded = appStateRef.current !== 'active';
      const isNowActive = nextState === 'active';

      if (wasBackgrounded && isNowActive) {
        onForegroundRef.current();
      }

      appStateRef.current = nextState;
    });

    return () => subscription.remove();
  }, []);
}
