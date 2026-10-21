import { databaseService } from './database';
import { DiaryEntry } from '../models';

/**
 * Centralizes Observation-related read logic (see
 * .kiro/specs/parent-observations/) - the single source of truth for
 * "which days have an observation" and "what to show as an excerpt,"
 * rather than duplicating these computations across
 * ObservationCalendarView and ObservationListView, mirroring how
 * location-service.ts centralizes day-resolution for the Location
 * feature instead of letting multiple views each reimplement the same
 * heuristic.
 */

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function entryDateKey(entry: DiaryEntry): string {
  return entry.localDate ?? toDateKey(entry.date);
}

/**
 * Returns the set of 'YYYY-MM-DD' date keys within `dateRange` that have
 * at least one Observation-flagged (including Both) entry, for the
 * Observation Calendar (Requirement 4.1-4.3). `dateRange` bounds are
 * inclusive 'YYYY-MM-DD' strings, compared lexicographically - valid
 * since that format sorts the same as calendar order.
 */
export async function getObservationDays(
  childProfileId: string,
  dateRange: { start: string; end: string },
): Promise<Set<string>> {
  const allEntries = await databaseService.getDiaryEntries(childProfileId);
  const days = new Set<string>();

  for (const entry of allEntries) {
    if (!entry.isObservation) continue;
    const dateKey = entryDateKey(entry);
    if (dateKey >= dateRange.start && dateKey <= dateRange.end) {
      days.add(dateKey);
    }
  }

  return days;
}

/**
 * Returns every Observation-flagged (including Both) entry for the
 * profile, reverse-chronological, for the Observation List (Requirement
 * 4.4). Does not filter out Diary-only entries' co-flagged content -
 * Both entries appear here same as Observation-only, per design.
 */
export async function getObservationEntries(childProfileId: string): Promise<DiaryEntry[]> {
  const allEntries = await databaseService.getDiaryEntries(childProfileId);
  return allEntries
    .filter((entry) => entry.isObservation)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

/**
 * Returns every Observation-flagged entry for a single calendar day, for
 * the Observation Calendar's day-tap detail (Requirement 4.3).
 */
export async function getObservationEntriesForDay(
  childProfileId: string,
  dateKey: string,
): Promise<DiaryEntry[]> {
  const allEntries = await databaseService.getDiaryEntries(childProfileId);
  return allEntries
    .filter((entry) => entry.isObservation && entryDateKey(entry) === dateKey)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

export interface ObservationExcerpt {
  text: string;
  /**
   * True if `text` is a direct quote from the Parent's own words
   * (a Verbatim entry's highlighted sentence, or - lacking highlights -
   * the start of a Verbatim entry's content). False for anything sourced
   * from an AI-summarized entry, so the UI can avoid quotation styling
   * that would misrepresent a paraphrase as the Parent's exact words
   * (Requirement 4.7).
   */
  isVerbatim: boolean;
}

/** `entry.isSummarized` (see mobile/models/diary-entry.ts) records
 * whether the saved content is an AI paraphrase or the Parent's actual
 * words - verbatim is the inverse. Defaults to false (verbatim) for
 * entries created before this field existed, matching the project's
 * default logging mode. */
function isEntryVerbatimSourced(entry: DiaryEntry): boolean {
  return !entry.isSummarized;
}

/**
 * Merges sorted ranges that are effectively adjacent - i.e. the text
 * between one range's end and the next range's start is empty or
 * whitespace-only (e.g. two consecutive highlighted sentences with
 * nothing real skipped between them). Without this, a pure Observation
 * entry (where nearly every sentence is individually flagged
 * isObservational) would get a "…" inserted between every single
 * sentence when the excerpt is built, even though no actual content was
 * skipped - garbling text that reads perfectly fine, unellipsized, on
 * the Today tab's full-content view.
 */
function mergeAdjacentRanges(
  entry: DiaryEntry,
  sorted: { start: number; end: number }[],
): { start: number; end: number }[] {
  const merged: { start: number; end: number }[] = [];
  for (const range of sorted) {
    const last = merged[merged.length - 1];
    if (last) {
      const gapText = entry.content.slice(last.end, range.start);
      if (gapText.trim().length === 0) {
        last.end = Math.max(last.end, range.end);
        continue;
      }
    }
    merged.push({ ...range });
  }
  return merged;
}

/**
 * Truncates `text` to at most `maxLength` characters, backing up to the
 * nearest preceding whitespace so the cut lands between words rather
 * than through the middle of one. Falls back to a hard cut at
 * `maxLength` only if there's no whitespace at all within the slice
 * (e.g. one extremely long unbroken token) - still bounded, just not
 * word-clean in that edge case.
 */
function truncateAtWordBoundary(text: string, maxLength: number): string {
  const slice = text.slice(0, maxLength);
  const lastSpace = slice.lastIndexOf(' ');
  // Require the boundary to leave a reasonable chunk of text (avoids an
  // unhelpfully tiny excerpt if whitespace happens to fall very early in
  // the slice) - 20 is a small, generous floor, not a precise tuning.
  if (lastSpace > 20) {
    return slice.slice(0, lastSpace).trimEnd();
  }
  return slice.trimEnd();
}

/**
 * Returns the excerpt to show for an Observation-flagged entry in the
 * Observation List/Calendar (Requirement 4.5-4.7): the joined
 * highlighted-sentence text when available, else a fallback to the
 * start of the entry's content so the entry is never omitted.
 *
 * Exception: a PURE Observation entry (isObservation && !isDiary) always
 * gets its full, untruncated content back, bypassing highlightedRanges
 * and the length-based fallback entirely. Excerpting exists to hide the
 * ordinary-diary portion of a "Both" entry that this view isn't meant to
 * show - a pure Observation entry has no such portion to hide, since the
 * entire entry is observational by definition. Truncating it anyway
 * would only ever cut off real content for no reason (this is also what
 * caused entries that lost their highlightedRanges after a content edit
 * to show a jarring mid-excerpt cutoff - this bypass sidesteps that for
 * this subset of entries too, since there's nothing left to excerpt
 * around).
 */
export function getObservationExcerpt(entry: DiaryEntry): ObservationExcerpt {
  const isVerbatim = isEntryVerbatimSourced(entry);

  if (entry.isObservation && !entry.isDiary) {
    return { text: entry.content, isVerbatim };
  }

  if (entry.highlightedRanges && entry.highlightedRanges.length > 0) {
    const sorted = [...entry.highlightedRanges].sort((a, b) => a.start - b.start);
    const merged = mergeAdjacentRanges(entry, sorted);
    // "…" is only inserted between genuinely separate (non-adjacent)
    // blocks now - a pure Observation entry whose ranges merge into one
    // contiguous block renders as a single clean slice, no ellipsis at all.
    const text = merged
      .map((r) => entry.content.slice(Math.max(0, r.start), Math.min(entry.content.length, r.end)))
      .join(' … ');
    if (text.trim().length > 0) {
      return { text, isVerbatim };
    }
  }

  // Fallback: start of content (Requirement 4.6). Cuts at the last whole
  // WORD boundary at or before MAX_FALLBACK_LENGTH rather than slicing
  // at a raw character count, which would otherwise periodically land
  // mid-word (e.g. "...Specifi…" instead of "...Specifically…") whenever
  // a word happens to straddle that exact character offset.
  const MAX_FALLBACK_LENGTH = 140;
  const text = entry.content.length > MAX_FALLBACK_LENGTH
    ? truncateAtWordBoundary(entry.content, MAX_FALLBACK_LENGTH) + '…'
    : entry.content;

  return { text, isVerbatim };
}
