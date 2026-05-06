import type {
  ChildProfile,
  Event,
  EventFilter,
  ContextEntry,
  ContextFilter,
  Insight,
  Strategy,
  StrategyFeedback,
  StrategyFeedbackUpdate,
  ArchivedDocument,
  DocumentFilter,
  ConversationSession,
  ConversationTurn,
  GlossaryTerm,
  QuickTapButton,
  DayMood,
} from '@src/models/index.js';

import type { ChildProfileInput, DataStore, InsightFilter } from './data-store.js';

export class InMemoryDataStore implements DataStore {
  private childProfiles = new Map<string, ChildProfile>();
  private events = new Map<string, Event>();
  private contextEntries = new Map<string, ContextEntry>();
  private insights = new Map<string, Insight>();
  private strategies = new Map<string, Strategy>();
  private strategyFeedbackHistory: StrategyFeedback[] = [];
  private archivedDocuments = new Map<string, ArchivedDocument>();
  private conversationSessions = new Map<string, ConversationSession>();
  private glossaryTerms: GlossaryTerm[] = [];
  private quickTapButtons = new Map<string, QuickTapButton[]>();
  private dayMoods = new Map<string, DayMood>();

  // ── Child Profiles ──

  createChildProfile(input: ChildProfileInput): ChildProfile {
    const now = new Date();
    const profile: ChildProfile = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    this.childProfiles.set(profile.id, profile);
    return profile;
  }

  getChildProfile(id: string): ChildProfile | null {
    return this.childProfiles.get(id) ?? null;
  }

  updateChildProfile(id: string, updates: Partial<ChildProfileInput>): ChildProfile {
    const existing = this.childProfiles.get(id);
    if (!existing) {
      throw new Error(`Child profile not found: ${id}`);
    }
    const updated: ChildProfile = {
      ...existing,
      ...updates,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    };
    this.childProfiles.set(id, updated);
    return updated;
  }

  deleteChildProfile(id: string): void {
    this.childProfiles.delete(id);

    // Cascade delete all associated data
    for (const [eventId, event] of this.events) {
      if (event.childProfileId === id) {
        this.events.delete(eventId);
      }
    }
    for (const [entryId, entry] of this.contextEntries) {
      if (entry.childProfileId === id) {
        this.contextEntries.delete(entryId);
      }
    }
    for (const [insightId, insight] of this.insights) {
      if (insight.childProfileId === id) {
        this.insights.delete(insightId);
      }
    }
    for (const [strategyId, strategy] of this.strategies) {
      if (strategy.childProfileId === id) {
        this.strategies.delete(strategyId);
      }
    }
    this.strategyFeedbackHistory = this.strategyFeedbackHistory.filter((fb) => {
      const strategy = this.strategies.get(fb.strategyId);
      // Keep feedback only if the strategy still exists (i.e. belongs to another profile)
      return strategy !== undefined;
    });
    for (const [docId, doc] of this.archivedDocuments) {
      if (doc.childProfileId === id) {
        this.archivedDocuments.delete(docId);
      }
    }
    for (const [sessionId, session] of this.conversationSessions) {
      if (session.childProfileId === id) {
        this.conversationSessions.delete(sessionId);
      }
    }
    this.quickTapButtons.delete(id);
    for (const [moodId, mood] of this.dayMoods) {
      if (mood.childProfileId === id) {
        this.dayMoods.delete(moodId);
      }
    }
  }

  listChildProfiles(): ChildProfile[] {
    return Array.from(this.childProfiles.values());
  }

  // ── Events ──

  saveEvent(event: Event): void {
    this.events.set(event.id, event);
  }

  getEvent(id: string): Event | null {
    return this.events.get(id) ?? null;
  }

  getEvents(filter: EventFilter): Event[] {
    let results = Array.from(this.events.values()).filter(
      (e) => e.childProfileId === filter.childProfileId,
    );

    if (filter.eventTypes && filter.eventTypes.length > 0) {
      results = results.filter((e) => filter.eventTypes!.includes(e.eventType));
    }

    if (filter.tags && filter.tags.length > 0) {
      results = results.filter((e) => filter.tags!.some((tag) => e.tags.includes(tag)));
    }

    if (filter.persons && filter.persons.length > 0) {
      results = results.filter((e) =>
        filter.persons!.some((person) => e.persons.includes(person)),
      );
    }

    if (filter.dateRange) {
      const { start, end } = filter.dateRange;
      results = results.filter((e) => e.timestamp >= start && e.timestamp <= end);
    }

    // Sort: reverse chronological by default, but within the same day
    // respect sequenceOrder if set (lower = earlier in the day)
    results.sort((a, b) => {
      const dayA = a.timestamp.toDateString();
      const dayB = b.timestamp.toDateString();
      if (dayA === dayB) {
        // Same day: sort by sequenceOrder (ascending), then by timestamp
        const seqA = a.sequenceOrder ?? Number.MAX_SAFE_INTEGER;
        const seqB = b.sequenceOrder ?? Number.MAX_SAFE_INTEGER;
        if (seqA !== seqB) return seqA - seqB;
        return a.timestamp.getTime() - b.timestamp.getTime();
      }
      // Different days: reverse chronological
      return b.timestamp.getTime() - a.timestamp.getTime();
    });

    // Pagination
    const offset = filter.offset ?? 0;
    if (filter.limit !== undefined) {
      results = results.slice(offset, offset + filter.limit);
    } else if (offset > 0) {
      results = results.slice(offset);
    }

    return results;
  }

  deleteEvent(id: string): void {
    this.events.delete(id);
  }

  // ── Context Entries ──

  saveContextEntry(entry: ContextEntry): void {
    this.contextEntries.set(entry.id, entry);
  }

  getContextEntries(filter: ContextFilter): ContextEntry[] {
    let results = Array.from(this.contextEntries.values()).filter(
      (e) => e.childProfileId === filter.childProfileId,
    );

    if (filter.contextTypes && filter.contextTypes.length > 0) {
      results = results.filter((e) => filter.contextTypes!.includes(e.contextType));
    }

    if (filter.dateRange) {
      const { start, end } = filter.dateRange;
      results = results.filter((e) => e.startTime <= end && (!e.endTime || e.endTime >= start));
    }

    if (filter.activeOnly) {
      const now = new Date();
      results = results.filter((e) => !e.endTime || e.endTime > now);
    }

    return results;
  }

  endContextEntry(id: string, endTime: Date): void {
    const entry = this.contextEntries.get(id);
    if (entry) {
      this.contextEntries.set(id, { ...entry, endTime });
    }
  }

  // ── Insights ──

  saveInsight(insight: Insight): void {
    this.insights.set(insight.id, insight);
  }

  getInsights(childProfileId: string, filter?: InsightFilter): Insight[] {
    let results = Array.from(this.insights.values()).filter(
      (i) => i.childProfileId === childProfileId,
    );

    if (filter?.types && filter.types.length > 0) {
      results = results.filter((i) => filter.types!.includes(i.type));
    }

    if (filter?.dateRange) {
      const { start, end } = filter.dateRange;
      results = results.filter((i) => i.createdAt >= start && i.createdAt <= end);
    }

    return results;
  }

  // ── Strategies ──

  saveStrategy(strategy: Strategy): void {
    this.strategies.set(strategy.id, strategy);
  }

  getStrategies(insightId: string): Strategy[] {
    return Array.from(this.strategies.values()).filter((s) => s.insightId === insightId);
  }

  updateStrategyFeedback(strategyId: string, feedback: StrategyFeedbackUpdate): void {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      throw new Error(`Strategy not found: ${strategyId}`);
    }

    const updatedEffectiveness = { ...strategy.effectiveness };
    if (feedback.feedback === 'helped') {
      updatedEffectiveness.helpedCount += 1;
    } else {
      updatedEffectiveness.didntHelpCount += 1;
    }

    this.strategies.set(strategyId, {
      ...strategy,
      effectiveness: updatedEffectiveness,
    });

    this.strategyFeedbackHistory.push({
      strategyId,
      feedback: feedback.feedback,
      timestamp: new Date(),
    });
  }

  getStrategyFeedbackHistory(childProfileId: string): StrategyFeedback[] {
    const profileStrategyIds = new Set(
      Array.from(this.strategies.values())
        .filter((s) => s.childProfileId === childProfileId)
        .map((s) => s.id),
    );

    return this.strategyFeedbackHistory.filter((fb) => profileStrategyIds.has(fb.strategyId));
  }

  // ── Documents ──

  saveArchivedDocument(doc: ArchivedDocument): void {
    this.archivedDocuments.set(doc.id, doc);
  }

  getArchivedDocuments(childProfileId: string, filter?: DocumentFilter): ArchivedDocument[] {
    let results = Array.from(this.archivedDocuments.values()).filter(
      (d) => d.childProfileId === childProfileId,
    );

    if (filter?.documentType) {
      results = results.filter((d) => d.documentType === filter.documentType);
    }

    const sortBy = filter?.sortBy ?? 'upload_date';
    const sortOrder = filter?.sortOrder ?? 'desc';
    const multiplier = sortOrder === 'asc' ? 1 : -1;

    results.sort((a, b) => {
      if (sortBy === 'date') {
        const aTime = a.documentDate?.getTime() ?? 0;
        const bTime = b.documentDate?.getTime() ?? 0;
        return (aTime - bTime) * multiplier;
      }
      return (a.uploadedAt.getTime() - b.uploadedAt.getTime()) * multiplier;
    });

    return results;
  }

  deleteArchivedDocument(id: string): void {
    this.archivedDocuments.delete(id);
  }

  // ── Conversations ──

  saveConversationSession(session: ConversationSession): void {
    this.conversationSessions.set(session.id, session);
  }

  getConversationSession(id: string): ConversationSession | null {
    return this.conversationSessions.get(id) ?? null;
  }

  getConversationSessions(childProfileId: string): ConversationSession[] {
    return Array.from(this.conversationSessions.values()).filter(
      (s) => s.childProfileId === childProfileId,
    );
  }

  deleteConversationSession(id: string): void {
    this.conversationSessions.delete(id);
  }

  getRecentConversationTurns(childProfileId: string, limit: number): ConversationTurn[] {
    const sessions = Array.from(this.conversationSessions.values()).filter(
      (s) => s.childProfileId === childProfileId,
    );

    const allTurns: ConversationTurn[] = sessions.flatMap((s) => s.turns);

    // Sort by timestamp descending (most recent first)
    allTurns.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return allTurns.slice(0, limit);
  }

  // ── Glossary ──

  getGlossaryTerms(category?: string): GlossaryTerm[] {
    if (category) {
      return this.glossaryTerms.filter((t) => t.category === category);
    }
    return [...this.glossaryTerms];
  }

  getGlossaryTerm(term: string): GlossaryTerm | null {
    const lowerTerm = term.toLowerCase();
    return this.glossaryTerms.find((t) => t.term.toLowerCase() === lowerTerm) ?? null;
  }

  // ── Quick Tap Config ──

  getQuickTapButtons(childProfileId: string): QuickTapButton[] {
    return this.quickTapButtons.get(childProfileId) ?? [];
  }

  saveQuickTapButtons(childProfileId: string, buttons: QuickTapButton[]): void {
    this.quickTapButtons.set(childProfileId, buttons);
  }

  // ── Day Mood ──

  getDayMood(childProfileId: string, dateKey: string): DayMood | null {
    return this.dayMoods.get(`${childProfileId}:${dateKey}`) ?? null;
  }

  saveDayMood(mood: DayMood): void {
    this.dayMoods.set(mood.id, mood);
  }

  // ── Serialization / Deserialization ──

  serializeEvent(event: Event): string {
    return JSON.stringify(event, (_key, value) => {
      if (value instanceof Date) {
        return value.toISOString();
      }
      return value;
    });
  }

  deserializeEvent(json: string): Event {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(json);
    } catch {
      throw new Error('Malformed JSON: failed to parse Event');
    }

    if (
      typeof parsed.id !== 'string' ||
      typeof parsed.childProfileId !== 'string' ||
      typeof parsed.eventType !== 'string' ||
      typeof parsed.timestamp !== 'string' ||
      typeof parsed.source !== 'string' ||
      !Array.isArray(parsed.tags) ||
      !Array.isArray(parsed.persons) ||
      !Array.isArray(parsed.contextEntryRefs) ||
      typeof parsed.createdAt !== 'string'
    ) {
      throw new Error('Malformed Event JSON: missing or invalid required fields');
    }

    return {
      ...parsed,
      timestamp: new Date(parsed.timestamp as string),
      createdAt: new Date(parsed.createdAt as string),
    } as Event;
  }

  serializeInsight(insight: Insight): string {
    return JSON.stringify(insight, (_key, value) => {
      if (value instanceof Date) {
        return value.toISOString();
      }
      return value;
    });
  }

  deserializeInsight(json: string): Insight {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(json);
    } catch {
      throw new Error('Malformed JSON: failed to parse Insight');
    }

    if (
      typeof parsed.id !== 'string' ||
      typeof parsed.childProfileId !== 'string' ||
      typeof parsed.type !== 'string' ||
      typeof parsed.narrative !== 'string' ||
      !Array.isArray(parsed.supportingSignals) ||
      typeof parsed.confidenceScore !== 'string' ||
      typeof parsed.explainabilityStatement !== 'string' ||
      !Array.isArray(parsed.strategyIds) ||
      typeof parsed.createdAt !== 'string'
    ) {
      throw new Error('Malformed Insight JSON: missing or invalid required fields');
    }

    const result: Record<string, unknown> = {
      ...parsed,
      createdAt: new Date(parsed.createdAt as string),
    };

    if (parsed.timeSpan && typeof parsed.timeSpan === 'object') {
      const ts = parsed.timeSpan as Record<string, unknown>;
      result.timeSpan = {
        start: new Date(ts.start as string),
        end: new Date(ts.end as string),
      };
    }

    return result as unknown as Insight;
  }

  serializeStrategy(strategy: Strategy): string {
    return JSON.stringify(strategy, (_key, value) => {
      if (value instanceof Date) {
        return value.toISOString();
      }
      return value;
    });
  }

  deserializeStrategy(json: string): Strategy {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(json);
    } catch {
      throw new Error('Malformed JSON: failed to parse Strategy');
    }

    if (
      typeof parsed.id !== 'string' ||
      typeof parsed.childProfileId !== 'string' ||
      typeof parsed.insightId !== 'string' ||
      typeof parsed.description !== 'string' ||
      typeof parsed.effectiveness !== 'object' ||
      parsed.effectiveness === null ||
      typeof parsed.createdAt !== 'string'
    ) {
      throw new Error('Malformed Strategy JSON: missing or invalid required fields');
    }

    return {
      ...parsed,
      createdAt: new Date(parsed.createdAt as string),
    } as Strategy;
  }

  serializeArchivedDocumentMeta(doc: ArchivedDocument): string {
    return JSON.stringify(doc, (_key, value) => {
      if (value instanceof Date) {
        return value.toISOString();
      }
      return value;
    });
  }

  deserializeArchivedDocumentMeta(json: string): ArchivedDocument {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(json);
    } catch {
      throw new Error('Malformed JSON: failed to parse ArchivedDocument');
    }

    if (
      typeof parsed.id !== 'string' ||
      typeof parsed.childProfileId !== 'string' ||
      typeof parsed.documentType !== 'string' ||
      typeof parsed.fileReference !== 'string' ||
      typeof parsed.extractionFailed !== 'boolean' ||
      typeof parsed.uploadedAt !== 'string'
    ) {
      throw new Error('Malformed ArchivedDocument JSON: missing or invalid required fields');
    }

    const result: Record<string, unknown> = {
      ...parsed,
      uploadedAt: new Date(parsed.uploadedAt as string),
    };

    if (typeof parsed.documentDate === 'string') {
      result.documentDate = new Date(parsed.documentDate as string);
    }

    return result as unknown as ArchivedDocument;
  }

  // ── Test helpers ──

  /** Seed glossary terms (useful for testing and initialization) */
  seedGlossaryTerms(terms: GlossaryTerm[]): void {
    this.glossaryTerms = [...terms];
  }

  // ── localStorage Persistence ──

  private static STORAGE_KEY = 'attune-app-data';

  /** Save all data to localStorage. */
  persistToLocalStorage(): void {
    const dateReplacer = (_key: string, value: unknown): unknown => {
      if (value instanceof Date) return value.toISOString();
      return value;
    };

    const data = {
      childProfiles: Array.from(this.childProfiles.entries()),
      events: Array.from(this.events.entries()),
      contextEntries: Array.from(this.contextEntries.entries()),
      insights: Array.from(this.insights.entries()),
      strategies: Array.from(this.strategies.entries()),
      strategyFeedbackHistory: this.strategyFeedbackHistory,
      archivedDocuments: Array.from(this.archivedDocuments.entries()),
      conversationSessions: Array.from(this.conversationSessions.entries()),
      quickTapButtons: Array.from(this.quickTapButtons.entries()),
      dayMoods: Array.from(this.dayMoods.entries()),
    };

    try {
      localStorage.setItem(InMemoryDataStore.STORAGE_KEY, JSON.stringify(data, dateReplacer));
    } catch {
      console.warn('Failed to persist data to localStorage');
    }
  }

  /** Load all data from localStorage. Returns true if data was loaded. */
  loadFromLocalStorage(): boolean {
    try {
      const raw = localStorage.getItem(InMemoryDataStore.STORAGE_KEY);
      if (!raw) return false;

      const data = JSON.parse(raw);

      // Helper to revive Date strings in an object
      const reviveDates = <T>(obj: T): T => {
        if (obj === null || obj === undefined) return obj;
        if (typeof obj === 'string') {
          // Check if it looks like an ISO date string
          if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(obj)) {
            return new Date(obj) as unknown as T;
          }
          return obj;
        }
        if (Array.isArray(obj)) {
          return obj.map(reviveDates) as unknown as T;
        }
        if (typeof obj === 'object') {
          const result: Record<string, unknown> = {};
          for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
            result[key] = reviveDates(value);
          }
          return result as T;
        }
        return obj;
      };

      if (data.childProfiles) {
        this.childProfiles = new Map(
          (data.childProfiles as [string, ChildProfile][]).map(([k, v]) => [k, reviveDates(v)]),
        );
      }
      if (data.events) {
        this.events = new Map(
          (data.events as [string, Event][]).map(([k, v]) => [k, reviveDates(v)]),
        );
      }
      if (data.contextEntries) {
        this.contextEntries = new Map(
          (data.contextEntries as [string, ContextEntry][]).map(([k, v]) => [k, reviveDates(v)]),
        );
      }
      if (data.insights) {
        this.insights = new Map(
          (data.insights as [string, Insight][]).map(([k, v]) => [k, reviveDates(v)]),
        );
      }
      if (data.strategies) {
        this.strategies = new Map(
          (data.strategies as [string, Strategy][]).map(([k, v]) => [k, reviveDates(v)]),
        );
      }
      if (data.strategyFeedbackHistory) {
        this.strategyFeedbackHistory = reviveDates(data.strategyFeedbackHistory);
      }
      if (data.archivedDocuments) {
        this.archivedDocuments = new Map(
          (data.archivedDocuments as [string, ArchivedDocument][]).map(([k, v]) => [k, reviveDates(v)]),
        );
      }
      if (data.conversationSessions) {
        this.conversationSessions = new Map(
          (data.conversationSessions as [string, ConversationSession][]).map(([k, v]) => [k, reviveDates(v)]),
        );
      }
      if (data.quickTapButtons) {
        this.quickTapButtons = new Map(data.quickTapButtons as [string, QuickTapButton[]][]);
      }
      if (data.dayMoods) {
        this.dayMoods = new Map(
          (data.dayMoods as [string, DayMood][]).map(([k, v]) => [k, reviveDates(v)]),
        );
      }

      return true;
    } catch {
      console.warn('Failed to load data from localStorage');
      return false;
    }
  }
}
