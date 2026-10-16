/**
 * A character range within a DiaryEntry's `content` string that the AI
 * identified as a general observation (reflective/trend-based/non-day-
 * specific) rather than a dated event - see .kiro/specs/parent-observations/.
 * Offsets are only ever valid against the exact `content` string they
 * were computed from; editing an entry's content invalidates and clears
 * any stored ranges (see database.ts/database-supabase.ts's updateDiaryEntry).
 */
export interface HighlightedRange {
  start: number;
  end: number;
}

export interface DiaryEntry {
  id: string;
  childProfileId: string;
  date: Date;
  content: string;
  timestamp: Date;
  source: 'voice' | 'manual';
  createdAt: Date;
  /**
   * 'YYYY-MM-DD' calendar day this entry belongs to, frozen at write time
   * using the device's local timezone at that moment. Use this (not
   * `date`/`timestamp`) for any "get diary entries for day D" query - see
   * mobile/utils/local-date.ts and .kiro/specs/timezone-safe-dates/.
   * Optional because rows created before this field existed have it as
   * null until backfilled.
   */
  localDate?: string;
  /**
   * Entry_Classification flags (see .kiro/specs/parent-observations/).
   * Independent flags rather than a single enum so an entry can be
   * both Diary and Observation at once without a combinatorial "both"
   * value, and so a future third classification doesn't require
   * redefining existing stored values. AI-proposed at save time,
   * always correctable by the Parent afterward. Entries created before
   * this feature shipped read as isDiary: true, isObservation: false
   * via defensive defaults in rowToDiaryEntry - no backfill needed.
   */
  isDiary: boolean;
  isObservation: boolean;
  /**
   * Present only if the AI identified one or more observational
   * sentences in whichever content mode (verbatim transcript vs. AI
   * summary) was actually saved. Used to drive highlighting and to
   * source excerpts for the Observation Calendar/List views.
   */
  highlightedRanges?: HighlightedRange[];
  /**
   * True if `content` is an AI-generated paraphrase (VoiceLogger.tsx's
   * "AI Summary" save mode) rather than the Parent's actual spoken/typed
   * words (the default "Verbatim" mode). Needed because `source` only
   * records HOW the entry was captured (voice vs. typed text), not
   * WHETHER the saved text is a direct transcript or a paraphrase of
   * it - without this, there is no way to tell the two apart after the
   * fact. Drives whether Observation excerpts get quotation styling
   * (see observation-service.ts's getObservationExcerpt, Requirement
   * 4.7) - a paraphrase should never be visually presented as the
   * Parent's exact words. Optional/defaults to false (verbatim) for
   * entries created before this field existed, matching the project's
   * default logging mode.
   */
  isSummarized?: boolean;
}

export interface DiaryEntryInput {
  childProfileId: string;
  date: Date;
  content: string;
  timestamp?: Date;
  source: 'voice' | 'manual';
  /** Defaults to true if omitted. */
  isDiary?: boolean;
  /** Defaults to false if omitted. */
  isObservation?: boolean;
  highlightedRanges?: HighlightedRange[];
  /** Defaults to false (verbatim) if omitted. */
  isSummarized?: boolean;
}
