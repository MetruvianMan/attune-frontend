import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Animated, TouchableOpacity, Alert, useWindowDimensions, FlatList } from 'react-native';
import { Text, Card, Button, ActivityIndicator, IconButton, FAB, Checkbox } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRewards } from '../contexts/RewardsContext';
import { ProfilePhotoBadge } from './ProfilePhotoBadge';
import { PointEvent, Behavior, Reward } from '../models';
import { useRouter, useFocusEffect } from 'expo-router';
import { EmptyStateScreen } from './EmptyStateScreen';
import { colors, shadows, radius, spacing, typography } from '../constants/theme';
import { CalendarDatePicker } from './CalendarDatePicker';
import { QuickNotesModal } from './QuickNotesModal';
import { CustomQuickLogModal, CustomEntryDisposition } from './CustomQuickLogModal';
import { rewardsService } from '../services/rewards-service';
import { toLocalDateString } from '../utils/local-date';
import { databaseService } from '../services/database';
import { useAppForegroundRefresh } from '../hooks/useAppForegroundRefresh';

// Sentinel value appended to the end of the behaviors/rewards grid data so
// the "Custom" tile renders as the next item in the carousel (spilling onto
// a new page once the current one is full), without needing a second
// FlatList or complicating the pagination math.
const CUSTOM_TILE = 'custom' as const;

// Quick Log/Quick Redeem tile sizing - 3 columns per page, derived from
// the actual device width instead of a fixed percentage. `width: '31%'`
// left just enough slack for 3 columns + 2 gaps on wider phones (e.g.
// iPhone 17 Pro Max, ~430pt wide), but not on narrower phones (e.g.
// iPhone 13, ~390pt wide) - there the same percentage math didn't leave
// room for both 12px gaps, so the 3rd column wrapped onto a new row
// (3 rows of 2 instead of the intended 2 rows of 3).
//
// The pixel widths are computed inside the component via
// useWindowDimensions() (see itemsGridPageWidth/quickLogItemWidth in
// RewardsTabScreen below), NOT with a module-scope
// Dimensions.get('window').width call, which only runs once at import
// time and can be stale.
//
// Critically, quickLogItemWidth also subtracts ITEMS_GRID_SAFETY_MARGIN
// (a few px of deliberate slack) from the exact "divide available space
// by 3" result. On-device measurement showed the *exact*-fit width (no
// margin at all) still wrapped to 2 columns despite Yoga reporting the
// measured item width matched what was requested pixel-for-pixel -
// meaning flexWrap's own internal fit calculation left zero tolerance
// for the normal sub-pixel rounding that happens when laying out
// fractional widths, and wrapped one column early. A small deliberate
// margin (instead of an exact-fit division) gives that rounding
// somewhere to land without tipping the row over.
// ITEMS_GRID_PAGE_HORIZONTAL_PADDING/ITEMS_GRID_GAP must match
// itemsGridPage's own paddingHorizontal/gap below.
const ITEMS_GRID_PAGE_HORIZONTAL_PADDING = 8;
const ITEMS_GRID_GAP = 12;
const ITEMS_GRID_SAFETY_MARGIN = 4;

// Default Quick Log ordering for behaviors: a rough "order they might
// happen during the day" sequence (morning routine first, then school/
// daytime, then evening), followed by anything not in this list. Matched
// against Behavior.title case-insensitively - titles that don't exactly
// match any entry in these lists are instead bucketed by their own
// Behavior.timeOfDay field (see models/behavior.ts's TimeOfDay type and
// the Time of Day pills in behavior-form.tsx), so future behaviors can
// self-sequence into a sensible position without needing to be added
// here explicitly.
const MORNING_ORDER: string[] = [
  'Dry bed',
  'Strip/wash bedding',
  'Make bed',
  'Eat breakfast',
  'Leave without fuss',
  'On time to school',
  'Safe Body <9am',
  'No AM Drama',
  'Put shoes/backpack up',
];
const AFTERNOON_ORDER: string[] = [
  'Talk about day',
  'Explain emotions',
  'Brave around dog',
  'Safe body 4-6',
];
const NIGHT_ORDER: string[] = [
  'Safe body 6pm-bed',
  'Bathe',
];
// "Leaves room after bedtime" is intentionally NOT listed here - it's a
// demerit (negative pointValue), and negative behaviors are ordered by
// the general rule in sortedBehaviors below (after all positive behaviors
// in the same bucket, sorted least-to-most deduction) rather than an
// explicit title match. That rule is what puts it last within Night.

// Time-of-day bucket a behavior falls into for default Quick Log
// ordering: explicit title match in one of the lists above takes
// priority; otherwise falls back to the behavior's own timeOfDay field
// (undefined/'none' both mean "not time-of-day specific").
type QuickLogBucket = 'morning' | 'afternoon' | 'night' | 'none';
const BUCKET_ORDER: Record<QuickLogBucket, number> = { morning: 0, afternoon: 1, night: 2, none: 3 };

function getQuickLogBucket(behavior: Behavior): QuickLogBucket {
  const normalized = behavior.title.trim().toLowerCase();
  if (MORNING_ORDER.some((t) => t.toLowerCase() === normalized)) return 'morning';
  if (AFTERNOON_ORDER.some((t) => t.toLowerCase() === normalized)) return 'afternoon';
  if (NIGHT_ORDER.some((t) => t.toLowerCase() === normalized)) return 'night';
  return behavior.timeOfDay ?? 'none';
}

// Position within its bucket's explicit list (title match, case-
// insensitive), or null if not explicitly listed - in which case usage
// frequency decides the order within the bucket instead (see
// sortedBehaviors below).
function getExplicitOrderIndex(behavior: Behavior, bucket: QuickLogBucket): number | null {
  const list = bucket === 'morning' ? MORNING_ORDER : bucket === 'afternoon' ? AFTERNOON_ORDER : bucket === 'night' ? NIGHT_ORDER : null;
  if (!list) return null;
  const normalized = behavior.title.trim().toLowerCase();
  const index = list.findIndex((t) => t.toLowerCase() === normalized);
  return index === -1 ? null : index;
}

/**
 * RewardsTabScreen Component
 * 
 * Redesigned for quick logging with:
 * - Toggle between behaviors and rewards
 * - Quick-tap to log (like Today tab)
 * - Compact point balance display
 * - Running tally in activity
 * - Link to full ledger
 */

export function RewardsTabScreen() {
  const router = useRouter();
  // Re-reads the true window width on every render (unlike a module-scope
  // Dimensions.get('window').width call, which only runs once at import
  // time and can be stale/wrong on some devices). Used below to size the
  // Quick Log/Quick Redeem 3-column grid correctly on any screen width -
  // see ITEMS_GRID_PAGE_HORIZONTAL_PADDING/ITEMS_GRID_GAP above.
  const { width: windowWidth } = useWindowDimensions();
  const itemsGridPageWidth = windowWidth - spacing.screenPadding * 2;
  const quickLogItemWidth =
    (itemsGridPageWidth - ITEMS_GRID_PAGE_HORIZONTAL_PADDING * 2 - ITEMS_GRID_GAP * 2) / 3
    - ITEMS_GRID_SAFETY_MARGIN;
  const {
    selectedChildProfileId,
    behaviors: allBehaviors,
    rewards: allRewards,
    pointBalance,
    todaysSummary,
    recentActivity,
    loading,
    hasLoadedOnce,
    error,
    refreshData,
    logBehavior,
    redeemReward,
    undoPointEvent,
    updatePointEvent,
  } = useRewards();

  // Filter out archived items for Quick Log/Quick Redeem
  const behaviors = allBehaviors.filter(b => !b.archived);
  const rewards = allRewards.filter(r => !r.archived);

  const [viewMode, setViewMode] = useState<'behaviors' | 'rewards'>('behaviors');
  const [checklistMode, setChecklistMode] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  // 'YYYY-MM-DD' keys (see utils/local-date.ts) for every day that has at
  // least one behavior/reward entry logged, for the currently-selected
  // child - passed to CalendarDatePicker so it can tint those days green
  // (same sage-green WeatherView.tsx uses for "good day" mood tiles),
  // matching the ask to visually flag days with activity right in the
  // date picker. Populated lazily (only once the calendar modal is
  // actually opened, see the effect below) rather than eagerly on every
  // screen load, since this is a full-history query and the calendar is
  // opened far less often than this screen itself is visited.
  const [loggedDateKeys, setLoggedDateKeys] = useState<Set<string>>(new Set());
  const [dailyEvents, setDailyEvents] = useState<PointEvent[]>([]);
  const [dailyPointsEarned, setDailyPointsEarned] = useState(0);
  const [dailyPointsSpent, setDailyPointsSpent] = useState(0);
  const [priorBalance, setPriorBalance] = useState(0); // Balance before selected date

  // Default Quick Log ordering: behaviors are bucketed into Morning/
  // Afternoon/Night/None (see getQuickLogBucket above), with an explicit
  // in-bucket order for the behaviors listed in MORNING_ORDER/
  // AFTERNOON_ORDER/NIGHT_ORDER, then everything else in each bucket
  // sorted by how often it's actually been logged (most-used first), so a
  // newly-created or rarely-used behavior doesn't crowd out ones the
  // family actually taps every day. This is a one-time default sort, not
  // a user-persisted custom order - there's no sortOrder field on
  // Behavior yet, so this recomputes from title/timeOfDay + usage on
  // every load rather than reading a stored position.
  const [behaviorUsageCounts, setBehaviorUsageCounts] = useState<Map<string, number>>(new Map());
  // False until usage counts have resolved at least once for the CURRENT
  // selectedChildProfileId. behaviorUsageCounts starts as an empty Map,
  // so on first render every behavior not in the explicit
  // MORNING_ORDER/AFTERNOON_ORDER/NIGHT_ORDER lists falls back to "0
  // uses" in sortedBehaviors' step 5 - meaning any two such behaviors in
  // the same bucket render in their raw creation order, then visibly
  // reshuffle into real frequency order a moment later once this effect
  // resolves. Gating the Quick Log carousel's render on this flag (see
  // usageCountsLoaded below) means the very first paint already reflects
  // the final order. Same pattern as the Today tab's buttonsSorted flag.
  const [usageCountsLoaded, setUsageCountsLoaded] = useState(false);
  // Same pattern as the Today tab's lastSortedProfileIdRef: distinguishes
  // "profile actually changed" (must hide the grid again) from "same
  // profile, re-sorting after a log/undo" (must NOT hide - the grid is
  // already visible and correctly ordered from the last resolve; hiding
  // it here would itself flicker on every single quick-tap).
  const lastUsageCountsProfileIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!selectedChildProfileId) {
      setBehaviorUsageCounts(new Map());
      setUsageCountsLoaded(true);
      lastUsageCountsProfileIdRef.current = null;
      return;
    }

    if (lastUsageCountsProfileIdRef.current !== selectedChildProfileId) {
      setUsageCountsLoaded(false);
    }
    lastUsageCountsProfileIdRef.current = selectedChildProfileId;

    const loadUsageCounts = async () => {
      try {
        const { databaseService } = require('../services/database');
        // Full history (no limit), same as the Today tab's own
        // sortButtonsByFrequency - this screen's own `pointEvents` context
        // state is capped at 5 (recent activity only), so it can't be
        // reused here.
        const allPointEvents: PointEvent[] = await databaseService.getPointEvents({
          childProfileId: selectedChildProfileId,
          type: 'behavior',
        });

        const counts = new Map<string, number>();
        for (const event of allPointEvents) {
          if (!event.behaviorId) continue;
          counts.set(event.behaviorId, (counts.get(event.behaviorId) ?? 0) + 1);
        }
        setBehaviorUsageCounts(counts);
      } catch (error) {
        console.error('Failed to load behavior usage counts for Quick Log ordering:', error);
        setBehaviorUsageCounts(new Map());
      } finally {
        setUsageCountsLoaded(true);
      }
    };

    loadUsageCounts();
    // Re-sort whenever a new behavior is logged/undone during this
    // session (dailyEvents changes on every log/undo), not just once on
    // mount, so the order keeps reflecting real usage as the day goes on -
    // same trigger the Today tab uses (todaysEvents) for its own buttons.
  }, [selectedChildProfileId, dailyEvents]);

  const sortedBehaviors = React.useMemo(() => {
    return [...behaviors].sort((a, b) => {
      const bucketA = getQuickLogBucket(a);
      const bucketB = getQuickLogBucket(b);

      // 1. Bucket order: morning -> afternoon -> night -> none
      if (bucketA !== bucketB) return BUCKET_ORDER[bucketA] - BUCKET_ORDER[bucketB];

      // 2. Within the same bucket, positive-point behaviors come before
      // negative ones (demerits) - e.g. "Leaves room after bedtime"
      // (-10, night) sorts after every positive night behavior,
      // including ones with no explicit order. Negative "none"-bucket
      // behaviors fall out of this same rule + bucket ordering above,
      // landing at the very end of the whole Quick Log scroll without
      // needing special-case logic.
      const isNegativeA = a.pointValue < 0;
      const isNegativeB = b.pointValue < 0;
      if (isNegativeA !== isNegativeB) return isNegativeA ? 1 : -1;

      // 3. Both negative: order by smallest deduction first (e.g. -10
      // before -40), so a mild demerit doesn't get buried behind a severe
      // one.
      if (isNegativeA && isNegativeB) {
        return b.pointValue - a.pointValue; // less negative (closer to 0) first
      }

      // 4. Both positive: an explicit list position (if any) wins over
      // frequency - this is what lets Bathe land in a specific spot
      // within Night rather than just "somewhere in Night by usage".
      const explicitA = getExplicitOrderIndex(a, bucketA);
      const explicitB = getExplicitOrderIndex(b, bucketB);
      if (explicitA !== null && explicitB !== null) return explicitA - explicitB;
      if (explicitA !== null) return -1; // explicitly-ordered items sort before un-ordered ones in the same bucket
      if (explicitB !== null) return 1;

      // 5. Neither is explicitly ordered (e.g. a newly-created behavior
      // with only a timeOfDay set, no title match) - fall back to usage
      // frequency, most-used first.
      const countA = behaviorUsageCounts.get(a.id) ?? 0;
      const countB = behaviorUsageCounts.get(b.id) ?? 0;
      if (countB !== countA) return countB - countA;

      // 6. Final tiebreaker: stable original order (creation order).
      return behaviors.indexOf(a) - behaviors.indexOf(b);
    });
  }, [behaviors, behaviorUsageCounts]);

  // Append the "Custom" tile as the final item in each carousel so it always
  // sits right after the real behaviors/rewards, spilling onto a new page
  // once the current one fills up rather than needing a dedicated row.
  const behaviorTiles: (Behavior | typeof CUSTOM_TILE)[] = [...sortedBehaviors, CUSTOM_TILE];
  const rewardTiles: (Reward | typeof CUSTOM_TILE)[] = [...rewards, CUSTOM_TILE];
  const [notesModalVisible, setNotesModalVisible] = useState(false);
  const [editingActivityEvent, setEditingActivityEvent] = useState<PointEvent | null>(null);
  const [customModalVisible, setCustomModalVisible] = useState(false);
  
  // Animation for green flash
  const flashOpacity = useRef(new Animated.Value(0)).current;

  // When switching view modes, just update the mode without changing date
  const handleViewModeChange = (mode: 'behaviors' | 'rewards') => {
    setViewMode(mode);
  };

  // Load just today's summary + events - cheap, safe to call after every log/undo
  // since logging/undoing an event on the selected day never changes the balance
  // carried in *from before* that day.
  const loadDailyEvents = async () => {
    if (!selectedChildProfileId) return;

    try {
      const { databaseService } = require('../services/database');
      const [summary, events] = await Promise.all([
        rewardsService.getDailySummary(selectedChildProfileId, selectedDate),
        databaseService.getDailyPointEvents(selectedChildProfileId, selectedDate),
      ]);

      setDailyEvents(events);
      setDailyPointsEarned(summary.pointsEarned);
      setDailyPointsSpent(summary.pointsSpent);
    } catch (error) {
      console.error('Failed to load daily events:', error);
    }
  };

  // Compute the running balance carried in from before the selected day.
  // This requires scanning the full point-event history, so it's expensive -
  // only recompute when the profile or selected date actually changes, not
  // after every individual log/undo action.
  //
  // Filters client-side by comparing local_date strings for a strict
  // "before this day" bound, rather than a getPointEvents dateRange query -
  // dateRange only expresses inclusive gte/lte bounds, which can't express
  // "everything before day D" without also matching day D itself. Using the
  // frozen local_date (not a recomputed UTC window) is what makes this
  // timezone-safe - see .kiro/specs/timezone-safe-dates/.
  const loadPriorBalance = async () => {
    if (!selectedChildProfileId) return;

    try {
      const { databaseService } = require('../services/database');
      const selectedLocalDate = toLocalDateString(selectedDate);

      const allEvents = await databaseService.getPointEvents({
        childProfileId: selectedChildProfileId,
      });

      const priorEvents = allEvents.filter((event: PointEvent) => {
        const eventLocalDate = event.localDate ?? toLocalDateString(new Date(event.timestamp));
        return eventLocalDate < selectedLocalDate;
      });

      const balanceBeforeDay = priorEvents.reduce((sum: number, event: PointEvent) => sum + event.pointValue, 0);
      setPriorBalance(balanceBeforeDay);
    } catch (error) {
      console.error('Failed to load prior balance:', error);
    }
  };

  // Load daily events + prior balance when the profile or selected date changes
  useEffect(() => {
    loadDailyEvents();
    loadPriorBalance();
  }, [selectedChildProfileId, selectedDate]);

  // Fetch every logged-entry date only once the calendar modal is opened
  // (see showCalendar) - full point-event history for the profile, same
  // "no limit" pattern as loadUsageCounts/loadPriorBalance above, reduced
  // down to just the set of distinct calendar days involved.
  useEffect(() => {
    if (!showCalendar || !selectedChildProfileId) return;

    let cancelled = false;
    const loadLoggedDateKeys = async () => {
      try {
        const allEvents: PointEvent[] = await databaseService.getPointEvents({
          childProfileId: selectedChildProfileId,
        });
        const keys = new Set<string>();
        for (const event of allEvents) {
          keys.add(event.localDate ?? toLocalDateString(new Date(event.timestamp)));
        }
        if (!cancelled) setLoggedDateKeys(keys);
      } catch (error) {
        console.error('Failed to load logged dates for calendar highlighting:', error);
        if (!cancelled) setLoggedDateKeys(new Set());
      }
    };

    loadLoggedDateKeys();
    return () => {
      cancelled = true;
    };
  }, [showCalendar, selectedChildProfileId]);

  // Trigger green flash animation
  const triggerFlash = () => {
    flashOpacity.setValue(0.3);
    Animated.timing(flashOpacity, {
      toValue: 0,
      duration: 600,
      useNativeDriver: true,
    }).start();
  };

  // Refresh data when screen comes into focus. Skipped on the very first
  // time selectedChildProfileId becomes available - RewardsContext's own
  // initial-load effect is already fetching everything at that point, and
  // it sets selectedChildProfileId *before* that fetch resolves. Without
  // this guard, this effect fired a second, redundant refreshData() call
  // racing against the provider's own initial load; whichever one settled
  // first (usually this one, since it skips the archived-items work the
  // provider's load does) would flip `loading` to false and render the
  // Custom tile alone for a beat before the provider's fetch caught up and
  // filled in the real behaviors/rewards - the reported "Custom tile shows
  // by itself first" flicker on cold start.
  const hasFocusRefreshedOnce = useRef(false);
  useFocusEffect(
    React.useCallback(() => {
      if (selectedChildProfileId) {
        if (!hasFocusRefreshedOnce.current) {
          hasFocusRefreshedOnce.current = true;
          return;
        }
        refreshData();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedChildProfileId])
  );

  // Also refresh whenever the app comes back to the foreground (e.g. the
  // user switches back to Attune after being in another app or after the
  // phone was locked) - not just on navigation focus above. This is a
  // shared two-parent app; without this, if one parent logs a behavior/
  // redeems a reward while the other is already sitting on this screen
  // (not navigating away and back), the second parent wouldn't see the
  // updated balance/activity until they happened to leave and re-enter the
  // tab. Refreshes behaviors/rewards/balance (refreshData) plus the Daily
  // Activity list and its prior-balance baseline (loadDailyEvents/
  // loadPriorBalance) - the same three calls this screen's own date-change
  // effect above already makes, just triggered by foreground instead. See
  // hooks/useAppForegroundRefresh.ts for why this is foreground-triggered
  // rather than a polling timer.
  useAppForegroundRefresh(() => {
    if (selectedChildProfileId) {
      refreshData();
      loadDailyEvents();
      loadPriorBalance();
    }
  });

  const handleManage = () => {
    // Navigate to management screen (behaviors/rewards list)
    if (viewMode === 'behaviors') {
      router.push('/(rewards-forms)/behaviors-list');
    } else {
      router.push('/(rewards-forms)/rewards-list');
    }
  };

  const handleViewLedger = () => {
    router.push('/(rewards-forms)/ledger');
  };

  const handleToggleChecklistMode = () => {
    setChecklistMode(!checklistMode);
    setCheckedItems(new Set());
  };

  const handleCheckItem = (itemId: string) => {
    const newChecked = new Set(checkedItems);
    if (newChecked.has(itemId)) {
      newChecked.delete(itemId);
    } else {
      newChecked.add(itemId);
    }
    setCheckedItems(newChecked);
  };

  // Build the timestamp to log an event with: keep the calendar day the user
  // has selected (so retroactive logging for a past day still works), but
  // always use the current wall-clock time-of-day. selectedDate itself is a
  // single Date instance that doesn't advance between taps, so logging
  // several events in one sitting with the raw selectedDate would give them
  // all the *exact same millisecond* timestamp - which made sort order at
  // ties unpredictable (Supabase has no secondary sort key). Using the
  // current time-of-day guarantees each tap gets a strictly later timestamp
  // than the last, so new items reliably sort to the bottom.
  const buildEventTimestamp = () => {
    const now = new Date();
    const combined = new Date(selectedDate);
    combined.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
    return combined;
  };

  // Add a temporary optimistic entry to the on-screen Daily Activity list so
  // taps feel instant. loadDailyEvents() always does a full array REPLACE
  // (not an append) from the database, so this temp entry is guaranteed to
  // be discarded - either replaced by the real event on success, or simply
  // dropped on rollback. That guarantee is what avoids the duplicate-entry
  // bug that optimistic updates caused here previously.
  const addOptimisticEvent = (partial: Partial<PointEvent> & Pick<PointEvent, 'childProfileId' | 'pointValue'>) => {
    const tempEvent: PointEvent = {
      id: `temp-${Date.now()}`,
      type: partial.behaviorId ? 'behavior' : 'redemption',
      timestamp: buildEventTimestamp(),
      createdAt: new Date(),
      synced: false,
      ...partial,
    };
    setDailyEvents(prev => [...prev, tempEvent]);
  };

  const handleLogChecked = async () => {
    // Show optimistic entries for every checked item immediately
    if (viewMode === 'behaviors') {
      for (const behaviorId of checkedItems) {
        const behavior = behaviors.find(b => b.id === behaviorId);
        if (behavior) {
          addOptimisticEvent({ childProfileId: behavior.childProfileId, behaviorId, pointValue: behavior.pointValue });
        }
      }
    } else {
      for (const rewardId of checkedItems) {
        const reward = rewards.find(r => r.id === rewardId);
        if (reward) {
          addOptimisticEvent({ childProfileId: reward.childProfileId, rewardId, pointValue: -reward.pointCost });
        }
      }
    }

    if (viewMode === 'behaviors') {
      for (const behaviorId of checkedItems) {
        try {
          // Fresh timestamp per item so each one sorts strictly after the last
          await logBehavior(behaviorId, buildEventTimestamp());
        } catch (error) {
          console.error('Failed to log behavior:', error);
        }
      }
    } else {
      for (const rewardId of checkedItems) {
        try {
          await redeemReward(rewardId, buildEventTimestamp());
        } catch (error) {
          console.error('Failed to redeem reward:', error);
        }
      }
    }
    triggerFlash(); // Green flash after batch log
    await loadDailyEvents(); // Reload with real data (replaces optimistic entries)
    setCheckedItems(new Set());
    setChecklistMode(false);
  };

  const handleBehaviorTap = async (behavior: Behavior) => {
    // Show it in the activity list immediately, before the network call resolves
    addOptimisticEvent({ childProfileId: behavior.childProfileId, behaviorId: behavior.id, pointValue: behavior.pointValue });

    try {
      await logBehavior(behavior.id, buildEventTimestamp());
      triggerFlash(); // Green flash on success
      // Reload with real data (replaces the optimistic entry)
      await loadDailyEvents();
    } catch (error) {
      // Roll back by reloading real data (drops the optimistic entry)
      await loadDailyEvents();
      const errorMessage = error instanceof Error ? error.message : 'Failed to log';
      alert(errorMessage);
    }
  };

  const handleRewardTap = async (reward: Reward) => {
    // Show it in the activity list immediately, before the network call resolves
    addOptimisticEvent({ childProfileId: reward.childProfileId, rewardId: reward.id, pointValue: -reward.pointCost });

    try {
      await redeemReward(reward.id, buildEventTimestamp());
      // Reload with real data (replaces the optimistic entry)
      await loadDailyEvents();
    } catch (error) {
      // Roll back by reloading real data (drops the optimistic entry)
      await loadDailyEvents();
      const errorMessage = error instanceof Error ? error.message : 'Failed to redeem';
      alert(errorMessage);
    }
  };

  // Log a one-off behavior/reward that isn't in the Quick Log/Quick Redeem
  // carousel yet. Always creates a real Behavior/Reward row (logBehavior/
  // redeemReward require a backing record - PointEvent has no standalone
  // custom label/emoji fields) and immediately logs a point event against
  // it, then applies the chosen disposition to that row:
  // - 'keep': leave it active (shows up in Quick Log/Redeem and Manage)
  // - 'archive': archive it (hidden from Quick Log/Redeem and Manage's
  //   active section, but still exists)
  // - 'delete': delete it outright right after logging - safe now that
  //   the point event's own snapshotEmoji/snapshotLabel (see PointEvent
  //   model) preserve the emoji/title in history regardless.
  const handleSaveCustom = async (data: {
    title: string;
    emoji: string;
    points: number;
    disposition: CustomEntryDisposition;
  }) => {
    if (!selectedChildProfileId) return;

    const timestamp = buildEventTimestamp();

    try {
      if (viewMode === 'behaviors') {
        const behavior = await rewardsService.createBehavior({
          childProfileId: selectedChildProfileId,
          title: data.title,
          emoji: data.emoji,
          pointValue: data.points,
          category: 'Custom',
        });

        addOptimisticEvent({ childProfileId: behavior.childProfileId, behaviorId: behavior.id, pointValue: behavior.pointValue });
        setCustomModalVisible(false);

        await rewardsService.logBehavior(behavior, timestamp);
        if (data.disposition === 'archive') {
          await rewardsService.archiveBehavior(behavior.id);
        } else if (data.disposition === 'delete') {
          await rewardsService.deleteBehavior(behavior.id);
        }
      } else {
        if (pointBalance < data.points) {
          alert(`Insufficient points: need ${data.points}, have ${pointBalance}`);
          return;
        }

        const reward = await rewardsService.createReward({
          childProfileId: selectedChildProfileId,
          title: data.title,
          emoji: data.emoji,
          pointCost: data.points,
          parentApprovalRequired: false,
        });

        addOptimisticEvent({ childProfileId: reward.childProfileId, rewardId: reward.id, pointValue: -reward.pointCost });
        setCustomModalVisible(false);

        await rewardsService.redeemReward(reward.id, timestamp);
        if (data.disposition === 'archive') {
          await rewardsService.archiveReward(reward.id);
        } else if (data.disposition === 'delete') {
          await rewardsService.deleteReward(reward.id);
        }
      }

      triggerFlash();
      await Promise.all([loadDailyEvents(), refreshData()]);
    } catch (error) {
      await Promise.all([loadDailyEvents(), refreshData()]);
      const errorMessage = error instanceof Error ? error.message : 'Failed to log custom entry';
      alert(errorMessage);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    // Remove it from the on-screen list immediately rather than waiting on
    // the delete + balance recalculation round trip.
    const eventToRemove = dailyEvents.find(e => e.id === eventId);
    setDailyEvents(prev => prev.filter(e => e.id !== eventId));

    try {
      await undoPointEvent(eventId, eventToRemove?.pointValue);
      await loadDailyEvents(); // Reconcile with real data
    } catch (error) {
      // Roll back by restoring from the database
      await loadDailyEvents();
      alert('Failed to delete event');
    }
  };

  // Open the edit modal (notes + per-instance point value) for a specific
  // Daily Activity entry (behavior log or reward redemption), mirroring
  // the Today tab's per-event note editing. Point value editing only ever
  // updates this one PointEvent row - see the comment on the pointValue
  // branch in database.ts's updatePointEvent for why this can never
  // affect the Behavior/Reward template or any other logged instance.
  const handleEditActivityNote = (event: PointEvent) => {
    setEditingActivityEvent(event);
    setNotesModalVisible(true);
  };

  const handleSaveActivityNote = async (notes: string, pointValue?: number) => {
    if (!editingActivityEvent) return;

    const trimmed = notes.trim();
    const eventId = editingActivityEvent.id;
    const pointValueChanged = pointValue !== undefined && pointValue !== editingActivityEvent.pointValue;

    // Optimistically reflect the note and/or point value in the on-screen
    // list immediately
    setDailyEvents(prev =>
      prev.map(e => (e.id === eventId
        ? { ...e, notes: trimmed || undefined, ...(pointValueChanged ? { pointValue } : {}) }
        : e))
    );
    setNotesModalVisible(false);
    setEditingActivityEvent(null);

    try {
      await updatePointEvent(eventId, {
        notes: trimmed || undefined,
        ...(pointValueChanged ? { pointValue } : {}),
      });
      // Balance/summary/recent-activity aren't auto-recalculated by
      // updatePointEvent the way logBehavior/redeemReward are - refresh
      // them too whenever the point value actually changed, same as the
      // delete/undo flow below already does.
      if (pointValueChanged) {
        triggerFlash();
        await Promise.all([loadDailyEvents(), refreshData()]);
      } else {
        await loadDailyEvents(); // Reconcile with real data
      }
    } catch (error) {
      console.error('Failed to save entry:', error);
      await Promise.all([loadDailyEvents(), refreshData()]); // Roll back to real data
      alert('Failed to save entry');
    }
  };

  // Helper to format relative time
  const formatRelativeTime = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  // Calculate running balance for daily activity
  const activityWithRunningBalance = React.useMemo(() => {
    if (dailyEvents.length === 0) return [];
    
    // Events now come from database in chronological order (oldest first)
    // Display them in that order with balance accumulating downward
    
    // Use priorBalance (calculated from all events before selected date)
    const startingBalance = priorBalance;
    
    const result = [];
    let runningBalance = startingBalance;
    
    // Process events in order (oldest to newest)
    for (const event of dailyEvents) {
      runningBalance += event.pointValue;
      result.push({
        event,
        balanceAfter: runningBalance,
      });
    }
    
    return result;
  }, [dailyEvents, priorBalance]);

  // Loading state - gated on hasLoadedOnce rather than the loading/
  // pointBalance/recentActivity heuristic that used to be here. That
  // heuristic could resolve to "show content" before the initial fetch of
  // behaviors/rewards had actually settled (e.g. a profile with 0 points
  // and 0 recent activity so far), which let the Quick Log carousel render
  // with just the "Custom" tile for a beat before the real behaviors/
  // rewards arrived - the reported flicker on first opening the tab.
  // hasLoadedOnce is a dedicated one-way flag that only flips true once
  // the provider's initial load has fully settled (see RewardsContext),
  // so it doesn't have that gap. Same pattern already used by
  // behaviors-list.tsx/rewards-list.tsx.
  if (!hasLoadedOnce) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Loading rewards...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error && !pointBalance && recentActivity.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
          <Button mode="contained" onPress={refreshData} style={styles.retryButton}>
            Retry
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  // Empty state - gated on hasLoadedOnce (not !loading), since `loading` is
  // shared with every other action in this context (create/update/delete/
  // refresh) and flips on/off well after the initial load. Using !loading
  // here would make this empty state flash briefly during any of those
  // routine actions too, not just genuinely-empty accounts.
  if (hasLoadedOnce && behaviors.length === 0 && rewards.length === 0) {
    return (
      <EmptyStateScreen
        onAddBehavior={() => router.push('/(rewards-forms)/behavior-form')}
        onAddReward={() => router.push('/(rewards-forms)/reward-form')}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Green flash border overlay */}
      <Animated.View 
        style={[
          styles.flashBorder,
          { opacity: flashOpacity }
        ]}
        pointerEvents="none"
      />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Compact Header: Points + Date Selector */}
        <View style={styles.compactHeader}>
          {/* Left: Title and Points */}
          <View style={styles.headerLeft}>
            <Text variant="headlineSmall" style={styles.headerTitle}>
              🎁 Rewards
            </Text>
            <View style={styles.balanceRow}>
              <View style={styles.balanceGradient}>
                <Text style={styles.balanceText}>{pointBalance}</Text>
              </View>
              <Text style={styles.balanceLabel}>Points</Text>
            </View>
          </View>

          {/* Right: profile photo badge (above) + Date Selector (below).
              The photo badge is the same piece every other tab shows via
              ProfileHeader (title-left/photo-right) - this screen already
              has its own title + point-balance layout in headerLeft, so
              rather than swapping this whole header out for
              <ProfileHeader>, the badge is placed as its own row above
              the date picker, pushing the date/Today buttons down by
              roughly the badge's height while headerLeft (title + point
              box) stays exactly where it was. */}
          <View style={styles.headerRight}>
            <ProfilePhotoBadge />
            <View style={styles.datePickerCompact}>
              <View style={styles.dateButtonRow}>
                <TouchableOpacity 
                  style={styles.dateCompactButton}
                  onPress={() => setShowCalendar(true)}
                >
                  <Text style={styles.dateCompactText}>
                    {selectedDate.toLocaleDateString('en-US', { 
                      month: 'short',
                      day: 'numeric'
                    })}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.todayButtonCompact}
                  onPress={() => setSelectedDate(new Date())}
                >
                  <Text style={styles.todayButtonCompactText}>Today</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Segmented Control: Earn Points / Redeem Rewards */}
        <View style={styles.segmentedControlContainer}>
          <View style={styles.segmentedControl}>
            <Pressable
              style={[styles.segment, viewMode === 'behaviors' && styles.segmentActive]}
              onPress={() => handleViewModeChange('behaviors')}
            >
              <Text style={[styles.segmentText, viewMode === 'behaviors' && styles.segmentTextActive]}>
                Earn Points
              </Text>
            </Pressable>
            <Pressable
              style={[styles.segment, viewMode === 'rewards' && styles.segmentActive]}
              onPress={() => handleViewModeChange('rewards')}
            >
              <Text style={[styles.segmentText, viewMode === 'rewards' && styles.segmentTextActive]}>
                Redeem Rewards
              </Text>
            </Pressable>
          </View>

          {/* Batch Mode Toggle - Right Side */}
          <Pressable 
            style={[styles.batchModeToggle, checklistMode && styles.batchModeToggleActive]}
            onPress={handleToggleChecklistMode}
          >
            <IconButton
              icon={checklistMode ? 'checkbox-marked' : 'checkbox-blank-outline'}
              size={18}
              iconColor={checklistMode ? '#FFFFFF' : colors.accent}
              style={styles.batchModeIconSmall}
            />
          </Pressable>
        </View>

        {/* Quick Log Section - Limited to 2 rows */}
        <View style={styles.quickLogSection}>
          <View style={styles.sectionHeader}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              {viewMode === 'behaviors' ? 'Quick Log' : 'Quick Redeem'}
            </Text>
            <Button mode="text" onPress={handleManage} compact>
              Manage
            </Button>
          </View>
          {viewMode === 'behaviors' ? (
            !usageCountsLoaded ? (
              // Reserves the same footprint as one page of the real grid
              // (a single itemsGridPage row's worth of height) instead of
              // rendering behaviorTiles in its pre-usage-count order,
              // which is exactly the "shows one order, then reshuffles"
              // flash this is fixing - see usageCountsLoaded above.
              <View style={[styles.carouselWrapper, styles.quickLogPlaceholder]}>
                <ActivityIndicator size="small" color={colors.accent} />
              </View>
            ) : (
              <View style={styles.carouselWrapper}>
                <FlatList
                  data={Array.from({ length: Math.ceil(behaviorTiles.length / 6) })}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  decelerationRate="fast"
                  snapToInterval={itemsGridPageWidth}
                  snapToAlignment="start"
                  contentContainerStyle={styles.horizontalScrollContent}
                  style={styles.flatListStyle}
                  keyExtractor={(_, index) => `page-${index}`}
                  removeClippedSubviews={false}
                  renderItem={({ item, index: pageIndex }) => (
                    <View style={[styles.itemsGridPage, { width: itemsGridPageWidth }]}>
                      {behaviorTiles.slice(pageIndex * 6, pageIndex * 6 + 6).map((tile) => {
                        if (tile === CUSTOM_TILE) {
                          return (
                            <Pressable
                              key="custom-behavior"
                              onPress={() => setCustomModalVisible(true)}
                              style={({ pressed }) => [
                                styles.quickLogItem,
                                { width: quickLogItemWidth },
                                styles.customTile,
                                pressed && styles.quickLogItemPressed,
                              ]}
                            >
                              <Text style={styles.itemEmoji}>➕</Text>
                              <Text style={styles.itemTitle} numberOfLines={2} maxFontSizeMultiplier={1.2}>
                                Custom
                              </Text>
                            </Pressable>
                          );
                        }
                        const behavior = tile as Behavior;
                        return (
                          <Pressable
                            key={behavior.id}
                            onPress={() => checklistMode ? handleCheckItem(behavior.id) : handleBehaviorTap(behavior)}
                            style={({ pressed }) => [
                              styles.quickLogItem,
                              { width: quickLogItemWidth },
                              pressed && styles.quickLogItemPressed,
                              checklistMode && checkedItems.has(behavior.id) && styles.quickLogItemChecked,
                            ]}
                          >
                            <Text style={styles.itemEmoji}>{behavior.emoji}</Text>
                            {/* maxFontSizeMultiplier caps (doesn't disable) how much this
                                title grows under iOS's "Larger Text" accessibility setting -
                                a fixed-width tile has no room to expand into, and titles like
                                "Leave without fuss" were truncating to "Leave without fu..."
                                at larger system font sizes even though numberOfLines={2}
                                already gives it two lines to work with. */}
                            <Text style={styles.itemTitle} numberOfLines={2} maxFontSizeMultiplier={1.2}>
                              {behavior.title}
                            </Text>
                            <Text
                              style={[
                                styles.itemPoints,
                                behavior.pointValue < 0 && styles.itemPointsNegative,
                              ]}
                            >
                              {behavior.pointValue > 0 ? '+' : ''}{behavior.pointValue}
                            </Text>

                            {checklistMode && checkedItems.has(behavior.id) && (
                              <View style={styles.checkOverlay}>
                                <Text style={styles.checkMark}>✓</Text>
                              </View>
                            )}
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                />
              </View>
            )
          ) : (
              <View style={styles.carouselWrapper}>
                <FlatList
                  data={Array.from({ length: Math.ceil(rewardTiles.length / 6) })}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  decelerationRate="fast"
                  snapToInterval={itemsGridPageWidth}
                  snapToAlignment="start"
                  contentContainerStyle={styles.horizontalScrollContent}
                  style={styles.flatListStyle}
                  keyExtractor={(_, index) => `page-${index}`}
                  removeClippedSubviews={false}
                  renderItem={({ item, index: pageIndex }) => (
                    <View style={[styles.itemsGridPage, { width: itemsGridPageWidth }]}>
                      {rewardTiles.slice(pageIndex * 6, pageIndex * 6 + 6).map((tile) => {
                        if (tile === CUSTOM_TILE) {
                          return (
                            <Pressable
                              key="custom-reward"
                              onPress={() => setCustomModalVisible(true)}
                              style={({ pressed }) => [
                                styles.quickLogItem,
                                { width: quickLogItemWidth },
                                styles.customTile,
                                pressed && styles.quickLogItemPressed,
                              ]}
                            >
                              <Text style={styles.itemEmoji}>➕</Text>
                              <Text style={styles.itemTitle} numberOfLines={2} maxFontSizeMultiplier={1.2}>
                                Custom
                              </Text>
                            </Pressable>
                          );
                        }
                        const reward = tile as Reward;
                        const canAfford = pointBalance >= reward.pointCost;
                        return (
                          <Pressable
                            key={reward.id}
                            onPress={() => checklistMode ? handleCheckItem(reward.id) : (canAfford && handleRewardTap(reward))}
                            disabled={!canAfford && !checklistMode}
                            style={({ pressed }) => [
                              styles.quickLogItem,
                              { width: quickLogItemWidth },
                              !canAfford && !checklistMode && styles.quickLogItemDisabled,
                              pressed && styles.quickLogItemPressed,
                              checklistMode && checkedItems.has(reward.id) && styles.quickLogItemChecked,
                            ]}
                          >
                            <Text style={[styles.itemEmoji, !canAfford && !checklistMode && styles.itemEmojiDisabled]}>
                              {reward.emoji}
                            </Text>
                            {/* maxFontSizeMultiplier caps (doesn't disable) how much this
                                title grows under iOS's "Larger Text" accessibility setting -
                                see the matching comment on the behavior tile title above. */}
                            <Text style={[styles.itemTitle, !canAfford && !checklistMode && styles.itemTitleDisabled]} numberOfLines={2} maxFontSizeMultiplier={1.2}>
                              {reward.title}
                            </Text>
                            <Text style={[styles.itemPoints, styles.itemCost, !canAfford && !checklistMode && styles.itemCostDisabled]}>
                              {reward.pointCost}
                            </Text>

                            {checklistMode && checkedItems.has(reward.id) && (
                              <View style={styles.checkOverlay}>
                                <Text style={styles.checkMark}>✓</Text>
                              </View>
                            )}
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                />
              </View>
          )}
        </View>

        {/* Daily Activity with Running Balance */}
        <View style={styles.activitySection}>
          <Text variant="titleMedium" style={[styles.sectionTitle, styles.activitySectionTitle]}>
            Daily Activity
          </Text>

          {activityWithRunningBalance.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Card.Content>
                <Text style={styles.emptyText}>No activity on this day</Text>
              </Card.Content>
            </Card>
          ) : (
            <Card style={styles.activityCard}>
              <Card.Content style={styles.activityCardContent}>
                {activityWithRunningBalance.map(({ event, balanceAfter }, index) => {
                  // Prefer the frozen snapshot on the point event itself -
                  // see PointEvent.snapshotEmoji. Falls back to the
                  // *unfiltered* lists (not the archived ones used for the
                  // Quick Log/Quick Redeem carousel) for any pre-snapshot
                  // row, so entries that were auto-archived right after
                  // logging (i.e. "Save to Quick Log" left unchecked)
                  // still resolve to their real emoji/title where possible.
                  const behavior = event.behaviorId
                    ? allBehaviors.find((b) => b.id === event.behaviorId)
                    : null;
                  const reward = event.rewardId
                    ? allRewards.find((r) => r.id === event.rewardId)
                    : null;

                  const emoji = event.snapshotEmoji || behavior?.emoji || reward?.emoji || '📝';
                  const title = event.snapshotLabel || behavior?.title || reward?.title || 'Event';

                  return (
                    <React.Fragment key={event.id}>
                      <View style={styles.activityItem}>
                        <View style={styles.activityLeft}>
                          <Text style={styles.activityEmoji}>{emoji}</Text>
                          <View style={styles.activityDetails}>
                            <Text style={styles.activityTitle}>{title}</Text>
                            <Text style={styles.activityTime}>
                              {formatRelativeTime(event.timestamp)}
                            </Text>
                            {event.notes ? (
                              <Text style={styles.activityNote} numberOfLines={2}>
                                {event.notes}
                              </Text>
                            ) : null}
                          </View>
                        </View>

                        <View style={styles.activityRight}>
                          <Text
                            style={[
                              styles.activityPoints,
                              { color: event.pointValue > 0 ? '#4CAF50' : '#FF9800' },
                            ]}
                          >
                            {event.pointValue > 0 ? '+' : ''}{event.pointValue}
                          </Text>
                          <Text style={styles.activityBalance}>→ {balanceAfter}</Text>
                          <TouchableOpacity
                            style={styles.activityNoteButton}
                            onPress={() => handleEditActivityNote(event)}
                            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                          >
                            <Text style={styles.activityNoteIcon}>✏️</Text>
                          </TouchableOpacity>
                          <IconButton
                            icon="delete-outline"
                            size={16}
                            iconColor={colors.danger}
                            onPress={() => handleDeleteEvent(event.id)}
                            style={styles.deleteButton}
                          />
                        </View>
                      </View>

                      {index < activityWithRunningBalance.length - 1 && (
                        <View style={styles.activityDivider} />
                      )}
                    </React.Fragment>
                  );
                })}
              </Card.Content>
            </Card>
          )}

          <Pressable onPress={handleViewLedger} style={styles.ledgerLink}>
            <Text style={styles.ledgerLinkText}>View All Activity →</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Calendar Picker Modal */}
      <CalendarDatePicker
        visible={showCalendar}
        selectedDate={selectedDate}
        onSelect={(date) => {
          setSelectedDate(date);
          setShowCalendar(false);
        }}
        onClose={() => setShowCalendar(false)}
        maxDate={new Date()}
        highlightedDateKeys={loggedDateKeys}
      />

      {/* Edit Modal - add/edit a note and/or a one-off point value
          override on a Daily Activity entry (behavior log or reward
          redemption), e.g. "Toy (Medium) -> LEGO set from Target" or
          "+5 bonus for great homework today". initialPointValue is
          always provided here (unlike some other hypothetical callers of
          this modal), so the point value field always renders for this
          screen's entries. */}
      <QuickNotesModal
        visible={notesModalVisible}
        initialNotes={editingActivityEvent?.notes || ''}
        initialPointValue={editingActivityEvent?.pointValue}
        onSave={handleSaveActivityNote}
        onCancel={() => {
          setNotesModalVisible(false);
          setEditingActivityEvent(null);
        }}
      />

      {/* Custom Quick Log Modal - log a one-off behavior/reward not already
          in the Quick Log/Quick Redeem carousel */}
      <CustomQuickLogModal
        visible={customModalVisible}
        mode={viewMode === 'behaviors' ? 'behavior' : 'reward'}
        onClose={() => setCustomModalVisible(false)}
        onSave={handleSaveCustom}
      />

      {/* FAB for logging checked items in checklist mode only */}
      {checklistMode && checkedItems.size > 0 && (
        <FAB
          icon="check-all"
          style={[styles.fab, styles.fabChecklist]}
          onPress={handleLogChecked}
          label={`Log ${checkedItems.size} Selected`}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  flashBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 8,
    borderColor: '#4CAF50',
    zIndex: 1000,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    // paddingTop deliberately omitted (0, not spacing.screenPadding) -
    // on every other tab, ProfileHeader sits OUTSIDE the ScrollView with
    // only the safe-area inset (via useSafeAreaInsets) as its own top
    // padding, so the profile photo's top edge lands right at the safe-
    // area boundary. Here, compactHeader (with ProfilePhotoBadge inside
    // headerRight) is the first thing INSIDE this screen's ScrollView,
    // whose own SafeAreaView (edges=['top']) already supplies that same
    // safe-area inset as ITS padding - so adding screenPadding here too
    // stacked an extra 18px on top of that, sitting the photo
    // noticeably lower than the same photo on every other tab (reported
    // misalignment). Removing it lines the two up. Horizontal/bottom
    // padding stay as before - only the top was the mismatched one.
    paddingTop: 0,
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.cardMargin,
    color: colors.textDim,
    fontSize: typography.body.fontSize,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    color: colors.danger,
    textAlign: 'center',
    marginBottom: spacing.cardMargin,
    fontSize: typography.body.fontSize,
  },
  retryButton: {
    marginTop: 8,
    backgroundColor: colors.accent,
    borderRadius: radius.button,
  },
  
  // Compact Header
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    // 'flex-end' so the LAST item in each column bottom-aligns with the
    // last item in the other: the orange points box (bottom of
    // headerLeft) lines up with the date/Today button row (bottom of
    // headerRight), instead of 'center' vertically centering the two
    // columns as whole blocks - which visually mismatched the title/
    // orange-box baseline against the name+photo/date-row baseline
    // above/below it (reported after switching from the original
    // 'flex-start'). headerRight is still the taller of the two
    // columns, so it stays exactly where it was - only headerLeft moves
    // to meet its bottom edge.
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontWeight: '700',
    fontSize: typography.h1.fontSize,
    color: colors.text,
    letterSpacing: typography.h1.letterSpacing,
    marginBottom: 8,
    // position: 'relative' + a negative `top` shifts ONLY this Text's
    // rendered position upward, without affecting layout/positioning of
    // any sibling - balanceRow/the orange points box keeps its normal
    // flow position (see compactHeader's alignItems: 'flex-end' comment
    // above, which this deliberately does not disturb). A plain negative
    // marginTop would have pulled balanceRow up along with it, since
    // marginTop on the first child in a column shifts where the whole
    // subsequent flow starts, not just this element - relative
    // positioning reserves this element's original box (so later
    // siblings lay out exactly as before) and only offsets what's
    // painted on screen. -10 is a first pass, not a measured exact
    // match to other tabs' title height - adjust if it overshoots or
    // undershoots on-device.
    position: 'relative',
    top: -10,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  balanceGradient: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FF8C42',
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  balanceText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 1,
  },
  balanceLabel: {
    fontSize: typography.body.fontSize,
    color: colors.text,
    fontWeight: '600',
  },
  
  // Right side of compactHeader: profile photo badge stacked above the
  // date picker - see the JSX comment above for why this is a second row
  // rather than reusing <ProfileHeader> wholesale.
  headerRight: {
    alignItems: 'flex-end',
    gap: 8,
  },

  // Compact Date Picker
  datePickerCompact: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  dateButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateCompactButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.card,
  },
  dateCompactText: {
    fontSize: typography.small.fontSize,
    color: colors.text,
    fontWeight: '600',
  },
  todayButtonCompact: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 6,
    backgroundColor: colors.accentLight,
  },
  todayButtonCompactText: {
    fontSize: typography.caption.fontSize,
    color: colors.accent,
    fontWeight: '600',
  },
  
  // Segmented Control
  segmentedControlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 12,
  },
  segmentedControl: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.borderSubtle,
    borderRadius: 10,
    padding: 3,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: {
    backgroundColor: colors.accent,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: typography.small.fontSize,
    fontWeight: '600',
    color: colors.textDim,
    fontFamily: 'Chivo_700Bold',
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  
  // Batch Mode Toggle (compact)
  batchModeToggle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    borderColor: colors.accent,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  batchModeToggleActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  batchModeIconSmall: {
    margin: 0,
  },
  quickLogSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontWeight: '700',
    color: colors.text,
    fontSize: typography.h2.fontSize,
    textTransform: typography.h2.textTransform,
    letterSpacing: typography.h2.letterSpacing,
  },
  activitySectionTitle: {
    marginTop: -12, // Pull Daily Activity title upward
    marginBottom: 12, // Add bottom margin to compensate
  },
  itemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  horizontalContainer: {
    backgroundColor: colors.bg,
  },
  carouselWrapper: {
    backgroundColor: colors.bg,
    overflow: 'visible', // Prevent clipping that might cause visual artifacts
  },
  // Shown instead of the behaviors FlatList while usage counts are still
  // loading (see usageCountsLoaded above) - height matches 2 rows of
  // quickLogItem (minHeight: 124 each) + the gap between them
  // (ITEMS_GRID_GAP) so swapping between placeholder and the real grid
  // doesn't shift the rest of the screen up/down.
  quickLogPlaceholder: {
    height: 124 * 2 + ITEMS_GRID_GAP,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flatListStyle: {
    backgroundColor: 'transparent', // Make FlatList transparent so wrapper shows through
  },
  horizontalScrollView: {
    backgroundColor: colors.bg, // Match page background
    shadowColor: 'transparent', // Remove any shadow
    shadowOpacity: 0,
    elevation: 0,
  },
  horizontalScrollContent: {
    backgroundColor: colors.bg, // Match page background
  },
  itemsGridPage: {
    // width is NOT set here - computed per-render from useWindowDimensions()
    // as itemsGridPageWidth and applied as an inline style override.
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start', // Align from top-left, not centered
    alignItems: 'flex-start', // Align to top
    gap: ITEMS_GRID_GAP,
    paddingHorizontal: ITEMS_GRID_PAGE_HORIZONTAL_PADDING, // Add balanced horizontal padding
    backgroundColor: colors.bg, // Match page background
    shadowColor: 'transparent', // Remove any shadow
    shadowOpacity: 0,
    elevation: 0,
  },
  quickLogItem: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.card,
    padding: 12,
    // width is NOT set here - computed per-render from useWindowDimensions()
    // as quickLogItemWidth and applied as an inline style override, so
    // exactly 3 columns fit on any screen width.
    minHeight: 124, // Keep all tiles the same height regardless of content
    // (real tiles render emoji + title + points; the Custom tile only
    // renders emoji + label, so without a fixed height it came out shorter)
    alignItems: 'center',
    ...shadows.card,
  },
  quickLogItemPressed: {
    opacity: 0.7,
  },
  quickLogItemChecked: {
    borderWidth: 2,
    borderColor: colors.accent,
    backgroundColor: colors.accentLight,
  },
  quickLogItemDisabled: {
    opacity: 0.5,
  },
  customTile: {
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
    justifyContent: 'center',
  },
  checkOverlay: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  checkbox: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  itemEmoji: {
    fontSize: 32,
    marginBottom: 6,
  },
  itemEmojiDisabled: {
    opacity: 0.5,
  },
  itemTitle: {
    fontSize: typography.small.fontSize,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 4,
    minHeight: 32,
  },
  itemTitleDisabled: {
    color: colors.textDim,
  },
  itemPoints: {
    fontSize: typography.small.fontSize,
    fontWeight: '700',
    color: '#4CAF50',
  },
  itemPointsNegative: {
    color: colors.danger,
  },
  itemCost: {
    color: '#2196F3',
  },
  itemCostDisabled: {
    color: colors.textDim,
  },
  emptyCard: {
    borderRadius: radius.card,
    backgroundColor: colors.cardBg,
    ...shadows.card,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textDim,
    fontSize: typography.body.fontSize,
    marginBottom: 8,
  },
  emptyButton: {
    marginTop: 4,
  },
  activitySection: {
    marginBottom: 24,
    marginTop: 16,
  },
  activityCard: {
    borderRadius: radius.card,
    backgroundColor: colors.cardBg,
    ...shadows.card,
  },
  activityCardContent: {
    padding: 0,
  },
  activityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    // Trimmed from spacing.cardPadding (18) so the emoji sits closer to the
    // left edge and the trash icon closer to the right edge, leaving more
    // room for the activity title to avoid wrapping (e.g. "Leave without fuss").
    paddingHorizontal: 10,
  },
  activityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0, // Allow this flex child to shrink below its content size
    // so activityDetails' text can actually wrap/truncate within the
    // available space instead of pushing the row wider.
  },
  activityEmoji: {
    fontSize: 28,
    marginRight: 10,
  },
  activityDetails: {
    flex: 1,
  },
  activityTitle: {
    color: colors.text,
    fontWeight: '600',
    fontSize: typography.body.fontSize,
    marginBottom: 2,
  },
  activityTime: {
    color: colors.textDim,
    fontSize: typography.caption.fontSize,
  },
  activityNote: {
    fontSize: typography.caption.fontSize,
    color: colors.textDim,
    marginTop: 2,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  activityNoteButton: {
    padding: 4,
    marginLeft: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityNoteIcon: {
    fontSize: 14,
    opacity: 0.4,
  },
  activityRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0, // Never let points/balance/icons get squeezed - the
    // title in activityLeft is what should wrap/shrink first, not this side.
  },
  activityPoints: {
    fontWeight: '700',
    fontSize: typography.body.fontSize,
    minWidth: 36,
    textAlign: 'right',
  },
  activityBalance: {
    fontSize: typography.small.fontSize,
    color: colors.textDim,
    minWidth: 48,
    textAlign: 'right',
  },
  deleteButton: {
    margin: 0,
    marginLeft: 2,
  },
  activityDivider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
    marginHorizontal: 10,
  },
  ledgerLink: {
    marginTop: 12,
    alignItems: 'center',
    padding: 8,
  },
  ledgerLinkText: {
    color: colors.accent,
    fontWeight: '600',
    fontSize: typography.body.fontSize,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: colors.accent,
  },
  fabChecklist: {
    backgroundColor: '#4CAF50',
  },
});
