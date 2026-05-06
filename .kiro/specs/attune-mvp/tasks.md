# Implementation Plan: Attune MVP

## Overview

Build the Attune MVP as a local-first, localhost TypeScript application using Vite, Vitest, and fast-check. Implementation proceeds bottom-up: project scaffolding → data models → data store → core engines → NLP/LLM layer → UI views → final integration. Each subsystem is independently testable with property-based and unit tests validating correctness properties from the design document.

## Tasks

- [x] 1. Project scaffolding and configuration
  - [x] 1.1 Initialize project with package.json, tsconfig.json, vite.config.ts, vitest.config.ts
    - Create `package.json` with TypeScript, Vite, Vitest, fast-check as devDependencies (matching running-app versions)
    - Create `tsconfig.json` targeting ES2022 with strict mode, bundler module resolution
    - Create `vite.config.ts` with path aliases (`@src`, `@tests`)
    - Create `vitest.config.ts` with globals enabled, test include pattern `tests/**/*.test.ts`
    - Create `.gitignore` for node_modules, dist, .env
    - Create `index.html` entry point
    - _Requirements: Project setup prerequisite for all requirements_

  - [x] 1.2 Create directory structure and barrel exports
    - Create `src/models/`, `src/data-store/`, `src/event-capture/`, `src/context-engine/`, `src/insight-engine/`, `src/strategy-recommender/`, `src/document-archive/`, `src/nlp-pipeline/`, `src/privacy-manager/`, `src/tone-compliance/`, `src/conversation/`, `src/glossary/`, `src/llm/`, `src/ui/`
    - Create `tests/unit/`, `tests/property/`, `tests/generators/`
    - _Requirements: Project setup prerequisite for all requirements_

- [x] 2. Data models and type definitions
  - [x] 2.1 Define all core TypeScript interfaces and types
    - Create `src/models/child-profile.ts` — ChildProfile, IntakeProfile interfaces
    - Create `src/models/event.ts` — Event, EventType, EventInput, EventFilter, WellBeingEventType, BehavioralEventType
    - Create `src/models/context-entry.ts` — ContextEntry, ContextEntryInput, ContextType, ContextFilter
    - Create `src/models/insight.ts` — Insight, SupportingSignal, CommunicationScript, DataReference
    - Create `src/models/strategy.ts` — Strategy, StrategyFeedback, StrategyFeedbackUpdate
    - Create `src/models/document.ts` — ArchivedDocument, DocumentMetadata, DocumentType, DocumentFilter
    - Create `src/models/person.ts` — Person
    - Create `src/models/glossary.ts` — GlossaryTerm, GlossaryCategory
    - Create `src/models/conversation.ts` — ConversationSession, ConversationTurn
    - Create `src/models/quick-tap.ts` — QuickTapButton, QuickTapEventType
    - Create `src/models/index.ts` barrel export
    - _Requirements: 1.1, 1.3, 1.4, 2.3, 3.1, 4.1, 5.1, 8.4, 10.1, 11.1, 12.1, 13.1, 16.7, 17.3, 18.1, 20.1_

- [x] 3. Test generators for property-based testing
  - [x] 3.1 Create fast-check generators for all data models
    - Create `tests/generators/child-profile.gen.ts` — arbitrary ChildProfile, IntakeProfile with all optional field combinations
    - Create `tests/generators/event.gen.ts` — arbitrary Event with all source types, optional fields
    - Create `tests/generators/context-entry.gen.ts` — arbitrary ContextEntry with all context types
    - Create `tests/generators/insight.gen.ts` — arbitrary Insight with all type variants, optional communicationScripts/timeSpan
    - Create `tests/generators/strategy.gen.ts` — arbitrary Strategy with optional sourceDocumentRef, various effectiveness scores
    - Create `tests/generators/archived-document.gen.ts` — arbitrary ArchivedDocument with optional fields
    - Create `tests/generators/conversation.gen.ts` — arbitrary ConversationSession, ConversationTurn
    - Create `tests/generators/glossary.gen.ts` — arbitrary GlossaryTerm across all categories
    - _Requirements: Testing infrastructure for Properties 1–36_

- [x] 4. Data store interface and JSON file implementation
  - [x] 4.1 Define the DataStore interface
    - Create `src/data-store/data-store.ts` with the full DataStore interface as specified in the design (child profiles, events, context entries, insights, strategies, documents, conversations, glossary, quick-tap config, serialization methods)
    - _Requirements: 1.3, 12.1, 12.2, 13.1, 13.2, 20.1, 20.2_

  - [x] 4.2 Implement in-memory DataStore with JSON serialization
    - Create `src/data-store/in-memory-data-store.ts` implementing DataStore interface
    - Implement all CRUD operations for child profiles, events, context entries, insights, strategies, documents, conversations, glossary, quick-tap buttons
    - Implement serialization/deserialization methods for Event, Insight, Strategy, ArchivedDocument with Date handling (ISO string round-trip)
    - Implement malformed JSON resilience — skip invalid records, log warnings, continue loading
    - Implement cascading delete for child profiles (remove all associated data)
    - _Requirements: 1.3, 1.8, 12.1, 12.2, 12.3, 12.4, 13.1, 13.2, 13.3, 13.4, 13.5, 14.3, 14.4, 20.1, 20.2, 20.3, 20.4_

  - [ ]* 4.3 Write property tests for child profile persistence (Properties 1, 2, 4, 5)
    - **Property 1: Child Profile persistence round-trip** — create profile, retrieve by ID, verify all fields intact with unique non-empty ID
    - **Validates: Requirements 1.1, 1.3, 1.5, 1.6**
    - **Property 2: Child Profile update persistence** — update any field, verify new value persisted, unchanged fields preserved
    - **Validates: Requirements 1.7**
    - **Property 4: Cascading profile deletion** — delete profile with associated data, verify zero retrievable records for that profile ID
    - **Validates: Requirements 1.8, 14.4**
    - **Property 5: Profile data isolation** — events under one profile never returned when querying another profile
    - **Validates: Requirements 1.9**

  - [ ]* 4.4 Write property tests for serialization round-trips (Properties 22, 23, 24, 25, 26)
    - **Property 22: Event serialization round-trip** — serialize/deserialize any valid Event, verify equivalence
    - **Validates: Requirements 12.1, 12.2, 12.3**
    - **Property 23: Insight serialization round-trip** — serialize/deserialize any valid Insight, verify equivalence
    - **Validates: Requirements 13.1, 13.3**
    - **Property 24: Strategy serialization round-trip** — serialize/deserialize any valid Strategy, verify equivalence
    - **Validates: Requirements 13.2, 13.4**
    - **Property 25: Archived_Document metadata serialization round-trip** — serialize/deserialize any valid ArchivedDocument, verify equivalence
    - **Validates: Requirements 20.1, 20.2, 20.3**
    - **Property 26: Malformed JSON resilience** — batch deserialize mix of valid/malformed records, verify valid records returned, malformed skipped
    - **Validates: Requirements 12.4, 13.5, 20.4**

- [x] 5. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Event capture system
  - [x] 6.1 Implement EventCaptureSystem
    - Create `src/event-capture/event-capture-system.ts` implementing EventCaptureSystem interface
    - Implement createEvent with auto-ID generation, timestamp defaulting, contextEntryRef linking
    - Implement saveEvent, getEvents (with filtering), deleteEvent
    - Require only eventType for saving; all other fields optional
    - _Requirements: 2.4, 3.2, 3.4, 4.2, 4.4_

  - [x] 6.2 Implement QuickTapLogger
    - Create `src/event-capture/quick-tap-logger.ts` implementing QuickTapLogger interface
    - Implement getButtons, logQuickTap (creates Event with quick-tap source and current timestamp), customizeButtons
    - Default button set: meltdown, shutdown, conflict, school_incident, great_day, good_sleep, poor_sleep, medication_given
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 6.3 Implement VoiceLogger stub
    - Create `src/event-capture/voice-logger.ts` implementing VoiceLogger interface
    - Implement startRecording/stopRecording with timestamp capture at recording start
    - Stub audio capture and transcription (delegate to NLP_Pipeline interface)
    - Attach original transcript as Event notes field
    - _Requirements: 2.1, 2.2, 2.5, 2.7_

  - [ ]* 6.4 Write property tests for event capture (Properties 6, 7, 8, 9, 10)
    - **Property 6: Voice event timestamp assignment** — voice events get timestamp at recording start, transcript attached
    - **Validates: Requirements 2.5, 2.7**
    - **Property 7: Quick-tap event creation** — quick-tap creates Event with correct type, timestamp within 1s, source='quick-tap'
    - **Validates: Requirements 3.2, 3.4**
    - **Property 8: Quick-tap button customization persistence** — save/retrieve button config, verify same set and order
    - **Validates: Requirements 3.5**
    - **Property 9: Manual event minimum fields** — event with only eventType saves; event without eventType rejected
    - **Validates: Requirements 4.2**
    - **Property 10: Tag suggestion relevance** — suggested tags are subset of previously used tags for that profile
    - **Validates: Requirements 4.3**

  - [ ]* 6.5 Write unit tests for event capture
    - Test voice event creation flow with mock transcription
    - Test quick-tap event creation for each button type
    - Test manual event with all optional fields populated and with minimal fields
    - Test tag suggestion with empty history and with existing tags
    - _Requirements: 2.1–2.7, 3.1–3.5, 4.1–4.4_

- [x] 7. Context engine
  - [x] 7.1 Implement ContextEngine
    - Create `src/context-engine/context-engine.ts` implementing ContextEngine interface
    - Implement createContextEntry with auto-ID, default start time to now
    - Implement getActiveContextEntries (no end time or end time in future)
    - Implement endContextEntry (set end time to now)
    - Implement getContextEntries with filtering
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 7.2 Write property test for context entry lifecycle (Property 11)
    - **Property 11: Context entry lifecycle** — entry with no end time appears in active query; after ending, absent from active but in full history
    - **Validates: Requirements 5.2, 5.3, 5.4, 5.5**

  - [ ]* 7.3 Write unit tests for context engine
    - Test creating context entries for each context type (routine_disruption, relationship_interaction, parent_state)
    - Test active entries filtering with mix of active and ended entries
    - Test ending an active entry
    - _Requirements: 5.1–5.5_

- [x] 8. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Privacy manager and tone compliance filter
  - [x] 9.1 Implement PrivacyManager
    - Create `src/privacy-manager/privacy-manager.ts` implementing PrivacyManager interface
    - Implement applyAlias — replace all occurrences of display name with alias (handle empty alias fallback)
    - Implement stripPII — replace all Person names with role labels, unknown persons get "Person" label
    - Implement exportWithPrivacy combining alias and PII stripping based on options
    - _Requirements: 1.2, 14.1, 14.2_

  - [x] 9.2 Implement ToneComplianceFilter
    - Create `src/tone-compliance/tone-compliance-filter.ts` implementing ToneComplianceFilter interface
    - Define clinical blocklist: "deficit", "disorder symptoms", "non-compliant", "bad behavior", "acting out", etc.
    - Implement validate — scan text for blocklist terms, return violations with positions and suggestions
    - Implement reframe — replace blocklist terms with neuro-affirming alternatives
    - _Requirements: 15.1, 15.2, 15.3, 15.4_

  - [ ]* 9.3 Write property tests for privacy and tone (Properties 3, 27, 28)
    - **Property 3: Alias replacement in exported content** — all occurrences of display name replaced with alias, zero original name occurrences
    - **Validates: Requirements 1.2, 14.1**
    - **Property 27: PII stripping completeness** — zero occurrences of any Person name in output, each replaced by role label
    - **Validates: Requirements 14.2**
    - **Property 28: Tone compliance filter — clinical term exclusion** — output contains zero occurrences of clinical blocklist terms
    - **Validates: Requirements 15.2, 15.3, 10.3, 17.7**

  - [ ]* 9.4 Write unit tests for privacy manager and tone compliance
    - Test alias replacement with multiple occurrences, case sensitivity, empty alias fallback
    - Test PII stripping with multiple persons, unknown persons
    - Test tone filter with known clinical terms, clean text, mixed content
    - _Requirements: 1.2, 14.1, 14.2, 15.1–15.4_

- [x] 10. Neurodiversity glossary
  - [x] 10.1 Implement glossary data and lookup
    - Create `src/glossary/glossary-data.ts` with seed data for all required terms (neurodiversity, neurodivergent, neurotypical, autism, ADHD, sensory processing, stimming, masking, executive function, dysregulation, meltdown, shutdown, accommodation, IEP) using neuro-affirming definitions
    - Create `src/glossary/glossary-service.ts` implementing term lookup, category filtering, and term-linking in text
    - Organize terms by category: general_concepts, autism_related, adhd_related, school_and_services, sensory
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5_

  - [ ]* 10.2 Write property tests for glossary (Properties 33, 34)
    - **Property 33: Glossary category filtering** — all returned terms belong to specified category, no term of that category excluded
    - **Validates: Requirements 18.5**
    - **Property 34: Glossary term linking in text** — all occurrences of glossary terms in text are identified and marked
    - **Validates: Requirements 18.4**

- [x] 11. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. LLM orchestration layer
  - [x] 12.1 Implement LLM provider interface and mock provider
    - Create `src/llm/llm-provider.ts` with LLMProvider interface and LLMOptions type
    - Create `src/llm/mock-llm-provider.ts` implementing LLMProvider with deterministic responses for testing
    - Create `src/llm/openai-provider.ts` stub implementing LLMProvider for OpenAI API (with exponential backoff, max 3 retries)
    - _Requirements: LLM orchestration prerequisite for 8.1, 10.1, 16.3, 17.5_

- [x] 13. NLP pipeline
  - [x] 13.1 Implement NLPPipeline
    - Create `src/nlp-pipeline/nlp-pipeline.ts` implementing NLPPipeline interface
    - Implement transcribeAudio — delegate to speech-to-text API (stub for MVP)
    - Implement extractEventData — use LLM to extract event type, tone, tags, persons from transcript
    - Implement generateInsightNarrative — use LLM to produce neuro-affirming narrative from correlations and patterns
    - Implement generateStrategies — use LLM to produce actionable strategies from context
    - Implement interpretQuery — use LLM to parse natural language query into QueryIntent
    - Implement generateConversationalResponse — use LLM to produce narrative answer from intent and data
    - Implement extractDocumentText — stub text extraction for PDF/Word/Excel (return null for unsupported)
    - _Requirements: 2.2, 2.3, 8.3, 10.1, 16.2, 16.3, 17.2_

- [x] 14. Conversation session manager
  - [x] 14.1 Implement ConversationSessionManager
    - Create `src/conversation/conversation-session-manager.ts` implementing ConversationSessionManager interface
    - Implement startSession, getActiveSession, addTurn, clearSession, getRecentQueries
    - Persist sessions through DataStore
    - _Requirements: 16.6, 16.7, 16.8, 16.9_

  - [ ]* 14.2 Write property tests for conversation (Properties 29, 30)
    - **Property 29: Conversation session lifecycle** — N turns added, all N returned in order; new session has zero turns; recent queries respects limit
    - **Validates: Requirements 16.6, 16.7, 16.9**
    - **Property 30: Conversation response structure** — every conversational response contains non-empty narrative
    - **Validates: Requirements 16.4**

- [x] 15. Insight engine
  - [x] 15.1 Implement weekly insight generation
    - Create `src/insight-engine/insight-engine.ts` implementing InsightEngine interface
    - Implement generateWeeklyInsight — analyze correlations between sleep/routine/parent-state/relationships and behavioral events over 7 days
    - Enforce threshold: skip if fewer than 3 events in current week or less than 7 days of data
    - Produce narrative with supporting signals, confidence score, explainability statement
    - Pass all narratives through ToneComplianceFilter before returning
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9_

  - [x] 15.2 Implement positive pattern detection
    - Create `src/insight-engine/positive-pattern-detector.ts`
    - Identify "good days" (positive_behavior events, no meltdown/shutdown/conflict)
    - Detect shared conditions across 3+ good days in 14-day window
    - Generate positive pattern Insight with supporting signals listing conditions and day count
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [x] 15.3 Implement longitudinal trend detection
    - Create `src/insight-engine/longitudinal-trend-detector.ts`
    - Enforce threshold: require 30+ days of data
    - Analyze recurring patterns by day of week, time of month, season
    - Generate longitudinal Insight with type='longitudinal_trend', non-null timeSpan
    - Include communication scripts for sensitive recurring topics
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5_

  - [x] 15.4 Implement document synthesis
    - Create `src/insight-engine/document-synthesizer.ts`
    - Synthesize across multiple archived documents to identify themes, gaps, discrepancies
    - Generate document_synthesis Insight with neuro-affirming reframing of clinical language
    - _Requirements: 17.5, 17.6, 17.7_

  - [x] 15.5 Implement conversational query answering
    - Add answerQuery method to InsightEngine
    - Search events, context entries, documents, and insights for relevant data based on QueryIntent
    - Generate narrative response with supporting data references
    - Handle insufficient data with logging suggestions
    - Resolve follow-up references using conversation history
    - _Requirements: 16.2, 16.3, 16.4, 16.5, 16.7, 16.8_

  - [ ]* 15.6 Write property tests for insight engine (Properties 17, 18, 19, 35, 36)
    - **Property 17: Weekly insight generation threshold** — fewer than 3 events in 7 days → no insight; 3+ events with 7+ days history → insight generated
    - **Validates: Requirements 8.1, 8.6**
    - **Property 18: Insight structure completeness** — every insight has non-empty narrative, at least one SupportingSignal with observationCount > 0, valid confidenceScore, non-empty explainabilityStatement
    - **Validates: Requirements 8.3, 8.4, 8.5**
    - **Property 19: Positive pattern detection threshold** — 3+ good days in 14-day window with shared condition → positive pattern insight; fewer than 3 → no insight
    - **Validates: Requirements 9.1, 9.2**
    - **Property 35: Longitudinal insight threshold and structure** — fewer than 30 days → no longitudinal insight; 30+ days → type='longitudinal_trend' with non-null timeSpan
    - **Validates: Requirements 19.1, 19.3, 19.5**
    - **Property 36: Communication scripts in longitudinal insights** — longitudinal insight about sensitive topic includes at least one CommunicationScript with non-empty topic, script, context
    - **Validates: Requirements 19.4**

- [x] 16. Strategy recommender with feedback loop
  - [x] 16.1 Implement StrategyRecommender
    - Create `src/strategy-recommender/strategy-recommender.ts` implementing StrategyRecommender interface
    - Implement generateStrategies — produce 2–3 strategies per insight, incorporating intake profile, document references, and feedback history
    - Prioritize strategies similar to "helped" feedback, avoid "didn't help" patterns
    - Implement recordFeedback and changeFeedback with correct arithmetic (increment/decrement helpedCount and didntHelpCount)
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 11.1, 11.2, 11.3, 11.4, 11.5_

  - [ ]* 16.2 Write property tests for strategy (Properties 20, 21)
    - **Property 20: Strategy count per insight** — every generated insight has 2–3 linked strategies
    - **Validates: Requirements 10.1**
    - **Property 21: Strategy feedback correctness** — "helped" increments helpedCount only; "didnt_help" increments didntHelpCount only; changing feedback adjusts both counts correctly
    - **Validates: Requirements 11.2, 11.3, 11.4**

- [x] 17. Document archive
  - [x] 17.1 Implement DocumentArchive
    - Create `src/document-archive/document-archive.ts` implementing DocumentArchive interface
    - Implement uploadDocument — store file, extract text via NLP_Pipeline, handle extraction failures (set extractionFailed=true)
    - Implement getDocuments with filtering by document type and sorting by date
    - Implement deleteDocument — remove file and metadata from storage
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.8, 17.9_

  - [ ]* 17.2 Write property tests for document archive (Properties 31, 32)
    - **Property 31: Document archive filtering and sorting** — filter by type returns only matching documents; sort by date returns correct order
    - **Validates: Requirements 17.4**
    - **Property 32: Document deletion removes all data** — deleted document unretrievable by ID and absent from list queries
    - **Validates: Requirements 17.8**

- [x] 18. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 19. Today View UI
  - [x] 19.1 Implement Today View
    - Create `src/ui/today-view.ts`
    - Display current day's events grouped by event type with counts
    - Display quick-tap buttons for rapid logging
    - Display most recent insight or strategy suggestion with link to details
    - Display active context entries as contextual indicators
    - Show prompt when no events logged for the day
    - Provide voice logger activation button
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [ ]* 19.2 Write property test for today view grouping (Property 12)
    - **Property 12: Today summary event grouping** — sum of all group counts equals total events; each group's event type matches all events in that group
    - **Validates: Requirements 6.1**

- [x] 20. Timeline View UI
  - [x] 20.1 Implement Timeline View
    - Create `src/ui/timeline-view.ts`
    - Display events in reverse chronological order with type, timestamp, severity, tags, truncated notes
    - Implement filtering by event type, tags, person, date range
    - Implement event detail view with full notes, all tags, persons, and linked active context entries
    - Display context entries as background indicators spanning their active range
    - Implement pagination loading events in batches of 20
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [ ]* 20.2 Write property tests for timeline (Properties 13, 14, 15, 16)
    - **Property 13: Timeline reverse chronological ordering** — events returned in strictly non-increasing timestamp order
    - **Validates: Requirements 7.1**
    - **Property 14: Timeline filtering correctness** — every returned event matches all filter criteria; no matching event excluded
    - **Validates: Requirements 7.3**
    - **Property 15: Event detail includes active context** — event detail includes exactly the context entries active at event timestamp
    - **Validates: Requirements 7.4**
    - **Property 16: Pagination batch size** — each batch has at most 20 events; sequential batches cover all events without gaps or duplicates
    - **Validates: Requirements 7.6**

- [x] 21. Conversation View UI
  - [x] 21.1 Implement Conversation View
    - Create `src/ui/conversation-view.ts`
    - Provide text input for natural language queries
    - Display conversation turns (parent queries and assistant responses)
    - Display 3 most recent queries for quick reference
    - Support starting a new session (clearing context)
    - Wire to InsightEngine.answerQuery and ConversationSessionManager
    - _Requirements: 16.1, 16.6, 16.9_

- [x] 22. Profile management and document archive UI
  - [x] 22.1 Implement Profile Management UI
    - Create `src/ui/profile-management-view.ts`
    - Create/edit/delete child profiles with guided onboarding flow for IntakeProfile
    - Profile switching for multi-child support
    - Deletion confirmation dialog
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 1.7, 1.8, 1.9, 14.4, 14.5_

  - [x] 22.2 Implement Document Archive UI
    - Create `src/ui/document-archive-view.ts`
    - File upload for PDF, Word, Excel with metadata assignment (document type, source provider, document date)
    - Browsable document list with sorting and filtering
    - Document deletion
    - Display extraction failure warnings
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.8, 17.9_

  - [x] 22.3 Implement Glossary View
    - Create `src/ui/glossary-view.ts`
    - Display glossary terms organized by category
    - Accessible from main navigation
    - _Requirements: 18.1, 18.2, 18.3, 18.5_

- [x] 23. App shell and navigation wiring
  - [x] 23.1 Wire all views into the application shell
    - Create `src/ui/app-shell.ts` with main navigation (Today, Timeline, Conversation, Documents, Glossary, Profile)
    - Create `src/app.ts` entry point — initialize DataStore, wire all subsystems, mount UI
    - Wire profile switching to filter all views to active child profile
    - Wire glossary term linking into insight narratives and strategy descriptions (inline tooltips)
    - Ensure all generated text passes through ToneComplianceFilter before display
    - _Requirements: 1.9, 15.1, 18.3, 18.4_

  - [ ]* 23.2 Write integration tests
    - Test end-to-end flow: create profile → log events → generate insight → get strategies → provide feedback
    - Test voice event flow: record → transcribe → extract → confirm → save
    - Test conversation flow: query → response → follow-up with context
    - Test document flow: upload → extract text → synthesis insight
    - _Requirements: All requirements integration validation_

- [x] 24. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate the 36 correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The LLM provider uses a mock implementation for testing; real provider integration is wired but stubbed
- All NLP operations (transcription, extraction, generation) are behind interfaces for easy swapping
