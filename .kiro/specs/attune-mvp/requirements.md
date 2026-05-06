# Requirements Document

## Introduction

Attune is a low-friction, insight-driven caregiving assistant for parents of neurodivergent children. The application helps parents understand patterns in behavior and well-being, identify triggers and early warning signals of dysregulation, and receive personalized neuro-affirming parenting strategies. The MVP (V1) focuses on voice-first and quick-tap event logging, basic event tracking across well-being and behavioral categories, a timeline view, weekly insight generation with pattern detection, strategy suggestions, a strategy feedback loop, a document archive for synthesizing provider records and reports, and a conversational natural language interface. The application serves as a single repository for the entire mental load — daily logs, documents, timeline, and insights — all in one place. The application starts as a localhost prototype with a modular backend designed for future migration to Expo mobile. All language and outputs use a neuro-affirming, supportive tone — no clinical or judgmental framing. Every insight includes explainability signals so parents understand why an insight was generated. Privacy controls ensure parents feel safe storing sensitive child data.

## Glossary

- **Parent**: The primary end user of the application who logs events, views insights, manages child profiles, and uploads documents.
- **Child_Profile**: A record representing a neurodivergent child, containing an identifier, display name or alias, age, optional diagnosis information, and intake data including traits, skills, struggles, sensory preferences, and communication style.
- **Event**: A timestamped record of a well-being signal or behavioral observation logged by the Parent for a specific Child_Profile.
- **Well_Being_Event**: An Event subtype capturing daily signals: mood, sleep duration and quality, diet tags, approximate screen time, physical wellness, and optional medication.
- **Behavioral_Event**: An Event subtype capturing behavioral observations: meltdowns, shutdowns, conflicts, school incidents, and notable positive behaviors.
- **Event_Capture_System**: The input layer responsible for receiving, transcribing, classifying, and storing Events from voice, quick-tap, and manual entry methods.
- **Voice_Logger**: The subsystem that accepts spoken input from the Parent, transcribes the audio to text, and extracts structured Event data including event type, emotional tone, and contextual tags.
- **Quick_Tap_Logger**: The subsystem that presents predefined event buttons (e.g., "Meltdown", "Great Day") for rapid one-tap logging with optional follow-up prompts.
- **Context_Engine**: The subsystem that captures environmental and relational variables influencing behavior, including routine disruptions, relationship interactions, and parent state.
- **Context_Entry**: A record representing an environmental or relational variable: routine disruptions (travel, illness, visitors, schedule changes, parent absence), relationship interactions (tagged by person and role), or parent state (mood, energy, burnout indicators).
- **Insight_Engine**: The core analytical subsystem that detects patterns across Events, Context_Entries, and Document_Archive contents, generates narrative insights with supporting signals, and produces strategy recommendations informed by the child's profile and uploaded documents.
- **Insight**: A generated analytical output containing a type (retrospective, positive pattern, or longitudinal trend), a narrative summary, supporting signals, and a confidence score.
- **Strategy**: A neuro-affirming, actionable recommendation linked to an Insight, containing a description and an effectiveness score updated by Parent feedback.
- **Feedback_Loop**: The mechanism by which the Parent marks a Strategy as "Helped" or "Didn't Help", enabling the Insight_Engine to learn child-specific effective strategies over time.
- **Timeline_View**: The primary visualization displaying a chronological event stream with filtering by event type, tags, and people.
- **Today_View**: The home screen displaying the current day's summary, quick log options, and the most recent Insight or Strategy suggestion.
- **NLP_Pipeline**: The natural language processing pipeline used for voice transcription, tag extraction, insight narrative generation, and conversational dialogue.
- **Person**: A named individual (sibling, friend, caregiver, provider) tagged in Events and Context_Entries to track relational patterns.
- **Severity_Scale**: A simple 1–5 numeric scale optionally attached to Events indicating intensity or impact.
- **Privacy_Manager**: The subsystem responsible for alias management, identity controls, and PII stripping when sharing data externally.
- **Document_Archive**: The subsystem responsible for storing, indexing, and synthesizing uploaded documents (PDFs, Word documents, Excel files) such as provider reports, evaluations, IEPs, and diagnostic records for a Child_Profile.
- **Archived_Document**: A record representing an uploaded file in the Document_Archive, containing the file, extracted text content, metadata (upload date, document type, source provider), and association with a Child_Profile.
- **Intake_Profile**: The structured data collected during the onboarding flow for a new Child_Profile, including biographical information, diagnosis (if known), traits, skills, struggles, sensory preferences, and communication style.
- **Neurodiversity_Glossary**: An in-app reference resource explaining neurodiversity categories, terminology, and concepts to help parents learn the landscape.
- **Conversation_Session**: A back-and-forth dialogue between the Parent and the application's natural language interface, maintaining context across multiple exchanges within a single session.

## Requirements

### Requirement 1: Child Profile Management and Onboarding

**User Story:** As a Parent, I want to create and manage profiles for my children with a guided onboarding flow, so that events and insights are organized per child and the system is personalized from day one.

#### Acceptance Criteria

1. THE application SHALL allow the Parent to create a Child_Profile with a display name, age, and optional diagnosis information.
2. THE application SHALL allow the Parent to assign an alias to a Child_Profile that replaces the child's real name in all shared or exported views.
3. WHEN the Parent creates a Child_Profile, THE application SHALL generate a unique identifier for the Child_Profile and persist the profile to local storage.
4. WHEN the Parent creates a new Child_Profile, THE application SHALL present a guided onboarding flow that collects an Intake_Profile including: biographical information (age, grade, household composition), diagnosis (if known or suspected), key traits and strengths, current struggles and challenges, sensory preferences (sensitivities and seeking behaviors), and communication style (verbal, limited verbal, AAC user, preferred interaction patterns).
5. THE application SHALL allow the Parent to skip any optional field in the onboarding flow and return to complete the Intake_Profile later.
6. WHEN the onboarding flow is completed, THE application SHALL persist the Intake_Profile data as part of the Child_Profile and make the Intake_Profile available to the Insight_Engine for personalized insight and strategy generation.
7. THE application SHALL allow the Parent to edit the display name, alias, age, diagnosis information, and all Intake_Profile fields of an existing Child_Profile.
8. THE application SHALL allow the Parent to delete a Child_Profile, removing all associated Events, Context_Entries, Insights, Strategies, Archived_Documents, and Conversation_Sessions from local storage.
9. WHEN the Parent has multiple Child_Profiles, THE application SHALL allow the Parent to switch between profiles, filtering all views and logging to the selected Child_Profile.

### Requirement 2: Voice-First Event Logging

**User Story:** As a Parent, I want to speak freely about what happened and have the system automatically create a structured event, so that I can log meaningful data in under 10 seconds without filling out forms.

#### Acceptance Criteria

1. WHEN the Parent activates the Voice_Logger, THE Event_Capture_System SHALL begin audio capture and display a recording indicator within 1 second.
2. WHEN the Parent finishes speaking, THE Voice_Logger SHALL transcribe the audio to text using the NLP_Pipeline.
3. WHEN transcription completes, THE Voice_Logger SHALL extract from the transcript: the event type (Well_Being_Event or Behavioral_Event category), emotional tone, contextual tags, and any mentioned Person names.
4. WHEN extraction completes, THE Event_Capture_System SHALL present the extracted Event data to the Parent for confirmation or editing before saving.
5. THE Voice_Logger SHALL auto-assign a timestamp to the Event at the moment recording begins.
6. IF the Voice_Logger cannot determine the event type from the transcript, THEN THE Event_Capture_System SHALL prompt the Parent to select an event type from the predefined categories.
7. THE Voice_Logger SHALL attach the original transcript text as the Event notes field.

### Requirement 3: Quick-Tap Event Logging

**User Story:** As a Parent, I want to log common events with a single tap, so that I can capture moments instantly when I do not have time to speak.

#### Acceptance Criteria

1. THE Today_View SHALL display a set of predefined Quick_Tap_Logger buttons for common event types: "Meltdown", "Shutdown", "Conflict", "School Incident", "Great Day", "Good Sleep", "Poor Sleep", "Medication Given".
2. WHEN the Parent taps a Quick_Tap_Logger button, THE Event_Capture_System SHALL create an Event with the corresponding event type and the current timestamp.
3. WHEN a Quick_Tap_Logger Event is created, THE Event_Capture_System SHALL display an optional follow-up prompt allowing the Parent to add a Severity_Scale rating, tags, notes, or related Person names.
4. THE Event_Capture_System SHALL save the Quick_Tap_Logger Event immediately upon tap, storing the event with or without follow-up data.
5. THE application SHALL allow the Parent to customize the set of Quick_Tap_Logger buttons displayed on the Today_View by adding, removing, or reordering predefined event types.

### Requirement 4: Manual Event Entry

**User Story:** As a Parent, I want to manually create an event with full detail when I have time, so that I can capture nuanced observations that voice or quick-tap may miss.

#### Acceptance Criteria

1. THE application SHALL provide a manual event entry form allowing the Parent to specify: event type (from predefined Well_Being_Event and Behavioral_Event categories), timestamp (defaulting to current time with option to backdate), Severity_Scale rating (optional), tags (free-text and AI-suggested), notes (free-text), and related Person names.
2. THE Event_Capture_System SHALL require only the event type field to save a manual Event; all other fields SHALL be optional.
3. WHEN the Parent begins entering tags, THE Event_Capture_System SHALL suggest relevant tags based on previously used tags for the active Child_Profile.
4. WHEN the Parent saves a manual Event, THE Event_Capture_System SHALL persist the Event to local storage and display a confirmation.

### Requirement 5: Context Entry Logging

**User Story:** As a Parent, I want to log environmental and relational context like routine disruptions and my own stress level, so that the system can factor these into pattern detection.

#### Acceptance Criteria

1. THE application SHALL allow the Parent to create a Context_Entry by selecting a context type: routine disruption (travel, illness, visitors, schedule change, parent absence), relationship interaction (tagged with a Person and role), or parent state (mood, energy level, burnout indicator).
2. THE application SHALL allow the Parent to specify a start time and optional end time for each Context_Entry, defaulting the start time to the current time.
3. WHEN the Parent logs a Context_Entry, THE Context_Engine SHALL persist the entry to local storage and associate the entry with the active Child_Profile.
4. THE Context_Engine SHALL display active Context_Entries (entries with no end time or an end time in the future) on the Today_View as contextual indicators.
5. THE application SHALL allow the Parent to end an active Context_Entry by setting its end time to the current time.

### Requirement 6: Today View Home Screen

**User Story:** As a Parent, I want a home screen that shows today's summary, quick log options, and the latest insight, so that I can see what matters and log quickly from one place.

#### Acceptance Criteria

1. THE Today_View SHALL display a summary of the current day's Events for the active Child_Profile, grouped by event type with counts.
2. THE Today_View SHALL display the Quick_Tap_Logger buttons for rapid event logging.
3. THE Today_View SHALL display the most recent Insight or Strategy suggestion for the active Child_Profile, including the Insight narrative and a link to view full details.
4. WHEN no Events have been logged for the current day, THE Today_View SHALL display a prompt encouraging the Parent to log the first event of the day.
5. THE Today_View SHALL display any active Context_Entries as contextual indicators (e.g., "Visitors today", "Schedule change active").
6. THE Today_View SHALL provide a button to activate the Voice_Logger for voice-first event logging.

### Requirement 7: Timeline View

**User Story:** As a Parent, I want to see a chronological stream of all logged events, so that I can review what happened and spot patterns visually.

#### Acceptance Criteria

1. THE Timeline_View SHALL display all Events for the active Child_Profile in reverse chronological order (most recent first).
2. THE Timeline_View SHALL display each Event with its type, timestamp, Severity_Scale rating (when present), tags, and a truncated notes preview.
3. THE Timeline_View SHALL allow the Parent to filter Events by event type, tags, related Person, and date range.
4. WHEN the Parent selects an Event in the Timeline_View, THE application SHALL display the full Event details including complete notes, all tags, related Persons, and any linked Context_Entries active at the time of the Event.
5. THE Timeline_View SHALL display Context_Entries as background indicators spanning their active time range alongside the Event stream.
6. THE Timeline_View SHALL support infinite scroll or pagination, loading Events in batches of 20.

### Requirement 8: Weekly Insight Generation

**User Story:** As a Parent, I want to receive a weekly summary of patterns and correlations in my child's data, so that I can understand what is driving behavior without analyzing raw data myself.

#### Acceptance Criteria

1. WHEN at least 7 days of Event data exist for the active Child_Profile, THE Insight_Engine SHALL generate a weekly Insight at the end of each 7-day period.
2. THE Insight_Engine SHALL analyze correlations between Event categories including: sleep quality and behavioral events, routine disruptions and behavioral events, parent state and child behavioral events, and relationship interactions and behavioral events.
3. THE Insight_Engine SHALL produce each Insight as a narrative summary in plain, neuro-affirming language (e.g., "Over the past week, meltdowns occurred more frequently on days following poor sleep and after school transitions").
4. THE Insight_Engine SHALL include supporting signals with each Insight: the number of correlated observations, the most common contributing factors, and the confidence score (low, medium, high).
5. THE Insight_Engine SHALL include an explainability statement with each Insight explaining why the Insight was generated (e.g., "This insight was generated because 4 of 5 meltdown days this week were preceded by sleep events rated below 3").
6. IF fewer than 3 Events exist for the current week, THEN THE Insight_Engine SHALL skip weekly Insight generation for that period and display a message encouraging more logging.
7. WHEN the Insight_Engine cannot identify a clear trigger or pattern for a behavioral event, THE Insight_Engine SHALL explicitly acknowledge the uncertainty rather than attributing a cause (e.g., "Meltdowns occurred on 3 days this week, but no consistent preceding pattern was identified in the logged data").
8. WHEN triggers for behavioral events are unknown or unarticulated, THE Insight_Engine SHALL suggest possible environmental factors worth tracking that were not yet logged (e.g., "Consider tracking school-day transitions or sensory environment changes to help identify patterns").
9. THE Insight_Engine SHALL avoid constructing false pattern narratives when correlations are weak or data is insufficient, stating the limitation honestly.

### Requirement 9: Positive Pattern Detection

**User Story:** As a Parent, I want the system to identify conditions associated with good days, so that I can intentionally recreate those conditions.

#### Acceptance Criteria

1. THE Insight_Engine SHALL identify "good day" patterns by analyzing days with notable positive behavior Events and the absence of meltdown, shutdown, or conflict Events.
2. WHEN a positive pattern is detected across 3 or more days within a 14-day window, THE Insight_Engine SHALL generate a positive pattern Insight (e.g., "Good days this period shared these conditions: consistent bedtime, no schedule changes, and outdoor play after school").
3. THE Insight_Engine SHALL include supporting signals listing the specific conditions and the number of days the pattern was observed.
4. THE Insight_Engine SHALL prioritize positive pattern Insights alongside retrospective Insights in the Today_View display rotation.

### Requirement 10: Strategy Recommendations

**User Story:** As a Parent, I want to receive 2–3 actionable, neuro-affirming strategies for each insight that are tailored to my child's specific profile and documents, so that I know what to try next.

#### Acceptance Criteria

1. WHEN the Insight_Engine generates an Insight, THE Insight_Engine SHALL produce 2 to 3 Strategy recommendations linked to the Insight.
2. THE Insight_Engine SHALL generate Strategies that are specific, actionable, and neuro-affirming (e.g., "Consider adding a 10–15 minute quiet transition buffer after school before any demands are placed").
3. THE Insight_Engine SHALL avoid clinical, judgmental, or prescriptive language in all Strategy descriptions.
4. THE Insight_Engine SHALL tailor Strategy recommendations based on the specific patterns identified in the linked Insight, referencing the contributing factors from the supporting signals.
5. WHEN previous Strategy feedback exists for the active Child_Profile, THE Insight_Engine SHALL prioritize generating Strategies similar to those previously marked as "Helped" and avoid generating Strategies similar to those marked as "Didn't Help".
6. WHEN an Intake_Profile exists for the active Child_Profile, THE Insight_Engine SHALL incorporate the child's sensory preferences, communication style, and known strengths into Strategy recommendations.
7. WHEN relevant Archived_Documents exist for the active Child_Profile, THE Insight_Engine SHALL reference applicable information from the Document_Archive (e.g., provider recommendations, IEP accommodations) when generating Strategy recommendations, citing the source document.

### Requirement 11: Strategy Feedback Loop

**User Story:** As a Parent, I want to mark strategies as helpful or not helpful, so that the system learns what works for my child over time.

#### Acceptance Criteria

1. THE application SHALL display a "Helped" button and a "Didn't Help" button alongside each Strategy recommendation.
2. WHEN the Parent taps "Helped", THE application SHALL update the Strategy's effectiveness score by incrementing the positive feedback count and persist the update to local storage.
3. WHEN the Parent taps "Didn't Help", THE application SHALL update the Strategy's effectiveness score by incrementing the negative feedback count and persist the update to local storage.
4. THE application SHALL allow the Parent to change feedback on a Strategy (from "Helped" to "Didn't Help" or vice versa) by tapping the alternative button, adjusting the effectiveness score accordingly.
5. THE Feedback_Loop SHALL make all accumulated Strategy feedback available to the Insight_Engine for use in future Strategy generation as specified in Requirement 10.

### Requirement 12: Event Data Serialization

**User Story:** As a developer, I want Events to be reliably serialized and deserialized to and from JSON, so that data persists correctly across application sessions.

#### Acceptance Criteria

1. THE application SHALL serialize each Event (including type, timestamp, severity, tags, notes, related persons, and inferred context references) to a JSON representation for local storage.
2. THE application SHALL deserialize JSON payloads back into valid Event objects with full fidelity.
3. FOR ALL valid Event objects, serializing to JSON then deserializing back SHALL produce an equivalent Event object (round-trip property).
4. IF the application encounters a malformed or missing Event JSON during deserialization, THEN THE application SHALL skip the malformed record, log a warning, and continue loading remaining records.

### Requirement 13: Insight Data Serialization

**User Story:** As a developer, I want Insights and Strategies to be reliably serialized and deserialized, so that generated insights and feedback persist across sessions.

#### Acceptance Criteria

1. THE application SHALL serialize each Insight (including type, narrative, supporting signals, confidence score, explainability statement, and linked Strategy references) to a JSON representation for local storage.
2. THE application SHALL serialize each Strategy (including description, linked Insight reference, and effectiveness score with positive and negative feedback counts) to a JSON representation for local storage.
3. FOR ALL valid Insight objects, serializing to JSON then deserializing back SHALL produce an equivalent Insight object (round-trip property).
4. FOR ALL valid Strategy objects, serializing to JSON then deserializing back SHALL produce an equivalent Strategy object (round-trip property).
5. IF the application encounters a malformed Insight or Strategy JSON during deserialization, THEN THE application SHALL skip the malformed record, log a warning, and continue loading remaining records.

### Requirement 14: Privacy and Identity Controls

**User Story:** As a Parent, I want to control how my child's identity appears and ensure sensitive data is protected, so that I feel safe using the application.

#### Acceptance Criteria

1. THE Privacy_Manager SHALL replace the child's display name with the configured alias in all exported or shared views when an alias is set on the Child_Profile.
2. THE Privacy_Manager SHALL strip all Person names and replace them with role labels (e.g., "Sibling", "Teacher") when the Parent activates the "Strip PII" option before sharing.
3. THE application SHALL store all data in local storage on the user's device; the application SHALL NOT transmit Child_Profile data, Event data, Archived_Document data, or Insight data to external servers without explicit Parent consent.
4. WHEN the Parent deletes a Child_Profile, THE application SHALL permanently remove all associated data from local storage within the same operation.
5. THE application SHALL require the Parent to confirm deletion with an explicit confirmation dialog before permanently removing a Child_Profile and its associated data.

### Requirement 15: Neuro-Affirming Tone Compliance

**User Story:** As a Parent, I want all application language to be supportive and respectful of neurodiversity, so that the app feels safe and non-judgmental.

#### Acceptance Criteria

1. THE application SHALL use supportive, context-aware language in all user-facing text including Insight narratives, Strategy descriptions, prompts, and labels.
2. THE application SHALL avoid clinical terminology (e.g., "deficit", "disorder symptoms", "non-compliant") in all generated Insight narratives and Strategy descriptions, using neuro-affirming alternatives instead.
3. THE application SHALL frame behavioral events in neutral or compassionate terms (e.g., "dysregulation episode" rather than "bad behavior", "sensory need" rather than "acting out").
4. THE Insight_Engine SHALL include language in Insight narratives that normalizes variability (e.g., "This is common and expected" or "Many children experience this pattern").

### Requirement 16: Conversational Natural Language Interface

**User Story:** As a Parent, I want to have a back-and-forth conversation with the app about my child's data, asking follow-up questions and exploring patterns interactively, so that I can understand my child's needs through natural dialogue rather than one-off queries.

#### Acceptance Criteria

1. THE application SHALL provide a text input field where the Parent can type natural language questions about the active Child_Profile's data.
2. WHEN the Parent submits a natural language query, THE NLP_Pipeline SHALL interpret the query intent and identify the relevant Event types, time ranges, and data dimensions referenced.
3. WHEN the query is interpreted, THE Insight_Engine SHALL search existing Events, Context_Entries, Archived_Documents, and Insights for relevant data and generate a narrative response.
4. THE Insight_Engine SHALL format the response as a narrative answer with supporting data references (e.g., "Meltdowns this month were most common on Mondays and days with schedule changes — observed in 6 of 8 meltdown events").
5. IF insufficient data exists to answer the query, THEN THE application SHALL respond with a message indicating what additional logging would help answer the question (e.g., "Not enough sleep data logged yet to analyze sleep and behavior patterns — try logging sleep for 5 more days").
6. THE application SHALL display the 3 most recent queries and responses for quick reference.
7. THE application SHALL maintain a Conversation_Session that preserves context across multiple exchanges, allowing the Parent to ask follow-up questions that reference prior answers within the same session (e.g., "What about last month?" or "Tell me more about the sleep connection").
8. WHEN the Parent asks a follow-up question within an active Conversation_Session, THE NLP_Pipeline SHALL resolve references to prior exchanges (e.g., pronouns, "that pattern", "those days") using the conversation history.
9. THE application SHALL allow the Parent to start a new Conversation_Session, clearing the prior conversation context.

### Requirement 17: Document Archive

**User Story:** As a Parent, I want to upload and store provider reports, evaluations, IEPs, and other documents in one place, so that the app serves as a single repository for my child's entire record and the system can synthesize insights across all sources.

#### Acceptance Criteria

1. THE Document_Archive SHALL allow the Parent to upload PDF, Word (.doc, .docx), and Excel (.xls, .xlsx) files and associate each file with the active Child_Profile.
2. WHEN the Parent uploads a document, THE Document_Archive SHALL extract the text content from the file and store both the original file and the extracted text.
3. THE Document_Archive SHALL allow the Parent to assign metadata to each Archived_Document: document type (evaluation, IEP, provider report, therapy notes, medical record, other), source provider name, and document date.
4. THE Document_Archive SHALL display all Archived_Documents for the active Child_Profile in a browsable list, sortable by date and filterable by document type.
5. WHEN multiple Archived_Documents exist for the active Child_Profile, THE Insight_Engine SHALL synthesize across documents to identify cohesive themes, gaps in provider recommendations, and discrepancies between different provider perspectives and diagnoses.
6. THE Insight_Engine SHALL generate a document synthesis Insight when discrepancies or complementary perspectives are detected across Archived_Documents (e.g., "The OT evaluation emphasizes sensory seeking behaviors while the school psychologist report focuses on attention — these may reflect the same underlying sensory processing pattern observed in different environments").
7. THE Insight_Engine SHALL apply the neuro-affirming philosophical lens when interpreting and synthesizing Archived_Document content, reframing clinical language from provider documents into supportive, strengths-aware language.
8. THE application SHALL allow the Parent to delete an Archived_Document from the Document_Archive, removing the file and extracted text from local storage.
9. IF the Document_Archive cannot extract text from an uploaded file, THEN THE Document_Archive SHALL store the original file, display a warning to the Parent, and exclude the file from text-based synthesis.

### Requirement 18: In-App Neurodiversity Glossary

**User Story:** As a Parent, I want an in-app glossary explaining neurodiversity categories and terminology, so that I can learn the landscape and understand the language used in my child's evaluations and the app's insights.

#### Acceptance Criteria

1. THE Neurodiversity_Glossary SHALL provide definitions for common neurodiversity terms including but not limited to: neurodiversity, neurodivergent, neurotypical, autism, ADHD, sensory processing, stimming, masking, executive function, dysregulation, meltdown, shutdown, accommodation, and IEP.
2. THE Neurodiversity_Glossary SHALL use neuro-affirming, plain-language definitions that avoid clinical or deficit-based framing.
3. THE application SHALL make the Neurodiversity_Glossary accessible from the main navigation at any time.
4. WHEN a term from the Neurodiversity_Glossary appears in an Insight narrative, Strategy description, or document synthesis, THE application SHALL provide an inline link or tooltip allowing the Parent to view the definition without leaving the current view.
5. THE Neurodiversity_Glossary SHALL organize terms by category (e.g., "General Concepts", "Autism-Related", "ADHD-Related", "School and Services", "Sensory") for browsable exploration.

### Requirement 19: Longitudinal Trend Insights

**User Story:** As a Parent, I want insights that go beyond weekly summaries to identify longer-term trends like recurring seasonal patterns, developmental milestones, and sensitive recurring topics, so that I can understand my child's trajectory over time.

#### Acceptance Criteria

1. WHEN at least 30 days of Event data exist for the active Child_Profile, THE Insight_Engine SHALL analyze longitudinal trends across the full data history, including recurring patterns by day of week, time of month, and season.
2. THE Insight_Engine SHALL detect and report on long-term trends including: bedwetting patterns, sleep regression cycles, developmental milestone progressions, recurring seasonal behavioral changes, and recurring sensitive topics.
3. THE Insight_Engine SHALL generate longitudinal trend Insights as narrative summaries with supporting data spanning the relevant time period (e.g., "Over the past 3 months, dysregulation episodes have decreased by 40% on weeks with consistent bedtime routines").
4. THE Insight_Engine SHALL include communication scripts within longitudinal trend Insights for sensitive recurring topics, providing neuro-affirming language the Parent can use when discussing the topic with the child (e.g., for bedwetting: "Here's a way to talk about cleanup that keeps things matter-of-fact and shame-free: 'Bodies do things at night sometimes. Let's get fresh sheets together.'").
5. THE Insight_Engine SHALL distinguish longitudinal trend Insights from weekly Insights in the Today_View and Timeline_View, labeling them with the time span covered.

### Requirement 20: Document Archive Data Serialization

**User Story:** As a developer, I want Archived_Documents and their metadata to be reliably serialized and deserialized, so that the document archive persists correctly across application sessions.

#### Acceptance Criteria

1. THE application SHALL serialize each Archived_Document metadata record (including document type, source provider, document date, file reference, and extracted text reference) to a JSON representation for local storage.
2. THE application SHALL deserialize JSON payloads back into valid Archived_Document metadata objects with full fidelity.
3. FOR ALL valid Archived_Document metadata objects, serializing to JSON then deserializing back SHALL produce an equivalent Archived_Document metadata object (round-trip property).
4. IF the application encounters a malformed Archived_Document JSON during deserialization, THEN THE application SHALL skip the malformed record, log a warning, and continue loading remaining records.

---

## P2 / Future Requirements

The following requirements are explicitly scoped as post-MVP (P2) and are documented here for planning purposes. They are NOT part of the MVP implementation.

### P2 Requirement: Child Communication Script Generation

**User Story:** As a Parent, I want the app to help me translate what I want to say to my child into language that works for the child's communication style, so that I can communicate more effectively during difficult moments.

#### Acceptance Criteria (P2 — Not MVP)

1. WHEN the Parent provides a message or intent they want to communicate to the child, THE application SHALL generate an alternative phrasing tailored to the child's communication style as recorded in the Intake_Profile.
2. THE application SHALL offer multiple script variations (e.g., direct/literal, visual/metaphor-based, social-story format) based on the child's documented communication preferences.
3. THE application SHALL frame all generated scripts using neuro-affirming language that respects the child's autonomy and processing style.
4. WHEN the child's communication style includes "limited verbal" or "AAC user", THE application SHALL suggest visual or simplified scripts appropriate for the child's communication modality.

### P2 Requirement: Export Profile Data to Excel/CSV

**User Story:** As a Parent, I want to export my child's event timeline and profile data to Excel or CSV format, so that I can share it with providers, therapists, or school staff, or analyze patterns in a spreadsheet.

#### Acceptance Criteria (P2 — Not MVP)

1. THE application SHALL provide an "Export" action accessible from the Timeline tab or Profile tab.
2. WHEN the Parent taps "Export", THE application SHALL generate a CSV file containing all events for the active Child_Profile, with columns for: date, time, event type, severity, notes, tags, and source.
3. THE application SHALL allow the Parent to filter the export by date range and/or event type before generating the file.
4. THE exported file SHALL use a human-readable filename format (e.g., `attune-robbie-timeline-2026-04.csv`).
5. THE application SHALL trigger a browser download (localhost) or share sheet (mobile) for the generated file.
6. THE application SHOULD optionally support Excel (.xlsx) format in addition to CSV.
