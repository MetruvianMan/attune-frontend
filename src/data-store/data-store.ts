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
  MoodColor,
  RelationshipPerson,
} from '@src/models/index.js';

export type ChildProfileInput = Omit<ChildProfile, 'id' | 'createdAt' | 'updatedAt'>;

export interface InsightFilter {
  types?: Array<'weekly' | 'positive_pattern' | 'longitudinal_trend' | 'document_synthesis'>;
  dateRange?: { start: Date; end: Date };
}

export interface DataStore {
  // Child Profiles
  createChildProfile(profile: ChildProfileInput): ChildProfile;
  getChildProfile(id: string): ChildProfile | null;
  updateChildProfile(id: string, updates: Partial<ChildProfileInput>): ChildProfile;
  deleteChildProfile(id: string): void;
  listChildProfiles(): ChildProfile[];

  // Events
  saveEvent(event: Event): void;
  getEvent(id: string): Event | null;
  getEvents(filter: EventFilter): Event[];
  deleteEvent(id: string): void;

  // Context Entries
  saveContextEntry(entry: ContextEntry): void;
  getContextEntries(filter: ContextFilter): ContextEntry[];
  endContextEntry(id: string, endTime: Date): void;

  // Insights
  saveInsight(insight: Insight): void;
  getInsights(childProfileId: string, filter?: InsightFilter): Insight[];

  // Strategies
  saveStrategy(strategy: Strategy): void;
  getStrategies(insightId: string): Strategy[];
  updateStrategyFeedback(strategyId: string, feedback: StrategyFeedbackUpdate): void;
  getStrategyFeedbackHistory(childProfileId: string): StrategyFeedback[];

  // Documents
  saveArchivedDocument(doc: ArchivedDocument): void;
  getArchivedDocuments(childProfileId: string, filter?: DocumentFilter): ArchivedDocument[];
  deleteArchivedDocument(id: string): void;

  // Conversations
  saveConversationSession(session: ConversationSession): void;
  getConversationSession(id: string): ConversationSession | null;
  getConversationSessions(childProfileId: string): ConversationSession[];
  deleteConversationSession(id: string): void;
  getRecentConversationTurns(childProfileId: string, limit: number): ConversationTurn[];

  // Glossary
  getGlossaryTerms(category?: string): GlossaryTerm[];
  getGlossaryTerm(term: string): GlossaryTerm | null;

  // Quick Tap Config
  getQuickTapButtons(childProfileId: string): QuickTapButton[];
  saveQuickTapButtons(childProfileId: string, buttons: QuickTapButton[]): void;

  // Day Mood
  getDayMood(childProfileId: string, dateKey: string): DayMood | null;
  saveDayMood(mood: DayMood): void;

  // Relationship Persons
  saveRelationshipPerson(person: RelationshipPerson): void;
  getRelationshipPerson(id: string): RelationshipPerson | null;
  getRelationshipPersons(childProfileId: string): RelationshipPerson[];
  deleteRelationshipPerson(id: string): void;

  // Serialization
  serializeEvent(event: Event): string;
  deserializeEvent(json: string): Event;
  serializeInsight(insight: Insight): string;
  deserializeInsight(json: string): Insight;
  serializeStrategy(strategy: Strategy): string;
  deserializeStrategy(json: string): Strategy;
  serializeArchivedDocumentMeta(doc: ArchivedDocument): string;
  deserializeArchivedDocumentMeta(json: string): ArchivedDocument;
  serializeRelationshipPerson(person: RelationshipPerson): string;
  deserializeRelationshipPerson(json: string): RelationshipPerson;
}
