import type { DataStore } from '@src/data-store/data-store.js';
import type { MoodColor, EventType } from '@src/models/index.js';

/** Event types that push the day toward red */
const RED_EVENTS: EventType[] = ['meltdown', 'shutdown', 'conflict', 'school_incident', 'aggression', 'poor_transitions', 'overwhelm', 'refusal', 'naughty', 'bad_language', 'injury', 'sneaky', 'toilet_issue'];
/** Event types that push the day toward green */
const GREEN_EVENTS: EventType[] = ['great_day', 'positive_behavior', 'good_sleep', 'good_dinner', 'played_outside', 'family_adventure', 'kindness', 'reading', 'focus', 'chores', 'drew_comics', 'playdate', 'sibling_harmony', 'helpful', 'bounceback', 'dad_bonding', 'mom_bonding'];

/** A single day's aggregated data for visualizations. */
export interface DayAggregate {
  dateKey: string;                          // YYYY-MM-DD
  effectiveMood: MoodColor | null;          // overrideMood ?? autoMood, or null if no DayMood
  moodScore: number | null;                 // green=3, amber=2, red=1, null if no mood
  totalEventCount: number;
  eventCountsByType: Record<string, number>;
  maxSeverity: number;                      // highest severity among the day's events, 0 if none
}

/** Rolling average data point for sparklines. */
export interface RollingDataPoint {
  dateKey: string;
  value: number | null;                     // rolling average value, null if window has no data
}

/** A group of consecutive days sharing the same effective mood. */
export interface MoodRun {
  mood: MoodColor | null;
  days: DayAggregate[];
}

/** Convert a MoodColor to a numeric score. */
export function moodToScore(color: MoodColor): number {
  switch (color) {
    case 'green': return 3;
    case 'amber': return 2;
    case 'red': return 1;
  }
}

/** Format a Date as YYYY-MM-DD. */
function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Compute auto-mood from a set of events (mirrors today-view logic). */
function computeAutoMoodFromEvents(events: { eventType: string; severity?: number }[]): MoodColor | null {
  if (events.length === 0) return null; // no events = no mood data
  let score = 0;
  for (const e of events) {
    if (RED_EVENTS.includes(e.eventType as EventType)) {
      score -= (e.severity ?? 3);
    } else if (GREEN_EVENTS.includes(e.eventType as EventType)) {
      score += 2;
    }
  }
  if (score <= -3) return 'red';
  if (score < 3) return 'amber';
  return 'green';
}

/**
 * Build an array of DayAggregate for a date range (inclusive).
 * Fills in every calendar day including days with no events/mood.
 */
export function buildDayAggregates(
  dataStore: DataStore,
  childProfileId: string,
  startDate: Date,
  endDate: Date,
): DayAggregate[] {
  const aggregates: DayAggregate[] = [];

  // Normalize to start/end of day to ensure we capture all events
  const rangeStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const rangeEnd = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999);

  // Get all events in the range
  const events = dataStore.getEvents({
    childProfileId,
    dateRange: { start: rangeStart, end: rangeEnd },
  });

  // Group events by date key
  const eventsByDate = new Map<string, typeof events>();
  for (const event of events) {
    const key = toDateKey(event.timestamp);
    const existing = eventsByDate.get(key) ?? [];
    existing.push(event);
    eventsByDate.set(key, existing);
  }

  // Iterate through each day in the range
  const current = new Date(rangeStart);
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

  while (current <= end) {
    const dateKey = toDateKey(current);
    const dayEvents = eventsByDate.get(dateKey) ?? [];

    // Get DayMood for this day
    const dayMood = dataStore.getDayMood(childProfileId, dateKey);
    let effectiveMood: MoodColor | null;
    if (dayMood) {
      effectiveMood = dayMood.overrideMood ?? dayMood.autoMood;
    } else {
      // No DayMood record — compute from events on the fly
      effectiveMood = computeAutoMoodFromEvents(dayEvents);
    }

    // Count events by type
    const eventCountsByType: Record<string, number> = {};
    let maxSeverity = 0;
    for (const event of dayEvents) {
      eventCountsByType[event.eventType] = (eventCountsByType[event.eventType] ?? 0) + 1;
      if (event.severity && event.severity > maxSeverity) {
        maxSeverity = event.severity;
      }
    }

    aggregates.push({
      dateKey,
      effectiveMood,
      moodScore: effectiveMood ? moodToScore(effectiveMood) : null,
      totalEventCount: dayEvents.length,
      eventCountsByType,
      maxSeverity,
    });

    current.setDate(current.getDate() + 1);
  }

  return aggregates;
}

/**
 * Compute a rolling average over DayAggregate mood scores.
 * Days with null mood are skipped in the window.
 * Returns null value if all scores in the window are null.
 */
export function computeRollingMoodAverage(
  aggregates: DayAggregate[],
  windowSize: number,
): RollingDataPoint[] {
  const results: RollingDataPoint[] = [];

  for (let i = 0; i < aggregates.length; i++) {
    const windowStart = Math.max(0, i - windowSize + 1);
    let sum = 0;
    let count = 0;

    for (let j = windowStart; j <= i; j++) {
      if (aggregates[j].moodScore !== null) {
        sum += aggregates[j].moodScore!;
        count++;
      }
    }

    results.push({
      dateKey: aggregates[i].dateKey,
      value: count > 0 ? sum / count : null,
    });
  }

  return results;
}

/**
 * Compute a rolling count of a specific event type.
 */
export function computeRollingEventCount(
  aggregates: DayAggregate[],
  eventType: string,
  windowSize: number,
): RollingDataPoint[] {
  const results: RollingDataPoint[] = [];

  for (let i = 0; i < aggregates.length; i++) {
    const windowStart = Math.max(0, i - windowSize + 1);
    let sum = 0;

    for (let j = windowStart; j <= i; j++) {
      sum += aggregates[j].eventCountsByType[eventType] ?? 0;
    }

    results.push({
      dateKey: aggregates[i].dateKey,
      value: sum,
    });
  }

  return results;
}

/**
 * Group consecutive DayAggregate entries by their effective mood.
 * Adjacent groups will always have different moods (or one is null).
 */
export function groupConsecutiveMoods(aggregates: DayAggregate[]): MoodRun[] {
  if (aggregates.length === 0) return [];

  const runs: MoodRun[] = [];
  let currentRun: MoodRun = { mood: aggregates[0].effectiveMood, days: [aggregates[0]] };

  for (let i = 1; i < aggregates.length; i++) {
    const mood = aggregates[i].effectiveMood;
    if (mood === currentRun.mood) {
      currentRun.days.push(aggregates[i]);
    } else {
      runs.push(currentRun);
      currentRun = { mood, days: [aggregates[i]] };
    }
  }

  runs.push(currentRun);
  return runs;
}
