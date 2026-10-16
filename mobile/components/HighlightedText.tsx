import React from 'react';
import { Text, TextProps } from 'react-native';
import { HighlightedRange } from '../models';

interface HighlightedTextProps extends TextProps {
  content: string;
  ranges?: HighlightedRange[];
  /** Style applied only to the highlighted segments. */
  highlightStyle?: TextProps['style'];
}

/**
 * Renders `content` as plain text, except for the substrings covered by
 * `ranges`, which render with `highlightStyle` applied (see
 * OBSERVATION_HIGHLIGHT_STYLE in constants/entry-colors.ts - italic +
 * underline, no background fill, so it stays legible regardless of
 * whatever classification color the surrounding card happens to be, per
 * .kiro/specs/parent-observations/ Requirement 3). This is a
 * display-time annotation only - it never alters, reorders, or removes
 * any of the underlying text.
 *
 * If `ranges` is empty/undefined, renders `content` as plain text
 * unchanged - this is the expected fallback case (Requirement 3.3) when
 * no highlighting data exists or failed validation server-side, and it
 * must look identical to an entry that was never AI-classified at all.
 */
export function HighlightedText({ content, ranges, highlightStyle, style, ...rest }: HighlightedTextProps) {
  if (!ranges || ranges.length === 0) {
    return (
      <Text style={style} {...rest}>
        {content}
      </Text>
    );
  }

  // Sort and clamp defensively - ranges come from stored data that was
  // already validated server-side, but a display component should never
  // crash on a malformed/out-of-order range rather than silently fail.
  const sorted = [...ranges]
    .map((r) => ({
      start: Math.max(0, Math.min(r.start, content.length)),
      end: Math.max(0, Math.min(r.end, content.length)),
    }))
    .filter((r) => r.start < r.end)
    .sort((a, b) => a.start - b.start);

  const segments: React.ReactNode[] = [];
  let cursor = 0;

  sorted.forEach((range, i) => {
    if (range.start > cursor) {
      segments.push(
        <Text key={`plain-${i}`}>{content.slice(cursor, range.start)}</Text>
      );
    }
    if (range.start >= cursor) {
      segments.push(
        <Text key={`highlight-${i}`} style={highlightStyle}>
          {content.slice(range.start, range.end)}
        </Text>
      );
      cursor = range.end;
    }
    // If range.start < cursor, this range overlaps a previous one - skip
    // re-rendering the already-covered portion rather than duplicating text.
  });

  if (cursor < content.length) {
    segments.push(<Text key="plain-end">{content.slice(cursor)}</Text>);
  }

  return (
    <Text style={style} {...rest}>
      {segments}
    </Text>
  );
}
