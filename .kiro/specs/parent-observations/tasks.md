# Implementation Plan: Parent Observations

## Overview

This plan implements the Parent Observations feature. Tasks build incrementally: backend deterministic sentence-splitting → backend LLM index-classification + derivation → backend response shape → mobile model/storage layer (SQLite + Supabase) → capture/review UI → display coloring + highlighting → new Insights Observation Calendar/List views. No test framework exists in this project (confirmed in the prior `family-location-tracking` spec and unchanged since), so each task's verification is `tsc --noEmit` (run separately for `backend/` and `mobile/`) plus the manual scenarios listed in design.md's Testing Strategy, run at the checkpoints below.

## Tasks

- [ ] 1. Backend: deterministic sentence splitter
  - [ ] 1.1 Create `backend/src/utils/sentence-splitter.ts`
    - Define `Sentence` interface: `{ index: number; text: string; start: number; end: number }`
    - Implement `splitIntoSentences(text: string): Sentence[]` using a regex-based split (e.g. on `/(?<=[.!?])\s+/`), computing character offsets into the original string for each sentence
    - Handle empty/whitespace-only input by returning `[]`
    - _Requirements: 3.1, 5.3_

- [ ] 2. Checkpoint - verify sentence splitter
  - Run `./node_modules/.bin/tsc --noEmit -p .` in `backend/`.
  - Manually verify `splitIntoSentences` against a few sample strings (empty string, one sentence, multiple sentences, trailing whitespace) - a throwaway script or REPL call is fine, no test framework needed.
  - Ask the user if questions arise before proceeding.

- [ ] 3. Backend: classification deriver
  - [ ] 3.1 Create `backend/src/services/classification-deriver.ts`
    - Define `SentenceSpan` interface: `{ start: number; end: number; isObservational: boolean }`
    - Implement `deriveClassification(transcriptSentences: SentenceSpan[] | undefined, summarySentences: SentenceSpan[] | undefined): { isDiary: boolean; isObservation: boolean }` per design.md's rules (no observational sentences → Diary-only; all observational → Observation-only; a mix → Both; no sentences at all → Diary-only)
    - Prefer `transcriptSentences` when both are available (it always exists; summary spans may be absent) - document this preference in a code comment
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.9_

- [ ] 4. Checkpoint - verify classification deriver
  - Run `./node_modules/.bin/tsc --noEmit -p .` in `backend/`.
  - Manually verify `deriveClassification` against the four cases above (none/all/mixed/empty observational sentences).
  - Ask the user if questions arise before proceeding.

- [ ] 5. Backend: extend extraction prompt and response shape
  - [ ] 5.1 Widen `ExtractedEvent`/`EventExtractionResult` types in `backend/src/services/openai-service.ts`
    - Add `SentenceSpan` import from the new classification-deriver module (or re-declare locally if preferred to avoid a circular import - follow whichever convention keeps this file's existing import style consistent)
    - Add `transcriptSentences?: SentenceSpan[]`, `summarySentences?: SentenceSpan[]`, and `proposedClassification: { isDiary: boolean; isObservation: boolean }` to `EventExtractionResult`
    - _Requirements: 1.1_

  - [ ] 5.2 Extend the `extractEvents()` prompt to request transcript sentence classification
    - Before building the prompt string, call `splitIntoSentences(transcript)` and number the resulting sentences in the prompt (e.g. "Sentence 0: ...", "Sentence 1: ...")
    - Add a prompt section asking the model to return `transcriptObservationalIndices: number[]` - which sentence indices read as reflective/trend-based/non-day-specific rather than a dated event - reusing the cue-phrase guidance already agreed on ("I've noticed", "in general", "lately", "over the past week/month", "overall"), with 2-3 concrete before/after examples following the same example-heavy style used for the TITLE SELECTION section added earlier in this file
    - Add `transcriptObservationalIndices` to the expected JSON response shape in the prompt's format section
    - _Requirements: 1.2, 1.3, 1.4_

  - [ ] 5.3 Validate and map the model's `transcriptObservationalIndices` response
    - After parsing the LLM's JSON response, validate each returned index is an integer within `[0, transcriptSentencesList.length)`; drop individually invalid indices rather than rejecting the whole response
    - Map valid indices to `SentenceSpan[]` using the offsets already computed by `splitIntoSentences` (no further LLM involvement) - `isObservational: true` for flagged indices, `false` for all other sentences in the list
    - If the response is entirely unusable (not an array, or zero valid indices in a case where indices were expected), set `transcriptSentences` to the full sentence list with every span's `isObservational: false` rather than omitting it entirely, so `deriveClassification` still has real sentence boundaries to reason about (an all-`false` list is a defined, safe state - the earlier design discussion's "if the whole response is unusable, omit it" phrasing is refined here as "omit it" meaning no index-level trust, not that the sentence list structure itself disappears; keep consistent with whichever reading makes `deriveClassification` never receive `undefined` when the transcript is non-empty)
    - _Requirements: 1.9, 3.2, 3.3_

  - [ ] 5.4 Add a second, smaller classification pass for `diaryEntry` summary text
    - After the main extraction call returns and only if `parsed.diaryEntry` is present and non-empty, call `splitIntoSentences(diaryEntry)` and make a second small LLM call (same prompt shape as 5.2, scoped to just this classification task - not a full re-extraction) asking which summary-sentence indices are observational
    - Apply the same validation/mapping as 5.3 to produce `summarySentences`
    - If this second call fails for any reason (network, parse error), log and continue with `summarySentences` left `undefined` - this must never block or fail the overall `extractEvents()` call, since the primary events/title/description/emoji extraction already succeeded by this point
    - _Requirements: 1.2, 1.3, 1.4, 1.9_

  - [ ] 5.5 Call `deriveClassification` and attach `proposedClassification` to the result
    - After computing `transcriptSentences`/`summarySentences` (5.3/5.4), call `deriveClassification(transcriptSentences, summarySentences)` and include the result as `proposedClassification` on the object returned from `extractEvents()`
    - _Requirements: 1.1, 1.9_

  - [ ] 5.6 Update `backend/src/routes/voice.ts` if needed
    - Confirm `POST /extract-events` still just does `res.json(result)` with no reshaping needed - the route itself likely requires no changes since `openAIService.extractEvents()`'s return value already flows through unchanged
    - _Requirements: 1.1_

- [ ] 6. Checkpoint - verify backend extraction changes
  - Run `./node_modules/.bin/tsc --noEmit -p .` in `backend/`.
  - Manually test `extractEvents()` (e.g. via `backend/test-openai.js` or a temporary script) against three transcripts: entirely dated/quotidian content, entirely reflective content ("I've noticed he's gotten so much more verbal lately"), and a mix of both (a dated event plus a trailing general observation) - confirm `proposedClassification` and `transcriptSentences` look correct for each.
  - Confirm a transcript that also produces a `diaryEntry` summary gets a `summarySentences` result from the second classification pass.
  - Ask the user if questions arise before proceeding.

- [ ] 7. Mobile: extend DiaryEntry model
  - [ ] 7.1 Update `mobile/models/diary-entry.ts`
    - Add `HighlightedRange` interface: `{ start: number; end: number }`
    - Add `isDiary: boolean`, `isObservation: boolean`, `highlightedRanges?: HighlightedRange[]` to `DiaryEntry`
    - Add `isDiary?: boolean`, `isObservation?: boolean`, `highlightedRanges?: HighlightedRange[]` to `DiaryEntryInput` (optional, defaulting per design.md when omitted)
    - _Requirements: 5.2_

- [ ] 8. Mobile: SQLite storage changes
  - [ ] 8.1 Add migration columns to `mobile/services/database.ts`
    - Add `ALTER TABLE diary_entries ADD COLUMN is_diary INTEGER NOT NULL DEFAULT 1;`, `ADD COLUMN is_observation INTEGER NOT NULL DEFAULT 0;`, `ADD COLUMN highlighted_ranges TEXT;`, each wrapped in the existing try/catch "already exists" tolerance pattern used for `local_date`/`sequence_order`
    - _Requirements: 5.1, 5.5_

  - [ ] 8.2 Update `createDiaryEntry` in `mobile/services/database.ts`
    - Widen the INSERT statement to include `is_diary`, `is_observation`, `highlighted_ranges` (JSON-stringified), defaulting `isDiary` to `true` and `isObservation` to `false` if not provided on the input object
    - _Requirements: 5.1_

  - [ ] 8.3 Update `rowToDiaryEntry` in `mobile/services/database.ts`
    - Map `row.is_diary`/`row.is_observation` to booleans, defaulting to `true`/`false` respectively when the column is `null`/`undefined` (pre-migration rows)
    - `JSON.parse(row.highlighted_ranges)` when present, else `undefined`
    - _Requirements: 5.4, 5.5_

  - [ ] 8.4 Widen `updateDiaryEntry` in `mobile/services/database.ts`
    - Change signature from `updateDiaryEntry(id: string, content: string)` to `updateDiaryEntry(id: string, updates: { content?: string; isDiary?: boolean; isObservation?: boolean })`
    - WHEN `updates.content` is present, also set `highlighted_ranges = NULL` in the same SQL update (content edits invalidate stored offsets - design.md Property 4)
    - WHEN only `isDiary`/`isObservation` are present (no `content`), update only those columns, leaving `highlighted_ranges` untouched
    - Update all existing call sites of `updateDiaryEntry` (e.g. the Today tab's diary edit modal in `index.tsx`) to pass an object instead of a bare string
    - _Requirements: 1.6, 3.5_

- [ ] 9. Mobile: Supabase storage changes
  - [ ] 9.1 Mirror all of 8.1-8.4 in `mobile/services/database-supabase.ts`
    - Same `createDiaryEntry`/`updateDiaryEntry`/`rowToDiaryEntry` signature changes, implemented as Supabase client calls
    - Use `safeJsonParse` (already used elsewhere in this file) for `highlighted_ranges` rather than a bare `JSON.parse`
    - _Requirements: 5.1, 5.4, 5.5_

  - [ ] 9.2 Add a Supabase migration for the new columns (in the `backend` project/Supabase dashboard)
    - `ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS is_diary INTEGER NOT NULL DEFAULT 1;`, `ADD COLUMN IF NOT EXISTS is_observation INTEGER NOT NULL DEFAULT 0;`, `ADD COLUMN IF NOT EXISTS highlighted_ranges JSONB;`
    - Confirm this is additive-only and does not require any backfill of existing rows (Requirement 5.5)
    - _Requirements: 5.1, 5.5_

- [ ] 10. Checkpoint - verify mobile storage layer
  - Run `./node_modules/.bin/tsc --noEmit` in `mobile/`.
  - Manually verify (via a temporary debug call or the SBDev console) that creating a `DiaryEntry` with `isObservation: true` and `highlightedRanges` set round-trips correctly in whichever mode (SQLite or Supabase) the current build is configured for.
  - Manually verify an existing pre-migration diary entry still loads correctly with `isDiary: true, isObservation: false, highlightedRanges: undefined`.
  - Ask the user if questions arise before proceeding.

- [ ] 11. Mobile: wire extraction response through `voice-service.ts`
  - [ ] 11.1 Widen `EventExtractionResult` in `mobile/services/voice-service.ts`
    - Add `SentenceSpan`, `transcriptSentences?`, `summarySentences?`, `proposedClassification` matching the backend's shape exactly (mirrors the existing pattern where this interface already duplicates the backend's `ExtractedEvent`/`EventExtractionResult` shape client-side)
    - _Requirements: 1.1_

- [ ] 12. Checkpoint - verify voice-service types
  - Run `./node_modules/.bin/tsc --noEmit` in `mobile/`.
  - Ask the user if questions arise before proceeding.

- [ ] 13. Mobile: capture/review UI in `VoiceLogger.tsx`
  - [ ] 13.1 Add classification state
    - Add `isDiary`, `isObservation`, `transcriptSentences`, `summarySentences` state (per design.md Components §4), alongside the existing `includeDiary`/`diaryEntry`/`useSummarizedDiary` state block
    - _Requirements: 1.5_

  - [ ] 13.2 Populate classification state on extraction
    - In every call site that currently does `setDiaryEntry(result.diaryEntry || '')` (the initial processing flow and `handleReExtract`), also set `isDiary`/`isObservation` from `result.proposedClassification` (defaulting to `{isDiary: true, isObservation: false}` if absent) and `transcriptSentences`/`summarySentences` from the result (defaulting to `[]`)
    - _Requirements: 1.1, 1.9_

  - [ ] 13.3 Add the Diary/Observation/Both review control
    - Add a new `classificationOptions` View inside the existing `{includeDiary && (...)}` block, after the existing Verbatim/AI Summary radio row, following the identical `radioOption`/`radioCircle`/`radioLabel` three-way pattern already used there
    - Pre-select the option matching current `isDiary`/`isObservation` state (no parent interaction required); tapping an option updates both flags together (per design.md's `onPress` handler shape)
    - _Requirements: 1.5_

  - [ ] 13.4 Save-time logic in `handleSave()`
    - Select `relevantSpans` based on `useSummarizedDiary` (summary → `summarySentences`, verbatim → `transcriptSentences`), matching whichever text is actually being saved as `diaryContent`
    - Compute `highlightedRanges` by filtering `relevantSpans` to `isObservational: true` entries and mapping to `{start, end}`
    - Pass `isDiary`, `isObservation`, and `highlightedRanges` (only if non-empty) through to `databaseService.createDiaryEntry(...)`
    - _Requirements: 1.7, 3.1, 3.5_

  - [ ] 13.5 Repeat 13.1-13.4 for `mobile/app/voice-recording.tsx`
    - This screen is dead/unreachable code per prior session notes (confirmed in `.kiro/specs/timezone-safe-dates/design.md`) but was kept in sync during the earlier `title` field change for consistency - apply the same minimal update here (or skip with a note if the user prefers not to maintain dead code going forward - confirm with the user at the checkpoint rather than assuming)
    - _Requirements: 1.1, 1.5, 1.7_

- [ ] 14. Checkpoint - verify capture/review UI
  - Run `./node_modules/.bin/tsc --noEmit` in `mobile/`.
  - On-device (SBDev): log a transcript that's entirely dated content, confirm the review screen pre-selects "Diary" with no extra tap needed.
  - Log a transcript that's entirely reflective ("I've noticed he's gotten so much more verbal lately"), confirm the review screen pre-selects "Observation".
  - Log a transcript mixing both (a dated event + a trailing general reflection), confirm the review screen pre-selects "Both".
  - Tap to override a proposed classification before saving; confirm the saved entry reflects the override.
  - Ask the user if questions arise before proceeding.

- [ ] 15. Mobile: shared entry-color helper and highlighted-content renderer
  - [ ] 15.1 Create `mobile/constants/entry-colors.ts`
    - Implement `getEntryColors(entry: { isDiary: boolean; isObservation: boolean })` returning `DIARY_COLORS` (matching the existing `#FFF9E6`/`#795548` values exactly, so Diary-only entries render unchanged), `OBSERVATION_COLORS` (new green palette), or `BOTH_COLORS` (dual accent/badge treatment) per design.md
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ] 15.2 Create a shared highlighted-content renderer
    - Implement `renderHighlightedContent(content: string, ranges: HighlightedRange[] | undefined): ReactNode` (e.g. in a new small `mobile/components/HighlightedText.tsx` or as a helper used by both card sites) that slices `content` into alternating plain/highlighted segments based on `ranges` and renders each as a `Text` child, applying italic + subtle-highlight styling only to the highlighted segments
    - Handle `ranges` being empty/undefined by rendering `content` as plain text unchanged (no highlighting UI appears at all - Requirement 3.3's fallback case)
    - _Requirements: 2.1, 2.2, 3.1, 3.3, 3.4, 3.5_

- [ ] 16. Mobile: apply coloring/highlighting to existing display sites
  - [ ] 16.1 Update `mobile/components/DiaryEntryCard.tsx`
    - Replace the hardcoded `card`/`title` style values with `getEntryColors(entry)`-driven values
    - Render `entry.content` via `renderHighlightedContent` instead of the current plain `<Text numberOfLines={3}>`
    - _Requirements: 2.1, 2.2, 2.3, 3.1_

  - [ ] 16.2 Update the inline entry card markup in `mobile/components/DiaryView.tsx`
    - Apply the same `getEntryColors`/`renderHighlightedContent` treatment to this view's own separate inline card styles (confirmed in design.md to be a second, independent copy of the yellow styling - update both rather than only `DiaryEntryCard`)
    - Confirm this view continues to show every entry regardless of classification (Requirement 2.4) - no filtering logic should be added here
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1_

- [ ] 17. Checkpoint - verify display coloring/highlighting
  - Run `./node_modules/.bin/tsc --noEmit` in `mobile/`.
  - On-device: confirm a Diary-only entry renders pixel-identical to pre-feature behavior (yellow, no highlighting UI).
  - Confirm an Observation-only entry renders green with its observational sentence(s) visually highlighted.
  - Confirm a Both entry renders with a treatment distinct from both pure Diary and pure Observation cards.
  - Confirm the Insights Diary view still lists every entry regardless of classification.
  - Ask the user if questions arise before proceeding.

- [ ] 18. Mobile: content-edit invalidates stale highlights
  - [ ] 18.1 Update the Today tab's diary edit flow in `mobile/app/(tabs)/index.tsx`
    - Confirm the existing inline diary-entry edit modal (`diaryEditModalVisible`) calls the new `updateDiaryEntry(id, { content: newContent })` object form (per task 8.4) so `highlighted_ranges` is cleared automatically as part of that same update - no separate explicit clear call should be needed if task 8.4 is implemented correctly, but verify this call site was updated to the new signature
    - _Requirements: 3.2 (transitively, per design.md Property 4)_

- [ ] 19. Checkpoint - verify content-edit invalidation
  - Run `./node_modules/.bin/tsc --noEmit` in `mobile/`.
  - On-device: edit the content of an Observation entry that has highlighted sentences via the Today tab; confirm highlighting disappears from that entry afterward, and that its Diary/Observation classification is unchanged.
  - Ask the user if questions arise before proceeding.

- [ ] 20. Mobile: `observation-service.ts`
  - [ ] 20.1 Create `mobile/services/observation-service.ts`
    - Implement `getObservationDays(childProfileId, dateRange): Promise<Set<string>>` - fetches diary entries in range (via existing `databaseService.getDiaryEntries` or a date-filtered variant), returns the set of `localDate` keys with at least one `isObservation` entry
    - Implement `getObservationEntries(childProfileId): Promise<DiaryEntry[]>` - all `isObservation` (including Both) entries for the profile, reverse-chronological
    - Implement `getObservationExcerpt(entry: DiaryEntry): { text: string; isVerbatim: boolean }` per design.md: joins highlighted substrings when `highlightedRanges` is present and non-empty, else falls back to the start of `entry.content`; `isVerbatim` reflects whether the entry's saved content is the raw transcript vs. an AI summary
    - _Requirements: 4.2, 4.4, 4.5, 4.6, 4.7_

- [ ] 21. Checkpoint - verify observation-service
  - Run `./node_modules/.bin/tsc --noEmit` in `mobile/`.
  - Manually verify `getObservationDays`/`getObservationEntries`/`getObservationExcerpt` against the entries created during the task 14/17 on-device tests.
  - Ask the user if questions arise before proceeding.

- [ ] 22. Build `ObservationCalendarView` and `ObservationListView`
  - [ ] 22.1 Create `mobile/components/ObservationCalendarView.tsx`
    - Copy the month-grid skeleton from `WeatherView.tsx` (month nav header, day-of-week header row, `currentMonth` state, `useFocusEffect` reload, week-row grid)
    - Replace mood-tint coloring with a simple marked/unmarked treatment per day, driven by `getObservationDays()` for the visible month
    - Wire day-tap to a lightweight detail sheet/modal (following `HeatMapView`'s existing day-tap modal pattern) listing that day's Observation-flagged entries (via `getObservationEntries()` filtered to that day, or a dedicated day-scoped query if simpler)
    - _Requirements: 4.1, 4.2, 4.3_

  - [ ] 22.2 Create `mobile/components/ObservationListView.tsx`
    - Copy the list/grouping skeleton from `DiaryView.tsx` (`useFocusEffect` reload, group-by-date-header rendering)
    - Source entries from `getObservationEntries()` instead of all entries
    - Render each entry's excerpt via `getObservationExcerpt()`, applying quotation styling only when `isVerbatim` is true (Requirement 4.7)
    - _Requirements: 4.4, 4.5, 4.6, 4.7_

- [ ] 23. Checkpoint - verify Observation views standalone
  - Run `./node_modules/.bin/tsc --noEmit` in `mobile/`.
  - Manually render both new components in isolation if feasible (e.g. temporarily mounted on an existing screen) to confirm they load data correctly before wiring into Insights navigation.
  - Ask the user if questions arise before proceeding.

- [ ] 24. Wire Observation views into the Insights tab
  - [ ] 24.1 Add a new `TabType` value (`'observations'`) to `mobile/app/(tabs)/insights.tsx`
    - Add a "🌱 Observations" tab button alongside the existing Weather/Heat Map/Diary/Events/Location/Glossary buttons, following the exact existing `TouchableOpacity`/`tabActive`/`tabText` pattern
    - _Requirements: 4.1_

  - [ ] 24.2 Add a Calendar/List sub-toggle within the Observations tab
    - Add local state (e.g. `observationSubView: 'calendar' | 'list'`) and a nested pill row rendered only when the Observations tab is active, following the identical pattern already used for Location's Calendar/Map toggle and Glossary's category pills
    - Render `ObservationCalendarView` or `ObservationListView` based on that sub-state, passing `activeProfile.id`
    - _Requirements: 4.1_

- [ ] 25. Checkpoint - verify Observations Insights wiring
  - Run `./node_modules/.bin/tsc --noEmit` in `mobile/`.
  - On-device: confirm the Observations pill appears in Insights, the Calendar/List sub-toggle works, tapping a marked calendar day shows the correct entry/entries, and the list shows only Observation/Both entries with correctly-sourced excerpts.
  - Ask the user if questions arise before proceeding.

- [ ] 26. Final checkpoint
  - Run `./node_modules/.bin/tsc --noEmit -p .` in `backend/` and `./node_modules/.bin/tsc --noEmit` in `mobile/` one more time.
  - Walk through every manual scenario listed in design.md's Testing Strategy end-to-end on-device, including: AI-proposed classification for dated-only/reflective-only/mixed transcripts; one-tap override; verbatim vs. AI-summary mode producing correctly-matched highlighting; content-edit invalidating stale highlights; classification-only correction preserving highlights; Both-entry visual distinction; Observation Calendar/List behavior; pre-existing diary entries rendering unaffected.
  - Confirm no unrelated files were modified (`git status --short`) in both `backend/` and the `attune-app` root (mobile) repos before committing - this feature touches both repos independently (per this project's existing dual-repo structure: `backend/` is its own git repo deployed via Render, mobile lives in the `attune-app` root repo).
  - Ask the user if questions arise; do not commit without explicit confirmation, per this project's established git workflow.

## Notes

- No test framework is configured in this project - every task's verification is `tsc --noEmit` (run separately in `backend/` and `mobile/`, since they are separate repos/packages) plus the manual on-device/manual-script scenarios called out at each checkpoint, not an automated test suite. If a framework is introduced later, `splitIntoSentences()` and `deriveClassification()` are both pure functions well-suited to direct unit tests, and the Correctness Properties in design.md translate directly into test cases.
- The backend (`backend/`) and mobile app (`attune-app` root, containing `mobile/`) are separate git repositories - this feature requires commits/deploys to both, independently, consistent with how the earlier `title` field fix this session required a separate backend deploy from the mobile build.
- Tasks are ordered so that each layer (backend splitting → backend classification → backend response shape → mobile storage → mobile capture UI → mobile display → new Insights views) is independently verifiable before the next layer depends on it.
- Per design.md, this feature requires a new mobile production build to reach users once the mobile-side tasks are complete (the backend-side tasks can deploy independently and immediately, same pattern as the earlier `title` field backend change) - confirm with the user whether to bundle this into the next planned production build or ship backend-only first and hold mobile for a later batch, consistent with the "hold for now, batch changes" preference expressed earlier this session.
- Follow this project's existing git conventions: commit only when explicitly asked, stage specific files rather than `git add -A`/`git add .`, and keep this feature's commits separate from unrelated concurrent work.
