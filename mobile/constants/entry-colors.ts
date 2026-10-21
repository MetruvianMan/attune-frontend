/**
 * Shared Diary/Observation/Both color scheme for DiaryEntry cards - see
 * .kiro/specs/parent-observations/. Centralized here rather than
 * duplicated across DiaryEntryCard.tsx and DiaryView.tsx's own inline
 * card styles (the two existing diary-entry display sites, which
 * previously each hardcoded their own copy of the yellow treatment).
 */

export interface EntryColorScheme {
  /**
   * Shaded header-strip background - the colored region holding the
   * classification label, timestamp, and edit/delete buttons. This was
   * the card's whole background in the pre-"pale inner box" design;
   * matches the original hardcoded values exactly.
   */
  background: string;
  /** Border color for the card/row. */
  border: string;
  /** Left accent bar color (used by DiaryView's date-grouped rows). */
  accent: string;
  /**
   * Very faint tint of `background` used for the inner content box
   * holding the entry's text - a near-white wash of the same hue
   * rather than pure white, so the content area still reads as
   * "belonging to" its colored header without competing with it for
   * attention the way a fully-saturated background would.
   */
  paleBackground: string;
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
  paleBackground: '#FFFDF6',
  titleColor: '#795548',
  label: '📔 Diary',
};

const OBSERVATION_COLORS: EntryColorScheme = {
  background: '#E8F5E9',
  border: 'rgba(76, 175, 80, 0.3)',
  accent: 'rgba(76, 175, 80, 0.7)',
  paleBackground: '#F5FBF5',
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
  paleBackground: '#F3F9FD',
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
 * Only rendered for a Both entry (isDiary && isObservation) - that's
 * the one case where the underline actually communicates something:
 * which part of a mixed entry is the reflective aside vs. the daily
 * recap. On a Diary-only card it would visually contradict the
 * classification the Parent chose; on a pure Observation card, EVERY
 * sentence is already observational by definition (the box color/label
 * already says so), so underlining specific sentences within it adds
 * no information - it's redundant, not just unnecessary.
 *
 * This suppresses the highlight at DISPLAY time only, without touching
 * the stored data: if the Parent later changes the classification to
 * Both, the original highlighting reappears unchanged, since nothing
 * was deleted, only hidden.
 */
export function getVisibleHighlightedRanges(
  entry: { isDiary: boolean; isObservation: boolean; highlightedRanges?: { start: number; end: number }[] }
): { start: number; end: number }[] | undefined {
  return entry.isDiary && entry.isObservation ? entry.highlightedRanges : undefined;
}

export function getEntryColors(entry: { isDiary: boolean; isObservation: boolean }): EntryColorScheme {
  if (entry.isObservation && entry.isDiary) return BOTH_COLORS;
  if (entry.isObservation) return OBSERVATION_COLORS;
  return DIARY_COLORS;
}

/**
 * Shared small-caps style for a classification label (e.g. "Diary",
 * "Observation", "Diary + Observation") - same visual treatment as the
 * plain "LOGS (N)" section header above it, so the per-entry label and
 * the section header read as one consistent typographic family.
 */
export const CLASSIFICATION_LABEL_STYLE = {
  textTransform: 'uppercase' as const,
  letterSpacing: 0.6,
  fontWeight: '700' as const,
};
