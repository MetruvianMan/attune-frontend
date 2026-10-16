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
 * Returns the excerpt to show for an Observation-flagged entry in the
 * Observation List/Calendar (Requirement 4.5-4.7): the joined
 * highlighted-sentence text when available, else a fallback to the
 * start of the entry's content so the entry is never omitted.
 */
export function getObservationExcerpt(entry: DiaryEntry): ObservationExcerpt {
  const isVerbatim = isEntryVerbatimSourced(entry);

  if (entry.highlightedRanges && entry.highlightedRanges.length > 0) {
    const sorted = [...entry.highlightedRanges].sort((a, b) => a.start - b.start);
    const text = sorted
      .map((r) => entry.content.slice(Math.max(0, r.start), Math.min(entry.content.length, r.end)))
      .join(' … ');
    if (text.trim().length > 0) {
      return { text, isVerbatim };
    }
  }

  // Fallback: start of content (Requirement 4.6).
  const MAX_FALLBACK_LENGTH = 140;
  const text = entry.content.length > MAX_FALLBACK_LENGTH
    ? entry.content.slice(0, MAX_FALLBACK_LENGTH).trimEnd() + '…'
    : entry.content;

  return { text, isVerbatim };
}
