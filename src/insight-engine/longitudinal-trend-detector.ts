import type { DataStore } from '@src/data-store/data-store.js';
import type { NLPPipeline, Correlation, Pattern } from '@src/nlp-pipeline/nlp-pipeline.js';
import type { ToneComplianceFilter } from '@src/tone-compliance/tone-compliance-filter.js';
import type { Insight, SupportingSignal, CommunicationScript } from '@src/models/index.js';
import type { Event } from '@src/models/index.js';

/** Sensitive topics that warrant communication scripts. */
const SENSITIVE_TOPICS = new Set([
  'bedwetting',
  'sleep_regression',
  'toileting',
  'self-harm',
  'aggression',
  'anxiety',
]);

/** Neuro-affirming communication script templates for sensitive topics. */
const SCRIPT_TEMPLATES: Record<string, CommunicationScript> = {
  bedwetting: {
    topic: 'bedwetting',
    script:
      "Bodies do things at night sometimes. Let's get fresh sheets together — no big deal.",
    context:
      'Use a matter-of-fact, shame-free tone when addressing nighttime accidents.',
  },
  sleep_regression: {
    topic: 'sleep regression',
    script:
      "It looks like sleep has been harder lately. That's okay — brains sometimes need extra time to wind down when they're growing and learning new things.",
    context:
      'Normalize sleep variability and avoid framing it as a setback.',
  },
  toileting: {
    topic: 'toileting',
    script:
      "Everyone's body works on its own schedule. Let's keep practicing and celebrate the wins.",
    context:
      'Keep language neutral and body-positive when discussing toileting milestones.',
  },
};

/**
 * Detects longitudinal trends across 30+ days of event data.
 * Analyzes recurring patterns by day of week and time of month.
 */
export async function detectLongitudinalTrends(
  childProfileId: string,
  dataStore: DataStore,
  nlpPipeline: NLPPipeline,
  toneFilter: ToneComplianceFilter,
): Promise<Insight | null> {
  const now = new Date();

  // Get all events for the child (no date filter — we need the full history)
  const allEvents = dataStore.getEvents({ childProfileId });

  if (allEvents.length === 0) {
    return null;
  }

  // Check if we have 30+ days of data
  const timestamps = allEvents.map((e) => e.timestamp.getTime());
  const earliest = new Date(Math.min(...timestamps));
  const latest = new Date(Math.max(...timestamps));
  const daySpan = (latest.getTime() - earliest.getTime()) / (24 * 60 * 60 * 1000);

  if (daySpan < 30) {
    return null;
  }

  // Analyze patterns by day of week
  const dayOfWeekPatterns = analyzeDayOfWeekPatterns(allEvents);

  // Analyze patterns by time of month (first half vs second half)
  const timeOfMonthPatterns = analyzeTimeOfMonthPatterns(allEvents);

  // Detect sensitive recurring topics from tags
  const sensitiveTopics = detectSensitiveTopics(allEvents);

  // Build correlations and patterns
  const correlations: Correlation[] = [];
  const patterns: Pattern[] = [];

  for (const [day, counts] of dayOfWeekPatterns.entries()) {
    const total = Object.values(counts).reduce((sum, c) => sum + c, 0);
    if (total >= 3) {
      const topType = Object.entries(counts).sort(([, a], [, b]) => b - a)[0];
      if (topType) {
        correlations.push({
          factor1: dayNames[day],
          factor2: topType[0],
          strength: topType[1] >= 5 ? 'strong' : 'moderate',
          description: `${topType[0]} events occur ${topType[1]} times on ${dayNames[day]}s`,
        });
      }
    }
  }

  for (const pattern of timeOfMonthPatterns) {
    patterns.push(pattern);
  }

  if (correlations.length === 0 && patterns.length === 0) {
    return null;
  }

  // Generate narrative
  const rawNarrative = await nlpPipeline.generateInsightNarrative(correlations, patterns);
  const narrative = toneFilter.reframe(rawNarrative);

  // Build supporting signals
  const supportingSignals: SupportingSignal[] = correlations.map((c) => ({
    description: c.description,
    observationCount: parseInt(c.description.match(/(\d+) times/)?.[1] ?? '1', 10),
    contributingFactors: [c.factor1, c.factor2],
  }));

  if (supportingSignals.length === 0) {
    supportingSignals.push({
      description: 'Longitudinal patterns detected across time periods',
      observationCount: allEvents.length,
      contributingFactors: patterns.map((p) => p.type),
    });
  }

  // Build communication scripts for sensitive topics
  const communicationScripts: CommunicationScript[] = [];
  for (const topic of sensitiveTopics) {
    const template = SCRIPT_TEMPLATES[topic];
    if (template) {
      communicationScripts.push({ ...template });
    } else {
      communicationScripts.push({
        topic,
        script: `When discussing ${topic}, use a calm, matter-of-fact tone that normalizes the experience and avoids shame.`,
        context: `This topic has recurred over the observation period and may benefit from prepared language.`,
      });
    }
  }

  const insight: Insight = {
    id: crypto.randomUUID(),
    childProfileId,
    type: 'longitudinal_trend',
    narrative,
    supportingSignals,
    confidenceScore: daySpan >= 90 ? 'high' : 'medium',
    explainabilityStatement: `This insight was generated from ${Math.round(daySpan)} days of data (${allEvents.length} events), analyzing recurring patterns by day of week and time of month.`,
    timeSpan: { start: earliest, end: latest },
    communicationScripts: communicationScripts.length > 0 ? communicationScripts : undefined,
    strategyIds: [],
    createdAt: now,
  };

  dataStore.saveInsight(insight);
  return insight;
}

const dayNames: Record<number, string> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
};

/**
 * Count event types by day of week.
 */
function analyzeDayOfWeekPatterns(events: Event[]): Map<number, Record<string, number>> {
  const map = new Map<number, Record<string, number>>();

  for (const event of events) {
    const dow = event.timestamp.getDay();
    const counts = map.get(dow) ?? {};
    counts[event.eventType] = (counts[event.eventType] ?? 0) + 1;
    map.set(dow, counts);
  }

  return map;
}

/**
 * Detect patterns by time of month (first half vs second half).
 */
function analyzeTimeOfMonthPatterns(events: Event[]): Pattern[] {
  const firstHalf: Record<string, number> = {};
  const secondHalf: Record<string, number> = {};

  for (const event of events) {
    const dayOfMonth = event.timestamp.getDate();
    const bucket = dayOfMonth <= 15 ? firstHalf : secondHalf;
    bucket[event.eventType] = (bucket[event.eventType] ?? 0) + 1;
  }

  const patterns: Pattern[] = [];

  // Look for event types that are significantly more common in one half
  const allTypes = new Set([...Object.keys(firstHalf), ...Object.keys(secondHalf)]);
  for (const eventType of allTypes) {
    const first = firstHalf[eventType] ?? 0;
    const second = secondHalf[eventType] ?? 0;
    const total = first + second;
    if (total >= 4) {
      const ratio = Math.max(first, second) / total;
      if (ratio >= 0.7) {
        const half = first > second ? 'first half' : 'second half';
        patterns.push({
          type: `monthly_${eventType}`,
          description: `${eventType} events tend to cluster in the ${half} of the month (${Math.max(first, second)} of ${total})`,
          occurrences: Math.max(first, second),
        });
      }
    }
  }

  return patterns;
}

/**
 * Detect sensitive recurring topics from event tags.
 */
function detectSensitiveTopics(events: Event[]): string[] {
  const tagCounts = new Map<string, number>();

  for (const event of events) {
    for (const tag of event.tags) {
      const normalizedTag = tag.toLowerCase().replace(/\s+/g, '_');
      if (SENSITIVE_TOPICS.has(normalizedTag)) {
        tagCounts.set(normalizedTag, (tagCounts.get(normalizedTag) ?? 0) + 1);
      }
    }
  }

  // Return topics that appear 3+ times
  return [...tagCounts.entries()]
    .filter(([, count]) => count >= 3)
    .map(([topic]) => topic);
}
