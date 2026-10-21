/**
 * Manual "[observation]" tag for typed (text-mode) entries - see
 * .kiro/specs/parent-observations/. Lets a Parent declare an entry as
 * an Observation outright, rather than relying solely on the AI's
 * per-sentence trend-marker heuristic (hasExplicitObservationalMarker
 * in the backend's classification-deriver.ts), which can still miss
 * entries that open with an explicit trend claim ("We've noticed
 * lately...") but go on to describe a dated response to it (e.g.
 * calling a doctor, adjusting a dose) - mixed content the heuristic
 * correctly calls "Both" sentence-by-sentence, even when the Parent's
 * intent for the WHOLE entry is "this is an observation."
 *
 * Deliberately text-mode only (not voice) - saying "bracket observation
 * bracket" aloud into dictation is awkward and untested with Whisper's
 * transcription. Only recognized as a LEADING token (not mid-paragraph),
 * case-insensitively, with "[obs]" as a shorthand alias.
 *
 * The tag is stripped from the text BEFORE it's ever sent to the
 * backend/LLM - the backend has no knowledge this tag exists, it never
 * appears in the saved transcript/diary content, and it never gets
 * echoed into an AI-generated summary.
 */
const OBSERVATION_TAG_REGEX = /^\s*\[(observation|obs)\]\s*/i;

export interface ObservationTagResult {
  /** `text` with the leading tag (and any surrounding whitespace) removed, if present. Unchanged if no tag was found. */
  text: string;
  /** Whether a leading "[observation]"/"[obs]" tag was found and stripped. */
  isTagged: boolean;
}

/**
 * Detects and strips a leading "[observation]"/"[obs]" tag from typed
 * text. Always returns a usable `text` (the original, untouched, if no
 * tag is present) so callers can use the result unconditionally rather
 * than branching on `isTagged` themselves.
 */
export function extractObservationTag(text: string): ObservationTagResult {
  const match = OBSERVATION_TAG_REGEX.exec(text);
  if (!match) {
    return { text, isTagged: false };
  }
  return { text: text.slice(match[0].length), isTagged: true };
}
