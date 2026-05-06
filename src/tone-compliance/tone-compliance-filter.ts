export interface ToneViolation {
  term: string;
  suggestion: string;
  position: number;
}

export interface ToneValidationResult {
  compliant: boolean;
  violations: ToneViolation[];
}

export interface ToneComplianceFilter {
  validate(text: string): ToneValidationResult;
  reframe(text: string): string;
}

/**
 * Clinical blocklist with neuro-affirming alternatives.
 * Ordered longest-first so multi-word phrases are matched before their sub-phrases.
 */
const CLINICAL_BLOCKLIST: ReadonlyArray<{ term: string; suggestion: string }> = [
  { term: 'disorder symptoms', suggestion: 'characteristics' },
  { term: 'non-compliant', suggestion: 'not yet comfortable with' },
  { term: 'bad behavior', suggestion: 'dysregulation episode' },
  { term: 'problem behavior', suggestion: 'challenging moment' },
  { term: 'acting out', suggestion: 'expressing a need' },
  { term: 'low functioning', suggestion: 'high support needs' },
  { term: 'high functioning', suggestion: 'lower support needs' },
  { term: 'suffers from', suggestion: 'experiences' },
  { term: 'disobedient', suggestion: 'struggling with expectations' },
  { term: 'aggressive', suggestion: 'dysregulated' },
  { term: 'manipulative', suggestion: 'communicating a need' },
  { term: 'tantrum', suggestion: 'meltdown' },
  { term: 'deficit', suggestion: 'difference' },
  { term: 'normal', suggestion: 'neurotypical' },
];

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function createToneComplianceFilter(): ToneComplianceFilter {
  return {
    validate(text: string): ToneValidationResult {
      const violations: ToneViolation[] = [];

      for (const entry of CLINICAL_BLOCKLIST) {
        const regex = new RegExp(escapeRegex(entry.term), 'gi');
        let match: RegExpExecArray | null;
        while ((match = regex.exec(text)) !== null) {
          violations.push({
            term: match[0],
            suggestion: entry.suggestion,
            position: match.index,
          });
        }
      }

      // Sort violations by position for consistent ordering
      violations.sort((a, b) => a.position - b.position);

      return {
        compliant: violations.length === 0,
        violations,
      };
    },

    reframe(text: string): string {
      let result = text;
      // Replace longest phrases first to avoid partial matches
      for (const entry of CLINICAL_BLOCKLIST) {
        const regex = new RegExp(escapeRegex(entry.term), 'gi');
        result = result.replace(regex, entry.suggestion);
      }
      return result;
    },
  };
}
