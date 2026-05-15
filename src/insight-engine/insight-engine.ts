import type { DataStore } from '@src/data-store/data-store.js';
import type { NLPPipeline, Correlation, Pattern, RelevantData } from '@src/nlp-pipeline/nlp-pipeline.js';
import type { ToneComplianceFilter } from '@src/tone-compliance/tone-compliance-filter.js';
import type {
  Insight,
  SupportingSignal,
  DataReference,
  Event,
  ContextEntry,
  ConversationSession,
  RelationshipCategory,
  RelationshipPerson,
} from '@src/models/index.js';
import { detectPositivePatterns } from './positive-pattern-detector.js';
import { detectLongitudinalTrends } from './longitudinal-trend-detector.js';
import { synthesizeDocuments } from './document-synthesizer.js';

export interface ConversationResponse {
  narrative: string;
  supportingDataRefs: DataReference[];
  followUpSuggestions?: string[];
}

export interface InsightEngine {
  generateWeeklyInsight(childProfileId: string): Promise<Insight | null>;
  generateLongitudinalInsight(childProfileId: string): Promise<Insight | null>;
  detectPositivePatterns(childProfileId: string): Promise<Insight | null>;
  generateDocumentSynthesis(childProfileId: string): Promise<Insight | null>;
  answerQuery(session: ConversationSession, query: string): Promise<ConversationResponse>;
}

export class InsightEngineImpl implements InsightEngine {
  private dataStore: DataStore;
  private nlpPipeline: NLPPipeline;
  private toneFilter: ToneComplianceFilter;

  constructor(
    dataStore: DataStore,
    nlpPipeline: NLPPipeline,
    toneFilter: ToneComplianceFilter,
  ) {
    this.dataStore = dataStore;
    this.nlpPipeline = nlpPipeline;
    this.toneFilter = toneFilter;
  }

  /**
   * Generate a weekly insight for the given child profile.
   *
   * - Gets events from the last 7 days
   * - Skips if fewer than 3 events OR less than 7 days of data history
   * - Analyzes correlations between sleep/routine/parent-state/relationships and behavioral events
   * - Produces narrative with supporting signals, confidence score, explainability
   * - Passes narrative through ToneComplianceFilter
   * - Persists insight to DataStore
   */
  async generateWeeklyInsight(childProfileId: string): Promise<Insight | null> {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get events from the last 7 days
    const recentEvents = this.dataStore.getEvents({
      childProfileId,
      dateRange: { start: sevenDaysAgo, end: now },
    });

    // Threshold: need at least 3 events in the current week
    if (recentEvents.length < 3) {
      return null;
    }

    // Check that we have at least 7 days of data history
    const allEvents = this.dataStore.getEvents({ childProfileId });
    if (allEvents.length === 0) {
      return null;
    }

    const timestamps = allEvents.map((e) => e.timestamp.getTime());
    const earliest = new Date(Math.min(...timestamps));
    const daySpan = (now.getTime() - earliest.getTime()) / (24 * 60 * 60 * 1000);

    if (daySpan < 7) {
      return null;
    }

    // Get context entries for the same period
    const contextEntries = this.dataStore.getContextEntries({
      childProfileId,
      dateRange: { start: sevenDaysAgo, end: now },
    });

    // Analyze correlations
    const correlations = this.analyzeCorrelations(recentEvents, contextEntries);
    const patterns = this.detectPatterns(recentEvents);

    // Generate narrative via NLP pipeline
    const rawNarrative = await this.nlpPipeline.generateInsightNarrative(correlations, patterns);

    // Apply tone compliance filter
    const narrative = this.toneFilter.reframe(rawNarrative);

    // Build supporting signals
    const supportingSignals = this.buildSupportingSignals(correlations, patterns);

    // Determine confidence score
    const confidenceScore = this.calculateConfidence(correlations, recentEvents.length);

    // Build explainability statement
    const explainabilityStatement = this.buildExplainability(correlations, patterns, recentEvents.length);

    const insight: Insight = {
      id: crypto.randomUUID(),
      childProfileId,
      type: 'weekly',
      narrative,
      supportingSignals,
      confidenceScore,
      explainabilityStatement,
      timeSpan: { start: sevenDaysAgo, end: now },
      strategyIds: [],
      createdAt: now,
    };

    this.dataStore.saveInsight(insight);
    return insight;
  }

  async generateLongitudinalInsight(childProfileId: string): Promise<Insight | null> {
    return detectLongitudinalTrends(
      childProfileId,
      this.dataStore,
      this.nlpPipeline,
      this.toneFilter,
    );
  }

  async detectPositivePatterns(childProfileId: string): Promise<Insight | null> {
    return detectPositivePatterns(
      childProfileId,
      this.dataStore,
      this.nlpPipeline,
      this.toneFilter,
    );
  }

  async generateDocumentSynthesis(childProfileId: string): Promise<Insight | null> {
    return synthesizeDocuments(
      childProfileId,
      this.dataStore,
      this.nlpPipeline,
      this.toneFilter,
    );
  }

  /**
   * Answer a natural language query within a conversation session.
   *
   * - Uses NLPPipeline.interpretQuery to parse the query
   * - Searches events, context entries, documents, and insights
   * - Resolves mentioned person names to RelationshipPersons for context
   * - Generates a conversational response with data references
   * - Handles insufficient data with logging suggestions
   */
  async answerQuery(
    session: ConversationSession,
    query: string,
  ): Promise<ConversationResponse> {
    const childProfileId = session.childProfileId;

    // Find persons mentioned in the query for relationship context
    const mentionedPersons = this.findMentionedPersons(query, childProfileId);

    // Interpret the query using conversation history for context
    const intent = await this.nlpPipeline.interpretQuery(query, session.turns);

    // Search for relevant data based on the intent
    let events = this.dataStore.getEvents({
      childProfileId,
      eventTypes: intent.eventTypes.length > 0 ? intent.eventTypes : undefined,
      dateRange: intent.timeRange,
    });

    // If persons are mentioned in the query, filter events to those involving the mentioned persons
    if (mentionedPersons.length > 0) {
      const personIds = mentionedPersons.map((p) => `id:${p.id}`);
      const personFilteredEvents = events.filter((e) =>
        e.persons.some((ref) => personIds.includes(ref)),
      );
      // If we found person-specific events, use those; otherwise keep all events
      if (personFilteredEvents.length > 0) {
        events = personFilteredEvents;
      }
    }

    const contextEntries = this.dataStore.getContextEntries({
      childProfileId,
      dateRange: intent.timeRange,
    });

    const insights = this.dataStore.getInsights(childProfileId, {
      dateRange: intent.timeRange,
    });

    const documents = this.dataStore.getArchivedDocuments(childProfileId);

    const relevantData: RelevantData = {
      events,
      contextEntries,
      insights,
      documents,
    };

    // Include relationship context in relevant data if persons are mentioned
    if (mentionedPersons.length > 0) {
      const personContext = mentionedPersons.map((p) =>
        `${p.name} (${p.roleLabel}, ${p.category})${p.notes ? ` — ${p.notes}` : ''}`,
      ).join('; ');
      // Attach person context as additional metadata for the NLP pipeline
      (relevantData as RelevantData & { personContext?: string }).personContext = personContext;
    }

    // Check for insufficient data
    if (events.length === 0 && contextEntries.length === 0 && insights.length === 0) {
      const followUpSuggestions = [
        'Try logging some events first so I can help you find patterns.',
        'You can use quick-tap buttons or voice logging to capture daily observations.',
      ];

      return {
        narrative: 'There isn\'t enough data yet to answer that question. Try logging more events — even a few days of consistent logging can reveal helpful patterns.',
        supportingDataRefs: [],
        followUpSuggestions,
      };
    }

    // Generate conversational response
    const rawNarrative = await this.nlpPipeline.generateConversationalResponse(intent, relevantData);
    const narrative = this.toneFilter.reframe(rawNarrative);

    // Build data references
    const supportingDataRefs: DataReference[] = [];

    // Add event references (limit to most relevant)
    for (const event of events.slice(0, 5)) {
      supportingDataRefs.push({
        type: 'event',
        id: event.id,
        summary: `${event.eventType} on ${event.timestamp.toLocaleDateString()}${event.severity ? ` (severity: ${event.severity})` : ''}`,
      });
    }

    // Add insight references
    for (const insight of insights.slice(0, 3)) {
      supportingDataRefs.push({
        type: 'insight',
        id: insight.id,
        summary: `${insight.type} insight: ${insight.narrative.substring(0, 80)}...`,
      });
    }

    // Add context entry references
    for (const ctx of contextEntries.slice(0, 3)) {
      supportingDataRefs.push({
        type: 'context_entry',
        id: ctx.id,
        summary: `${ctx.contextType}/${ctx.subType}`,
      });
    }

    // Add document references
    for (const doc of documents.slice(0, 2)) {
      supportingDataRefs.push({
        type: 'document',
        id: doc.id,
        summary: `${doc.documentType}${doc.sourceProvider ? ` from ${doc.sourceProvider}` : ''}`,
      });
    }

    // Generate follow-up suggestions based on the data
    const followUpSuggestions = this.generateFollowUpSuggestions(intent, events, contextEntries);

    return {
      narrative,
      supportingDataRefs,
      followUpSuggestions: followUpSuggestions.length > 0 ? followUpSuggestions : undefined,
    };
  }

  // --- Private helpers ---

  /**
   * Resolve a person reference string to a display name and category.
   * If the reference starts with "id:", looks up the RelationshipPerson from DataStore.
   * Returns null for raw name strings (unresolved).
   */
  private resolvePersonReference(ref: string): { display: string; category?: RelationshipCategory } | null {
    if (ref.startsWith('id:')) {
      const personId = ref.slice(3);
      const person = this.dataStore.getRelationshipPerson(personId);
      if (person) {
        return { display: `${person.name} (${person.roleLabel})`, category: person.category };
      }
    }
    return null;
  }

  /**
   * Find RelationshipPersons mentioned by name in a query string.
   * Performs case-insensitive matching of person names against the query text.
   */
  private findMentionedPersons(query: string, childProfileId: string): RelationshipPerson[] {
    const persons = this.dataStore.getRelationshipPersons(childProfileId);
    if (persons.length === 0) return [];

    const queryLower = query.toLowerCase();
    return persons.filter((person) => queryLower.includes(person.name.toLowerCase()));
  }

  /**
   * Analyze correlations between context/well-being events and behavioral events.
   * Simple MVP approach: count co-occurrences of event types with context entries on the same day.
   */
  private analyzeCorrelations(events: Event[], contextEntries: ContextEntry[]): Correlation[] {
    const correlations: Correlation[] = [];

    const behavioralTypes = new Set(['meltdown', 'shutdown', 'conflict', 'school_incident']);
    const wellBeingTypes = new Set(['sleep', 'mood', 'diet', 'screen_time', 'physical_wellness', 'medication']);

    const behavioralEvents = events.filter((e) => behavioralTypes.has(e.eventType));
    const wellBeingEvents = events.filter((e) => wellBeingTypes.has(e.eventType));

    if (behavioralEvents.length === 0) {
      return correlations;
    }

    // Count co-occurrences of well-being events with behavioral events on the same day
    for (const wbType of wellBeingTypes) {
      const wbEvents = wellBeingEvents.filter((e) => e.eventType === wbType);
      if (wbEvents.length === 0) continue;

      const coOccurrences = countSameDayCoOccurrences(wbEvents, behavioralEvents);
      if (coOccurrences > 0) {
        const strength = coOccurrences >= 4 ? 'strong' : coOccurrences >= 2 ? 'moderate' : 'weak';
        correlations.push({
          factor1: wbType,
          factor2: 'behavioral events',
          strength,
          description: `${wbType} events co-occurred with behavioral events on ${coOccurrences} day(s)`,
        });
      }
    }

    // Count co-occurrences of context entries with behavioral events
    for (const ctx of contextEntries) {
      const contextKey = `${ctx.contextType}/${ctx.subType}`;
      const coOccurrences = countContextBehavioralOverlap(ctx, behavioralEvents);
      if (coOccurrences > 0) {
        const strength = coOccurrences >= 3 ? 'strong' : coOccurrences >= 2 ? 'moderate' : 'weak';
        correlations.push({
          factor1: contextKey,
          factor2: 'behavioral events',
          strength,
          description: `${contextKey} overlapped with ${coOccurrences} behavioral event(s)`,
        });
      }
    }

    // Analyze person-related correlations using resolved relationship context
    const personEventCounts = new Map<string, { display: string; category?: RelationshipCategory; count: number }>();
    for (const event of behavioralEvents) {
      for (const personRef of event.persons) {
        const resolved = this.resolvePersonReference(personRef);
        if (resolved) {
          const existing = personEventCounts.get(personRef);
          if (existing) {
            existing.count++;
          } else {
            personEventCounts.set(personRef, { display: resolved.display, category: resolved.category, count: 1 });
          }
        }
      }
    }

    for (const [, info] of personEventCounts) {
      if (info.count >= 2) {
        const strength = info.count >= 4 ? 'strong' : info.count >= 2 ? 'moderate' : 'weak';
        correlations.push({
          factor1: info.display,
          factor2: 'behavioral events',
          strength,
          description: `${info.display} was present during ${info.count} behavioral event(s)`,
        });
      }
    }

    return correlations;
  }

  /**
   * Detect simple patterns in the event data.
   */
  private detectPatterns(events: Event[]): Pattern[] {
    const patterns: Pattern[] = [];

    // Count events by type
    const typeCounts = new Map<string, number>();
    for (const event of events) {
      typeCounts.set(event.eventType, (typeCounts.get(event.eventType) ?? 0) + 1);
    }

    for (const [eventType, count] of typeCounts.entries()) {
      if (count >= 2) {
        patterns.push({
          type: eventType,
          description: `${eventType} occurred ${count} times this week`,
          occurrences: count,
        });
      }
    }

    return patterns;
  }

  private buildSupportingSignals(correlations: Correlation[], patterns: Pattern[]): SupportingSignal[] {
    const signals: SupportingSignal[] = [];

    for (const correlation of correlations) {
      const contributingFactors = [correlation.factor1, correlation.factor2];

      // If the correlation factor references a resolved person with category info,
      // include the category as a contributing factor
      if (correlation.description.includes('was present during')) {
        // This is a person-based correlation — check if we can extract category context
        // The factor1 is in "Name (RoleLabel)" format for resolved persons
        const categoryMatch = correlation.factor1.match(/\(([^)]+)\)$/);
        if (categoryMatch) {
          contributingFactors.push(`role:${categoryMatch[1]}`);
        }
      }

      signals.push({
        description: correlation.description,
        observationCount: parseInt(correlation.description.match(/(\d+)/)?.[1] ?? '1', 10),
        contributingFactors,
      });
    }

    for (const pattern of patterns) {
      signals.push({
        description: pattern.description,
        observationCount: pattern.occurrences,
        contributingFactors: [pattern.type],
      });
    }

    // Ensure at least one signal
    if (signals.length === 0) {
      signals.push({
        description: 'Weekly data reviewed but no strong correlations identified',
        observationCount: 1,
        contributingFactors: ['insufficient_data'],
      });
    }

    return signals;
  }

  private calculateConfidence(correlations: Correlation[], eventCount: number): 'low' | 'medium' | 'high' {
    const strongCorrelations = correlations.filter((c) => c.strength === 'strong').length;
    if (strongCorrelations >= 2 && eventCount >= 10) return 'high';
    if (correlations.length >= 2 || eventCount >= 7) return 'medium';
    return 'low';
  }

  private buildExplainability(correlations: Correlation[], patterns: Pattern[], eventCount: number): string {
    if (correlations.length === 0 && patterns.length === 0) {
      return `This insight was generated from ${eventCount} events this week, but no consistent patterns were identified in the logged data.`;
    }

    const parts: string[] = [];
    parts.push(`This insight was generated from ${eventCount} events this week.`);

    if (correlations.length > 0) {
      const topCorrelation = correlations.sort((a, b) => {
        const order = { strong: 3, moderate: 2, weak: 1 };
        return order[b.strength] - order[a.strength];
      })[0];
      parts.push(`The strongest signal: ${topCorrelation.description}.`);
    }

    return parts.join(' ');
  }

  private generateFollowUpSuggestions(
    intent: { eventTypes: string[]; dimensions: string[] },
    events: Event[],
    contextEntries: ContextEntry[],
  ): string[] {
    const suggestions: string[] = [];

    if (events.length > 0 && contextEntries.length === 0) {
      suggestions.push('Would you like to know about any context entries that might be related?');
    }

    if (intent.eventTypes.length === 1) {
      suggestions.push(`Would you like to compare ${intent.eventTypes[0]} patterns with other event types?`);
    }

    if (events.length > 5) {
      suggestions.push('Would you like me to break this down by day of the week?');
    }

    return suggestions.slice(0, 3);
  }
}

// --- Utility functions ---

function toDayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * Count the number of days where both event sets have at least one event.
 */
function countSameDayCoOccurrences(eventsA: Event[], eventsB: Event[]): number {
  const daysA = new Set(eventsA.map((e) => toDayKey(e.timestamp)));
  const daysB = new Set(eventsB.map((e) => toDayKey(e.timestamp)));

  let count = 0;
  for (const day of daysA) {
    if (daysB.has(day)) {
      count++;
    }
  }
  return count;
}

/**
 * Count how many behavioral events fall within a context entry's active period.
 */
function countContextBehavioralOverlap(ctx: ContextEntry, behavioralEvents: Event[]): number {
  const ctxStart = ctx.startTime.getTime();
  const ctxEnd = ctx.endTime ? ctx.endTime.getTime() : Date.now();

  return behavioralEvents.filter((e) => {
    const t = e.timestamp.getTime();
    return t >= ctxStart && t <= ctxEnd;
  }).length;
}
