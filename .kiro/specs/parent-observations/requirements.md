# Requirements Document

## Introduction

Today, every voice or text log a Parent submits is treated as a Diary entry describing dated, quotidian events in the child's day. Parents also have broader, undated things worth recording: a developmental trend they've noticed, a candid struggle with parenting, context about a family member or friend, or a summary of a conversation with a professional (e.g. the child's psychologist). There is currently no place for this kind of reflective, non-day-specific content — it either gets forced awkwardly into a Diary entry or goes unrecorded.

This feature adds an Observation classification, alongside the existing Diary classification, applied to a logged entry (voice or text). Rather than having the AI split a single submission's content across two separate records — which risks silently misplacing or dropping part of what the Parent said — the entry remains a single, fully intact record, classified as a whole for how to treat and display it. The AI proposes this classification automatically based on the entry's content (so a Parent can simply speak or type naturally, mixing dated events and broader reflection, without an extra decision at save time), and the Parent can correct it with a single tap if the AI's read is wrong. Within an entry, the AI also non-destructively highlights sentences it judges to be observational in nature — the same underlying judgment used to propose the entry's overall classification — aiding both at-a-glance scanning and a new Insights calendar/list view that surfaces which days contain Observation content.

A Parent who wants a clean separation between quotidian/dated content and reflective content can simply log them as two separate submissions; this feature does not need to infer that separation automatically.

## Glossary

- **Entry**: A single Diary or Observation record created from one voice or text logging submission (existing `DiaryEntry` model, extended — not a new table). One Entry always corresponds to exactly one submission; a submission is never split into multiple Entries.
- **Entry_Classification**: How an Entry is tagged for display and surfacing purposes: Diary, Observation, or Both. Modeled as independent flags (not a single mutually-exclusive enum value), so that an Entry can be marked as containing both kinds of content without requiring a combinatorial "both" case to be special-cased everywhere, and so a future third classification would not require redefining existing values. Proposed automatically by the AI based on the Entry's content, and always correctable by the Parent after the fact.
- **Observation**: An Entry (or the Observation-flagged portion of an Entry's content) that is reflective, trend-based, or non-day-specific in nature — e.g. a noticed developmental change, a parenting struggle, family/relationship context, or a professional-conversation recap — as opposed to a record of specific dated events.
- **Highlighted Sentence**: A sentence within an Entry's text that the AI has identified as observational in nature, marked non-destructively (the underlying text is never altered, reordered, or removed). Highlighting operates at sentence granularity, not arbitrary phrase spans.
- **Verbatim Entry**: An Entry saved using the existing verbatim logging mode, where the stored content is the Parent's actual spoken/typed words, unmodified by AI summarization.
- **Summarized Entry**: An Entry saved using the existing AI-summarized logging mode, where the stored content is an AI-generated paraphrase of what the Parent said.
- **Observation Calendar**: A new view, following the existing Weather/Heat Map calendar pattern in the Insights tab, that shades or marks each calendar day containing at least one Observation-flagged Entry.
- **Observation List**: A reverse-chronological list of Entries flagged as Observation (or Both), each shown with an excerpt, surfaced in the Insights tab.

## Requirements

### Requirement 1: AI-Proposed Entry Classification with Parent Correction

**User Story:** As a Parent, I want to just speak or type naturally — mixing dated events and broader reflection in one go if I want to — and have the app figure out whether what I said was a Diary entry, an Observation, or both, so that I'm not forced to make an extra decision every time I log something, while still being able to fix it with one tap if the app guesses wrong.

#### Acceptance Criteria

1. WHEN a voice or text log submission is processed, THE application SHALL have the AI propose an Entry_Classification (Diary, Observation, or Both) for the resulting Entry, based on the content of that single submission, as part of the existing extraction pipeline — without requiring the Parent to make a classification choice before or during submission.
2. THE AI SHALL propose Observation (or Both) WHEN the submission's content includes reflective, trend-based, or non-day-specific material (e.g. a noticed developmental change, a parenting struggle, family/relationship context, or a professional-conversation recap), using the same sentence-level judgment used for Highlighted Sentences (Requirement 3).
3. THE AI SHALL propose Diary-only WHEN the submission's content consists only of dated/quotidian material, consistent with current behavior.
4. THE AI SHALL propose Both WHEN the submission's content includes a meaningful mix of dated/quotidian material and reflective/observational material.
5. THE application SHALL display the AI-proposed Entry_Classification to the Parent at the existing voice/text log review step (alongside the existing verbatim/AI-summarized choice), as a single-tap-correctable control rather than a required decision — the Parent MAY leave the proposed classification as-is with no interaction, or change it with one tap before saving.
6. THE application SHALL allow the Parent to change an Entry's Entry_Classification after it has been saved, without requiring the Entry to be re-recorded or re-submitted.
7. THE application SHALL NOT alter, split, excerpt, or discard any portion of an Entry's stored content based on its Entry_Classification, whether AI-proposed or Parent-corrected. The full text the Parent reviewed and saved SHALL remain intact as a single record regardless of which classification(s) are applied.
8. WHEN event extraction (per the existing voice/text log pipeline) runs against a submission, THE application SHALL run it unchanged regardless of the resulting Entry_Classification — Entry_Classification SHALL NOT suppress, alter, or be a prerequisite for event extraction. Any events extracted from the submission SHALL be reviewed and saved exactly as they are today, independent of the Entry's Entry_Classification.
9. IF the AI's classification proposal step fails or returns no usable result (e.g. a backend/parsing error), THEN THE application SHALL default the proposed Entry_Classification to Diary, consistent with current behavior, rather than blocking the save or leaving the Entry unclassified.

### Requirement 2: Display of Diary vs. Observation Entries

**User Story:** As a Parent, I want Observation entries to look visually distinct from Diary entries wherever they appear, so that I can tell at a glance which kind of content I'm looking at.

#### Acceptance Criteria

1. WHEREVER an Entry is rendered as a card (the Today tab, the Insights tab's Diary view, and any other existing Diary entry display site), THE application SHALL render an Entry flagged as Diary-only using the existing yellow treatment, unchanged from current behavior.
2. WHEREVER an Entry is rendered as a card, THE application SHALL render an Entry flagged as Observation (including Both) using a visually distinct green treatment.
3. WHEN an Entry is flagged as Both, THE application SHALL render it with a treatment that visually communicates both classifications (e.g. a dual-color accent or a badge in addition to the base color), rather than defaulting silently to only one color.
4. THE existing Insights "Diary" view SHALL continue to display every Entry regardless of Entry_Classification, consistent with Requirement 1.7's intact-content guarantee — an Entry flagged as Observation (or Both) SHALL still appear in the full Diary history, not be removed from it.

### Requirement 3: Non-Destructive Observation Highlighting

**User Story:** As a Parent, I want the AI to point out which sentences in a longer entry are the observational ones, so that I can scan a mixed entry quickly without losing the full original record.

#### Acceptance Criteria

1. FOR an Entry whose content includes one or more sentences the AI judges to be observational in nature, THE application SHALL mark those sentences as Highlighted Sentences at sentence-level granularity (not arbitrary sub-sentence spans).
2. THE application SHALL verify, after any highlighting pass, that the Entry's text with highlighting markers stripped out is byte-for-byte identical to the original saved content.
3. IF the verification in Criterion 2 fails for an Entry, THEN THE application SHALL discard the highlighting for that Entry and render it with no sentence-level highlighting, rather than displaying content that may have been altered.
4. Highlighting SHALL use the same sentence-level judgment that produces the AI-proposed Entry_Classification (Requirement 1.2-1.4) — a Diary-flagged Entry containing a Highlighted Sentence is the expected signal that led the AI to propose Observation or Both for that Entry, not an independent, unrelated judgment. IF the Parent corrects the Entry_Classification to Diary-only despite one or more Highlighted Sentences being present, THEN THE application SHALL preserve the Highlighted Sentences as-is (per Requirement 3.5) rather than removing them, since highlighting is a content annotation, not a classification record.
5. Highlighting SHALL have no effect on what is stored for the Entry — it is a display-time annotation only, and SHALL NOT change the Entry's underlying content, Entry_Classification, or any extracted events.

### Requirement 4: Observation Calendar and List Views

**User Story:** As a Parent, I want to see which days have an Observation logged and browse them as a group, so that I can revisit broader notes (like a therapy session recap) without scrolling through daily diary content.

#### Acceptance Criteria

1. THE application SHALL add an Observation Calendar to the existing Insights tab view selector, following the existing month-grid navigation and layout pattern used by the Weather and Heat Map views.
2. THE Observation Calendar SHALL visually mark any calendar day containing at least one Entry flagged as Observation or Both.
3. WHEN the Parent taps a marked day on the Observation Calendar, THE application SHALL display the Observation-flagged Entry (or Entries) for that day.
4. THE application SHALL provide an Observation List showing every Observation-flagged (including Both) Entry in reverse-chronological order, with an excerpt and date, as part of the Insights tab.
5. FOR an Entry with at least one Highlighted Sentence, THE excerpt shown in the Observation List and Observation Calendar day-detail SHALL be drawn from its Highlighted Sentence(s).
6. FOR an Entry with no Highlighted Sentence available (including the fallback case in Requirement 3.3), THE excerpt SHALL fall back to the beginning of the Entry's content, so the Entry still appears in the Observation List and Observation Calendar rather than being omitted.
7. THE excerpt display SHALL visually distinguish whether its source Entry is a Verbatim Entry or a Summarized Entry (e.g. quotation styling only for Verbatim Entry excerpts), so the Parent does not mistake a paraphrase for their own words.

### Requirement 5: Data Model

**User Story:** As a developer, I want Observation support added to the existing Diary entry data model rather than a new parallel system, so that existing Diary functionality (creation, display, editing, backup/restore) continues to work unchanged and the feature stays easy to maintain.

#### Acceptance Criteria

1. THE application SHALL extend the existing Diary entry model and storage (SQLite and Supabase, per the existing dual-database-service pattern) with Entry_Classification data, rather than introducing a separate table or model for Observation entries.
2. Entry_Classification SHALL be modeled as independent flags (e.g. an `isDiary` and `isObservation` boolean pair, or equivalent), not as a single closed enum value, so that future additional classifications do not require redefining existing stored values.
3. Highlighted Sentence data SHALL be stored in a form that allows the verification in Requirement 3.2 to be re-run at any time (e.g. sentence offsets/ranges into the existing content field), rather than storing pre-extracted excerpt text as the source of truth.
4. FOR ALL valid Entry records (Diary, Observation, or Both, with or without Highlighted Sentence data), serializing to JSON then deserializing back SHALL produce an equivalent object (round-trip property), consistent with the project's existing data model conventions.
5. Existing Diary entries created before this feature ships SHALL be treated as Diary-only (not Observation) by default, requiring no backfill or migration of existing rows beyond adding the new columns/fields.

### Requirement 6: Non-Goals

The following are explicitly out of scope for this spec:

1. Requiring the Parent to make a classification decision before the AI has had a chance to propose one. The Parent's role is correction, not mandatory upfront selection — see Requirement 1.5.
2. Splitting a single voice/text submission's content across multiple Entries or multiple records of any kind. One submission always produces at most one Diary/Observation Entry (plus whatever events are extracted per existing behavior), never two — this holds regardless of how the AI classifies the Entry's content.
3. Attribution of which Parent/user created an Entry. Per the current authentication model, no table in this app records who logged a given piece of data, and this feature does not change that. Speaker/parent attribution is deferred to ride along with the `supabase-rls-hardening` spec's Supabase Auth migration, which is better positioned to add this consistently across the data model rather than as a one-off for this feature.
4. Any structured, repeatable parent mental-state or self-regulation tracking (e.g. a mood scale or overwhelm check-in). Observation entries are free-text and narrative; a future structured parent-state tracking feature is expected to use a different, purpose-built data model (potentially reviving the existing but currently unused `ContextEntry`/`parent_state` concept, or a new one) rather than extending the Diary/Observation model this spec defines. This spec's data model choices (Requirement 5) are made with that likely future feature in mind, but do not implement it.
5. A new top-level navigation tab. Observation entries are captured through the existing voice/text logging flow and surfaced within the existing Insights tab, not a new tab.
6. Any AI-driven "nudge" or suggestion prompting the Parent to reclassify a Diary entry based on highlighting (e.g. "this looks like an Observation, want to tag it?"). This is a reasonable future enhancement enabled by Requirement 3's highlighting but is not required by this spec.
