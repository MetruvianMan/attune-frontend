import type { DataStore } from '@src/data-store/data-store.js';
import type { NLPPipeline, Correlation, Pattern } from '@src/nlp-pipeline/nlp-pipeline.js';
import type { ToneComplianceFilter } from '@src/tone-compliance/tone-compliance-filter.js';
import type { Insight, SupportingSignal } from '@src/models/index.js';
import type { Event, ContextEntry } from '@src/models/index.js';

/**
 * Identifies "good days" — days with positive_behavior events and no
 * meltdown/shutdown/conflict events — and detects shared conditions
 * across 3+ good days within a 14-day window.
 */
export async function detectPositivePatterns(
  childProfileId: string,
  dataStore: DataStore,
  nlpPipeline: NLPPipeline,
  toneFilter: ToneComplianceFilter,
): Promise<Insight | null> {
  const now = new Date();
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  // Get all events in the 14-day window
  const events = dataStore.getEvents({
    childProfileId,
    dateRange: { start: fourteenDaysAgo, end: now },
  });

  if (events.length === 0) {
    return null;
  }

  // Get context entries for the same window
  const contextEntries = dataStore.getContextEntries({
    childProfileId,
    dateRange: { start: fourteenDaysAgo, end: now },
  });

  // Group events by day (YYYY-MM-DD)
  const eventsByDay = groupEventsByDay(events);

  // Identify good days: days with positive_behavior AND no meltdown/shutdown/conflict
  const negativeBehaviors = new Set(['meltdown', 'shutdown', 'conflict']);
  const goodDays: string[] = [];

  for (const [day, dayEvents] of eventsByDay.entries()) {
    const hasPositive = dayEvents.some((e) => e.eventType === 'positive_behavior');
    const hasNegative = dayEvents.some((e) => negativeBehaviors.has(e.eventType));
    if (hasPositive && !hasNegative) {
      goodDays.push(day);
    }
  }

  if (goodDays.length < 3) {
    return null;
  }

  // Find shared conditions across good days
  const sharedConditions = findSharedConditions(goodDays, eventsByDay, contextEntries);

  if (sharedConditions.length === 0) {
    return null;
  }

  // Build correlations and patterns for narrative generation
  const correlations: Correlation[] = sharedConditions.map((condition) => ({
    factor1: 'good day',
    factor2: condition,
    strength: 'moderate' as const,
    description: `Good days shared this condition: ${condition}`,
  }));

  const patterns: Pattern[] = [
    {
      type: 'positive_pattern',
      description: `${goodDays.length} good days in the past 14 days shared common conditions`,
      occurrences: goodDays.length,
    },
  ];

  // Generate narrative
  const rawNarrative = await nlpPipeline.generateInsightNarrative(correlations, patterns);
  const narrative = toneFilter.reframe(rawNarrative);

  // Build supporting signals
  const supportingSignals: SupportingSignal[] = sharedConditions.map((condition) => ({
    description: `Good days shared condition: ${condition}`,
    observationCount: goodDays.length,
    contributingFactors: [condition],
  }));

  const insight: Insight = {
    id: crypto.randomUUID(),
    childProfileId,
    type: 'positive_pattern',
    narrative,
    supportingSignals,
    confidenceScore: goodDays.length >= 5 ? 'high' : 'medium',
    explainabilityStatement: `This insight was generated because ${goodDays.length} good days in the past 14 days shared these conditions: ${sharedConditions.join(', ')}.`,
    timeSpan: { start: fourteenDaysAgo, end: now },
    strategyIds: [],
    createdAt: now,
  };

  dataStore.saveInsight(insight);
  return insight;
}

function groupEventsByDay(events: Event[]): Map<string, Event[]> {
  const map = new Map<string, Event[]>();
  for (const event of events) {
    const day = toDayKey(event.timestamp);
    const existing = map.get(day) ?? [];
    existing.push(event);
    map.set(day, existing);
  }
  return map;
}

function toDayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * Find conditions shared across good days.
 * Conditions include: context entry types/subtypes, sleep-related events, tags.
 */
function findSharedConditions(
  goodDays: string[],
  eventsByDay: Map<string, Event[]>,
  contextEntries: ContextEntry[],
): string[] {
  // For each good day, collect a set of "conditions"
  const conditionSets: Set<string>[] = goodDays.map((day) => {
    const conditions = new Set<string>();
    const dayEvents = eventsByDay.get(day) ?? [];

    // Add event-based conditions (tags, sleep quality)
    for (const event of dayEvents) {
      for (const tag of event.tags) {
        conditions.add(`tag:${tag}`);
      }
      if (event.eventType === 'sleep' && event.severity !== undefined) {
        conditions.add(event.severity >= 4 ? 'good_sleep' : event.severity <= 2 ? 'poor_sleep' : 'moderate_sleep');
      }
    }

    // Add context-based conditions
    const dayDate = new Date(day);
    const dayStart = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate());
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

    for (const ctx of contextEntries) {
      const ctxStart = ctx.startTime;
      const ctxEnd = ctx.endTime ?? new Date();
      // Context overlaps with this day
      if (ctxStart < dayEnd && ctxEnd >= dayStart) {
        conditions.add(`context:${ctx.contextType}/${ctx.subType}`);
      }
    }

    return conditions;
  });

  // Find conditions present in ALL good days
  if (conditionSets.length === 0) {
    return [];
  }

  const shared: string[] = [];
  const firstSet = conditionSets[0];
  for (const condition of firstSet) {
    if (conditionSets.every((s) => s.has(condition))) {
      shared.push(condition);
    }
  }

  return shared;
}
