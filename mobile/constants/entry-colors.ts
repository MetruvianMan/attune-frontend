/**
 * Shared Diary/Observation/Both color scheme for DiaryEntry cards - see
 * .kiro/specs/parent-observations/. Centralized here rather than
 * duplicated across DiaryEntryCard.tsx and DiaryView.tsx's own inline
 * card styles (the two existing diary-entry display sites, which
 * previously each hardcoded their own copy of the yellow treatment).
 */

export interface EntryColorScheme {
  /** Card/row background color. */
  background: string;
  /** Border color for the card/row. */
  border: string;
  /** Left accent bar color (used by DiaryView's date-grouped rows). */
  accent: string;
  /** Title/heading text color. */
  titleColor: string;
  /** Label shown in the card header, e.g. "📔 Diary Entry". */
  label: string;
}

// Matches the existing hardcoded values exactly (DiaryEntryCard.tsx's
// `card`/`title` styles, DiaryView.tsx's `entryCard`/`dateHeader` styles)
// so a Diary-only entry renders pixel-identical to pre-feature behavior.
const DIARY_COLORS: EntryColorScheme = {
  background: '#FFF9E6',
  border: 'rgba(255, 193, 7, 0.2)',
  accent: 'rgba(255, 193, 7, 0.6)',
  titleColor: '#795548',
  label: '📔 Diary',
};

const OBSERVATION_COLORS: EntryColorScheme = {
  background: '#E8F5E9',
  border: 'rgba(76, 175, 80, 0.3)',
  accent: 'rgba(76, 175, 80, 0.7)',
  titleColor: '#2E7D32',
  label: '🌱 Observation',
};

// "Both" gets its own distinct third color (blue) rather than a blend of
// yellow/green, so it reads as unambiguously its own category rather
// than looking like a slightly-off Diary or Observation card - see
// parent-observations design.md Requirement 2.3.
const BOTH_COLORS: EntryColorScheme = {
  background: '#E3F2FD',
  border: 'rgba(74, 144, 226, 0.35)',
  accent: 'rgba(74, 144, 226, 0.7)',
  titleColor: '#1565C0',
  label: '📔🌱 Diary + Observation',
};

/**
 * Shared style for a Highlighted Sentence's text (see HighlightedText.tsx).
 * Underline + italic, no background fill - chosen over a background tint
 * because a highlight fill in the same green hue as OBSERVATION_COLORS'
 * card background can lose contrast when nested inside an
 * Observation-colored card (or any colored card generally - Both is
 * blue, Diary is yellow). An underline reads clearly regardless of what
 * color the surrounding card happens to be, and doesn't compete with the
 * classification color system for the same visual channel.
 */
export const OBSERVATION_HIGHLIGHT_STYLE = {
  fontStyle: 'italic' as const,
  textDecorationLine: 'underline' as const,
  textDecorationColor: 'rgba(76, 175, 80, 0.8)',
  textDecorationStyle: 'solid' as const,
};

/**
 * The highlighted-sentence offsets to actually RENDER for an entry, as
 * opposed to what's stored on it. `highlightedRanges` is computed once
 * at save time from the AI's sentence-level judgment and is intentionally
 * NOT recomputed when the Parent later corrects Entry_Classification
 * (see .kiro/specs/parent-observations/ Requirement 3.4 - highlighting
 * is a content annotation, independent of classification, and is
 * preserved as-is through a classification correction).
 *
 * However, SHOWING an underlined "this reads as observational" sentence
 * on a card the Parent has explicitly marked Diary-only reads as a bug,
 * not a feature - it visually contradicts the classification the Parent
 * just chose. So this suppresses the highlight at DISPLAY time whenever
 * isObservation is false, without touching the stored data: if the
 * Parent later flips the entry back to Observation or Both, the
 * original highlighting reappears unchanged, since nothing was deleted,
 * only hidden.
 */
export function getVisibleHighlightedRanges(
  entry: { isObservation: boolean; highlightedRanges?: { start: number; end: number }[] }
): { start: number; end: number }[] | undefined {
  return entry.isObservation ? entry.highlightedRanges : undefined;
}

export function getEntryColors(entry: { isDiary: boolean; isObservation: boolean }): EntryColorScheme {
  if (entry.isObservation && entry.isDiary) return BOTH_COLORS;
  if (entry.isObservation) return OBSERVATION_COLORS;
  return DIARY_COLORS;
}

/**
 * Aggregate color/label for a SECTION containing multiple entries (e.g.
 * the Today tab's "DIARY" card, which lists every diary entry for the
 * day in one outer wrapper) - distinct from getEntryColors, which
 * colors a single entry. Reflects the mix across all entries: if every
 * entry in the list is the same single classification, use that
 * classification's own color/label (so a day with only Diary entries
 * stays plain yellow, matching pre-feature behavior exactly). If the
 * day's entries collectively span more than one classification (e.g.
 * one Diary-only entry and one Observation-only entry, OR any entry
 * that's itself Both), the section is labeled/colored as "Diary +
 * Observation" using BOTH_COLORS, signaling "this day's diary section
 * contains a mix" without implying every entry in it is individually
 * both.
 */
export function getSectionColors(entries: { isDiary: boolean; isObservation: boolean }[]): EntryColorScheme {
  if (entries.length === 0) return DIARY_COLORS;

  const hasDiary = entries.some((e) => e.isDiary);
  const hasObservation = entries.some((e) => e.isObservation);

  if (hasDiary && hasObservation) return BOTH_COLORS;
  if (hasObservation) return OBSERVATION_COLORS;
  return DIARY_COLORS;
}
