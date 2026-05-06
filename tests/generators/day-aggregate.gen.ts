import * as fc from 'fast-check';
import type { MoodColor, EventType } from '@src/models/index.js';
import type { DayAggregate } from '@src/ui/insights-aggregator.js';
import { moodToScore } from '@src/ui/insights-aggregator.js';

const ALL_EVENT_TYPES: EventType[] = [
  'meltdown', 'shutdown', 'conflict', 'school_incident', 'positive_behavior', 'overwhelm',
  'mood', 'sleep', 'good_sleep', 'poor_sleep', 'diet', 'screen_time', 'physical_wellness', 'medication',
  'playdate', 'watched_tv', 'sick', 'family_adventure', 'played_outside',
  'didnt_eat_dinner', 'wet_bed', 'great_day', 'good_dinner', 'drew_comics',
  'stayed_home', 'aggression', 'fast_food', 'sugar', 'poor_transitions',
  'chores', 'focus', 'reading', 'kindness',
];

/** Produces one of 'red' | 'amber' | 'green'. */
export function arbMoodColor(): fc.Arbitrary<MoodColor> {
  return fc.constantFrom<MoodColor>('red', 'amber', 'green');
}

/** Produces a random event type from the full EventType union. */
export function arbEventType(): fc.Arbitrary<EventType> {
  return fc.constantFrom<EventType>(...ALL_EVENT_TYPES);
}

/** Produces a YYYY-MM-DD date key string. */
export function arbDateKey(): fc.Arbitrary<string> {
  return fc.date({ min: new Date(2020, 0, 1), max: new Date(2030, 11, 31) }).map((d) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
}

/** Produces a random DayAggregate with optional null mood, random event counts by type, random severity. */
export function arbDayAggregate(): fc.Arbitrary<DayAggregate> {
  return fc.record({
    dateKey: arbDateKey(),
    effectiveMood: fc.option(arbMoodColor(), { nil: null }),
    eventCountsByType: fc.dictionary(
      fc.constantFrom(...ALL_EVENT_TYPES),
      fc.integer({ min: 0, max: 10 }),
    ),
    maxSeverity: fc.integer({ min: 0, max: 5 }),
  }).map((rec) => {
    const totalEventCount = Object.values(rec.eventCountsByType).reduce((sum, c) => sum + c, 0);
    return {
      ...rec,
      moodScore: rec.effectiveMood ? moodToScore(rec.effectiveMood) : null,
      totalEventCount,
    };
  });
}

/**
 * Produces an array of DayAggregates with sequential date keys.
 * Useful for testing rolling averages and grouping.
 */
export function arbDayAggregateSequence(opts?: { minLength?: number; maxLength?: number }): fc.Arbitrary<DayAggregate[]> {
  const minLen = opts?.minLength ?? 1;
  const maxLen = opts?.maxLength ?? 90;

  return fc.tuple(
    fc.date({ min: new Date(2023, 0, 1), max: new Date(2025, 0, 1) }),
    fc.integer({ min: minLen, max: maxLen }),
  ).chain(([startDate, length]) => {
    return fc.array(
      fc.record({
        effectiveMood: fc.option(arbMoodColor(), { nil: null }),
        eventCountsByType: fc.dictionary(
          fc.constantFrom(...ALL_EVENT_TYPES),
          fc.integer({ min: 0, max: 10 }),
        ),
        maxSeverity: fc.integer({ min: 0, max: 5 }),
      }),
      { minLength: length, maxLength: length },
    ).map((records) => {
      return records.map((rec, i) => {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const totalEventCount = Object.values(rec.eventCountsByType).reduce((sum, c) => sum + c, 0);
        return {
          dateKey,
          effectiveMood: rec.effectiveMood,
          moodScore: rec.effectiveMood ? moodToScore(rec.effectiveMood) : null,
          totalEventCount,
          eventCountsByType: rec.eventCountsByType,
          maxSeverity: rec.maxSeverity,
        };
      });
    });
  });
}
