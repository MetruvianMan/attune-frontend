import { databaseService } from './database';
import { getDailyLocations, DailyLocations } from './location-service';
import { toLocalDateString } from '../utils/local-date';
import { Event, EventType } from '../models';

/**
 * Deterministic, code-computed day-level statistics - the single source
 * of truth behind BOTH the Chat tab's "VERIFIED STATISTICS" prompt block
 * (see app/(tabs)/conversation.tsx) and the Insights tab's Metrics
 * dashboard (see components/MetricsView.tsx), so the two surfaces can
 * never disagree with each other, and so Chat never has to guess or
 * tally counts/percentages itself from a wall of raw event text - which
 * confirmed-wrong in practice: asked "what percent of tough days were on
 * weekends," the model answered from only the 50 OLDEST of 1196 events
 * (a stale, unrepresentative slice - see fetchAllEvents below for the
 * actual cause) and still got the arithmetic on that slice wrong. LLMs
 * are well known to be unreliable at counting/tallying many items
 * embedded in free text; the fix is to never ask it to, for any question
 * answerable by numbers that already exist in the data.
 */

export type MoodColor = 'green' | 'amber' | 'red';

/**
 * Mirrors the Today tab's own computeAutoMood/RED_EVENTS/GREEN_EVENTS/
 * getDefaultSeverity (app/(tabs)/index.tsx) - copied verbatim rather than
 * imported, matching this project's established pattern of deliberately
 * independent copies of this exact scoring algorithm (see
 * WeatherView.tsx/HeatMapView.tsx, which already keep their own copies
 * rather than importing a shared one, specifically to avoid an unrelated
 * fix silently changing another screen's mood-scoring behavior). This is
 * a fourth, equally independent copy - but it deliberately matches the
 * TODAY TAB's copy specifically (not constants/events.ts's slightly
 * different canonical GREEN_EVENTS, which additionally includes 'camp'/
 * 'creative'), since the Today tab's "🔴 Tough day" label is the exact
 * thing a Parent sees and manually counts against when sanity-checking
 * Chat's or this dashboard's numbers - using a different list here would
 * make this module's "tough day" count disagree with the one visible
 * on-screen, defeating the point of making this dependable.
 */
const RED_EVENTS: EventType[] = ['meltdown', 'shutdown', 'conflict', 'school_incident', 'aggression', 'poor_transitions', 'refusal', 'naughty', 'bad_language', 'injury', 'sneaky', 'toilet_issue', 'angry', 'didnt_eat_dinner', 'overwhelm'];
const GREEN_EVENTS: EventType[] = ['great_day', 'positive_behavior', 'good_behavior', 'good_sleep', 'good_dinner', 'played_outside', 'family_adventure', 'kindness', 'reading', 'focus', 'chores', 'drew_comics', 'playdate', 'sibling_harmony', 'helpful', 'bounceback', 'dad_bonding', 'mom_bonding'];

function getDefaultSeverity(eventType: EventType): number {
  if (eventType === 'angry' || eventType === 'didnt_eat_dinner') {
    return 2;
  }
  return 3;
}

/** Exact copy of app/(tabs)/index.tsx's computeAutoMood - see that file if this ever needs to change, and change both together. */
export function computeDayMood(events: Event[]): MoodColor {
  if (events.length === 0) return 'green';

  let score = 0;
  for (const event of events) {
    if (event.valence) {
      if (event.valence === 'positive') {
        score += 2;
      } else if (event.valence === 'negative') {
        score -= (event.severity ?? getDefaultSeverity(event.eventType));
      }
    } else {
      if (RED_EVENTS.includes(event.eventType)) {
        score -= (event.severity ?? getDefaultSeverity(event.eventType));
      } else if (GREEN_EVENTS.includes(event.eventType)) {
        score += 2;
      }
    }
  }

  if (score <= -3) return 'red';
  if (score < 2) return 'amber';
  return 'green';
}

/**
 * Fetches EVERY event for a profile, paginating past Supabase's default
 * row cap (1,000 rows per request, silently truncated unless the caller
 * explicitly pages via limit/offset - see
 * https://supabase.com/docs/reference/javascript/select). Confirmed this
 * was actively truncating real data: Robbie's profile has 1,196 events,
 * but an unpaginated `getEvents({ childProfileId })` call returns exactly
 * 1,000 - silently dropping the 196 MOST RECENT ones, since
 * database-supabase.ts's getEvents orders oldest-first. Every caller
 * that needs a true, complete picture of a profile's event history
 * (Chat's statistics, this module, the Metrics dashboard) must go
 * through this function instead of calling databaseService.getEvents
 * directly with no limit - an unpaginated call looks like it returns
 * "all" events but silently doesn't once a profile crosses 1,000.
 */
export async function fetchAllEvents(childProfileId: string): Promise<Event[]> {
  const PAGE_SIZE = 1000;
  const all: Event[] = [];
  let offset = 0;

  while (true) {
    const page = await databaseService.getEvents({ childProfileId, limit: PAGE_SIZE, offset });
    all.push(...page);
    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return all;
}

function eventDateKey(event: Event): string {
  return event.localDate ?? toLocalDateString(event.timestamp);
}

/** 'YYYY-MM-DD' -> true if that calendar day is a Saturday or Sunday. */
function isWeekendDateKey(dateKey: string): boolean {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dayOfWeek = new Date(y, m - 1, d).getDay(); // 0 = Sunday, 6 = Saturday
  return dayOfWeek === 0 || dayOfWeek === 6;
}

export interface DayStats {
  dateKey: string;
  isWeekend: boolean;
  mood: MoodColor;
  isToughDay: boolean;
  /**
   * undefined (not false) whenever the profile has no location tracking
   * configured at all - the same privacy-default distinction
   * hooks/useTodayLocation.ts makes between "no SavedPlace configured"
   * and "resolved to not-away." A question about travel should get an
   * honest "no location data available" rather than a confident `false`
   * that looks like a real answer but isn't one.
   */
  childAwayFromHome?: boolean;
  momAway?: boolean;
  dadAway?: boolean;
}

export interface DayAnalyticsSummary {
  /** Real total from fetchAllEvents - never a silently-capped count. */
  totalEventsLogged: number;
  totalDaysWithEvents: number;
  toughDays: number;
  okDays: number;
  goodDays: number;
  toughDaysOnWeekend: number;
  toughDaysOnWeekday: number;
  /** Percent (0-100, one decimal place) of tough days that fell on a weekend. Null if there are no tough days to take a percentage of. */
  toughDayWeekendPercent: number | null;
  /** False whenever the profile has no SavedPlace configured - every *Away field below is then undefined, not a guessed 0. */
  hasLocationData: boolean;
  toughDaysChildAway?: number;
  toughDaysMomAway?: number;
  toughDaysDadAway?: number;
  /** Full per-day breakdown, reverse-chronological, for anything that wants to slice/display further (e.g. the Metrics dashboard's own date-range selector, or a future question type this summary doesn't pre-aggregate). */
  days: DayStats[];
}

/**
 * Core aggregation logic, taking an already-fetched event list rather
 * than fetching its own - lets a caller that also needs the raw events
 * for something else (e.g. Chat's "recent events" prose section) reuse
 * one fetchAllEvents() call instead of two. Most callers should use
 * getDayAnalytics below instead, which does the fetch itself.
 */
export async function computeDayAnalytics(allEvents: Event[], childProfileId: string): Promise<DayAnalyticsSummary> {
  const eventsByDay = new Map<string, Event[]>();
  for (const event of allEvents) {
    const key = eventDateKey(event);
    const existing = eventsByDay.get(key);
    if (existing) {
      existing.push(event);
    } else {
      eventsByDay.set(key, [event]);
    }
  }

  const sortedDateKeys = [...eventsByDay.keys()].sort();

  // Parent-set mood overrides (see database.ts's getMoodOverridesInRange)
  // take precedence over the auto-computed mood below for any day
  // present in this map - same effective-mood rule as the Today tab
  // (overrideMood ?? autoMood), so a day the Parent corrected from Tough
  // to Mixed on Today also reads as Mixed here, not just on that one
  // screen. Falls back to an empty map (every day uses its
  // auto-computed mood) if this fails for any reason - these stats
  // shouldn't become unavailable over a secondary read like this.
  let moodOverrides = new Map<string, string>();
  if (sortedDateKeys.length > 0) {
    try {
      moodOverrides = await databaseService.getMoodOverridesInRange(
        childProfileId,
        sortedDateKeys[0],
        sortedDateKeys[sortedDateKeys.length - 1],
      );
    } catch (error) {
      console.error('[day-analytics-service] Failed to load mood overrides (non-fatal):', error);
    }
  }

  // Location/travel cross-reference only if the profile has actually
  // opted in by configuring at least one SavedPlace (Requirement 7.2's
  // privacy default, same gate as hooks/useTodayLocation.ts) - never
  // inferred or guessed.
  const savedPlaces = sortedDateKeys.length > 0
    ? await databaseService.getSavedPlacesByProfile(childProfileId)
    : [];
  const hasLocationData = savedPlaces.length > 0;

  let dailyLocations: DailyLocations[] = [];
  if (hasLocationData) {
    dailyLocations = await getDailyLocations(childProfileId, {
      start: sortedDateKeys[0],
      end: sortedDateKeys[sortedDateKeys.length - 1],
    });
  }
  const locationByDate = new Map(dailyLocations.map((d) => [d.dateKey, d]));

  const days: DayStats[] = sortedDateKeys.map((dateKey) => {
    const dayEvents = eventsByDay.get(dateKey)!;
    const autoMood = computeDayMood(dayEvents);
    const mood = (moodOverrides.get(dateKey) as MoodColor | undefined) ?? autoMood;
    const loc = locationByDate.get(dateKey);

    return {
      dateKey,
      isWeekend: isWeekendDateKey(dateKey),
      mood,
      isToughDay: mood === 'red',
      childAwayFromHome: hasLocationData ? !!loc?.isTransitionDay : undefined,
      momAway: hasLocationData ? !!loc?.separatedFrom.includes('mom') : undefined,
      dadAway: hasLocationData ? !!loc?.separatedFrom.includes('dad') : undefined,
    };
  }).reverse(); // reverse-chronological, matching every other list view in this app

  const toughDayList = days.filter((d) => d.isToughDay);
  const toughDaysOnWeekend = toughDayList.filter((d) => d.isWeekend).length;
  const toughDaysOnWeekday = toughDayList.length - toughDaysOnWeekend;

  return {
    totalEventsLogged: allEvents.length,
    totalDaysWithEvents: days.length,
    toughDays: toughDayList.length,
    okDays: days.filter((d) => d.mood === 'amber').length,
    goodDays: days.filter((d) => d.mood === 'green').length,
    toughDaysOnWeekend,
    toughDaysOnWeekday,
    toughDayWeekendPercent: toughDayList.length > 0
      ? Math.round((toughDaysOnWeekend / toughDayList.length) * 1000) / 10
      : null,
    hasLocationData,
    toughDaysChildAway: hasLocationData ? toughDayList.filter((d) => d.childAwayFromHome).length : undefined,
    toughDaysMomAway: hasLocationData ? toughDayList.filter((d) => d.momAway).length : undefined,
    toughDaysDadAway: hasLocationData ? toughDayList.filter((d) => d.dadAway).length : undefined,
    days,
  };
}

/**
 * The function most callers (the Metrics dashboard, any one-off check)
 * should use to get real, verified day-level statistics for a profile -
 * fetches the complete event history itself via fetchAllEvents. Chat's
 * prompt-builder calls fetchAllEvents + computeDayAnalytics directly
 * instead, since it also needs the raw event list for its own "recent
 * events" prose section and would otherwise fetch the full history
 * twice. See this file's header comment for why nothing should attempt
 * this kind of aggregation itself (via raw event lists fed to an LLM, or
 * via a second independent implementation of this logic).
 */
export async function getDayAnalytics(childProfileId: string): Promise<DayAnalyticsSummary> {
  const allEvents = await fetchAllEvents(childProfileId);
  return computeDayAnalytics(allEvents, childProfileId);
}

/**
 * Renders a DayAnalyticsSummary as a labeled text block for the Chat
 * prompt - every number here is already correct (computed in code, not
 * by the model), so the prompt only needs to tell the model to use these
 * numbers verbatim for any count/percentage question, never to compute
 * its own from the raw event list below this block.
 */
export function formatDayAnalyticsForPrompt(summary: DayAnalyticsSummary): string {
  const lines: string[] = [
    `Total events logged (real count, all history): ${summary.totalEventsLogged}`,
    `Total distinct days with at least one logged event: ${summary.totalDaysWithEvents}`,
    `Tough days (🔴, matching the Today tab's own "Tough day" mood label): ${summary.toughDays}`,
    `  - of those, on a weekend (Sat/Sun): ${summary.toughDaysOnWeekend}`,
    `  - of those, on a weekday (Mon-Fri): ${summary.toughDaysOnWeekday}`,
  ];
  if (summary.toughDayWeekendPercent !== null) {
    lines.push(`  - percent of tough days that were on a weekend: ${summary.toughDayWeekendPercent}%`);
  }
  lines.push(`Okay days (🟡): ${summary.okDays}`, `Good days (🟢): ${summary.goodDays}`);

  if (summary.hasLocationData) {
    lines.push(
      `Tough days while the child was away from their usual Home place: ${summary.toughDaysChildAway}`,
      `Tough days while Mom was separated from the child (traveling/elsewhere): ${summary.toughDaysMomAway}`,
      `Tough days while Dad was separated from the child (traveling/elsewhere): ${summary.toughDaysDadAway}`,
    );
  } else {
    lines.push('Location/travel data: not available (no Saved Places configured for this profile) - do not answer any travel-related question with a guess; say this data isn\'t available.');
  }

  return lines.join('\n');
}
